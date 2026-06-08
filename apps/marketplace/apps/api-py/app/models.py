"""SQLAlchemy models — mirror Prisma schema in apps/marketplace/packages/db.

Both APIs share one database. Column names exactly match Prisma's quoted
camelCase so the same rows are visible from either side.
"""
from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as PgEnum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Role(StrEnum):
    CUSTOMER = "CUSTOMER"
    ARTISAN = "ARTISAN"
    ADMIN = "ADMIN"


class UserStatus(StrEnum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    BANNED = "BANNED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"


class BookingStatus(StrEnum):
    REQUESTED = "REQUESTED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EN_ROUTE = "EN_ROUTE"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class DocKind(StrEnum):
    ID_FRONT = "ID_FRONT"
    ID_BACK = "ID_BACK"
    SELFIE = "SELFIE"
    TRADE_LICENSE = "TRADE_LICENSE"


class DocStatus(StrEnum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class MsgKind(StrEnum):
    TEXT = "TEXT"
    IMAGE = "IMAGE"
    LOCATION = "LOCATION"
    SYSTEM = "SYSTEM"


class PaymentStatus(StrEnum):
    HELD = "HELD"
    CAPTURED = "CAPTURED"
    REFUNDED = "REFUNDED"
    FAILED = "FAILED"
    PAID_OUT = "PAID_OUT"


class ReportStatus(StrEnum):
    OPEN = "OPEN"
    REVIEWING = "REVIEWING"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


def _ts() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now())


class User(Base):
    __tablename__ = "User"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    phone: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    phoneVerifiedAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    email: Mapped[str | None] = mapped_column(String, unique=True)
    passwordHash: Mapped[str | None] = mapped_column(String)
    role: Mapped[Role] = mapped_column(PgEnum(Role, name="Role"), default=Role.CUSTOMER)
    fullName: Mapped[str | None] = mapped_column(String)
    avatarUrl: Mapped[str | None] = mapped_column(String)
    status: Mapped[UserStatus] = mapped_column(
        PgEnum(UserStatus, name="UserStatus"), default=UserStatus.ACTIVE
    )
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    customer: Mapped["CustomerProfile | None"] = relationship(back_populates="user", uselist=False)
    artisan: Mapped["ArtisanProfile | None"] = relationship(back_populates="user", uselist=False)

    __table_args__ = (Index("user_role_status_idx", "role", "status"),)


class CustomerProfile(Base):
    __tablename__ = "CustomerProfile"

    userId: Mapped[str] = mapped_column(ForeignKey("User.id", ondelete="CASCADE"), primary_key=True)
    homeLat: Mapped[float | None] = mapped_column(Float)
    homeLng: Mapped[float | None] = mapped_column(Float)
    homeAddr: Mapped[str | None] = mapped_column(String)

    user: Mapped[User] = relationship(back_populates="customer")


class ArtisanProfile(Base):
    __tablename__ = "ArtisanProfile"

    userId: Mapped[str] = mapped_column(ForeignKey("User.id", ondelete="CASCADE"), primary_key=True)
    bio: Mapped[str | None] = mapped_column(Text)
    yearsExperience: Mapped[int] = mapped_column(Integer, default=0)
    baseRateCents: Mapped[int] = mapped_column(Integer, default=0)
    hourlyRateCents: Mapped[int] = mapped_column(Integer, default=0)
    available: Mapped[bool] = mapped_column(Boolean, default=False)
    currentLat: Mapped[float | None] = mapped_column(Float)
    currentLng: Mapped[float | None] = mapped_column(Float)
    avgRating: Mapped[float] = mapped_column(Float, default=0)
    ratingCount: Mapped[int] = mapped_column(Integer, default=0)
    completedJobs: Mapped[int] = mapped_column(Integer, default=0)
    verifiedAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    geo: Mapped[Any | None] = mapped_column(Geography(geometry_type="POINT", srid=4326))

    user: Mapped[User] = relationship(back_populates="artisan")

    __table_args__ = (Index("artisan_avail_rating_idx", "available", "avgRating"),)


class ServiceCategory(Base):
    __tablename__ = "ServiceCategory"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    iconKey: Mapped[str | None] = mapped_column(String)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class ArtisanCategory(Base):
    __tablename__ = "ArtisanCategory"

    artisanId: Mapped[str] = mapped_column(
        ForeignKey("ArtisanProfile.userId", ondelete="CASCADE"), primary_key=True
    )
    categoryId: Mapped[str] = mapped_column(
        ForeignKey("ServiceCategory.id", ondelete="CASCADE"), primary_key=True
    )


class VerificationDoc(Base):
    __tablename__ = "VerificationDoc"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    artisanId: Mapped[str] = mapped_column(
        ForeignKey("ArtisanProfile.userId", ondelete="CASCADE")
    )
    kind: Mapped[DocKind] = mapped_column(PgEnum(DocKind, name="DocKind"))
    s3Key: Mapped[str] = mapped_column(String)
    status: Mapped[DocStatus] = mapped_column(
        PgEnum(DocStatus, name="DocStatus"), default=DocStatus.PENDING
    )
    reviewerId: Mapped[str | None] = mapped_column(String)
    reviewedAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(String)
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Booking(Base):
    __tablename__ = "Booking"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    customerId: Mapped[str] = mapped_column(ForeignKey("User.id"))
    artisanId: Mapped[str] = mapped_column(ForeignKey("ArtisanProfile.userId"))
    categoryId: Mapped[str] = mapped_column(ForeignKey("ServiceCategory.id"))
    status: Mapped[BookingStatus] = mapped_column(
        PgEnum(BookingStatus, name="BookingStatus"), default=BookingStatus.REQUESTED
    )
    scheduledFor: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    description: Mapped[str] = mapped_column(Text)
    addressText: Mapped[str] = mapped_column(String)
    addressLat: Mapped[float] = mapped_column(Float)
    addressLng: Mapped[float] = mapped_column(Float)
    priceCents: Mapped[int | None] = mapped_column(Integer)
    isEmergency: Mapped[bool] = mapped_column(Boolean, default=False)
    acceptedAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    startedAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completedAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelledAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelReason: Mapped[str | None] = mapped_column(String)
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index("booking_artisan_status_idx", "artisanId", "status"),
        Index("booking_customer_status_idx", "customerId", "status"),
    )


class Review(Base):
    __tablename__ = "Review"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    bookingId: Mapped[str] = mapped_column(ForeignKey("Booking.id", ondelete="CASCADE"), unique=True)
    reviewerId: Mapped[str] = mapped_column(ForeignKey("User.id"))
    revieweeId: Mapped[str] = mapped_column(ForeignKey("User.id"))
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str | None] = mapped_column(Text)
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ChatThread(Base):
    __tablename__ = "ChatThread"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    bookingId: Mapped[str] = mapped_column(ForeignKey("Booking.id", ondelete="CASCADE"), unique=True)
    lastMsgAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ChatMessage(Base):
    __tablename__ = "ChatMessage"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    threadId: Mapped[str] = mapped_column(ForeignKey("ChatThread.id", ondelete="CASCADE"))
    senderId: Mapped[str] = mapped_column(ForeignKey("User.id"))
    body: Mapped[str] = mapped_column(Text)
    kind: Mapped[MsgKind] = mapped_column(PgEnum(MsgKind, name="MsgKind"), default=MsgKind.TEXT)
    s3Key: Mapped[str | None] = mapped_column(String)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    readAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("chat_thread_created_idx", "threadId", "createdAt"),)


class Favorite(Base):
    __tablename__ = "Favorite"

    userId: Mapped[str] = mapped_column(ForeignKey("User.id", ondelete="CASCADE"), primary_key=True)
    artisanId: Mapped[str] = mapped_column(
        ForeignKey("ArtisanProfile.userId", ondelete="CASCADE"), primary_key=True
    )
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Report(Base):
    __tablename__ = "Report"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    reporterId: Mapped[str] = mapped_column(ForeignKey("User.id"))
    reportedId: Mapped[str] = mapped_column(ForeignKey("User.id"))
    bookingId: Mapped[str | None] = mapped_column(String)
    reason: Mapped[str] = mapped_column(String)
    details: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ReportStatus] = mapped_column(
        PgEnum(ReportStatus, name="ReportStatus"), default=ReportStatus.OPEN
    )
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PushToken(Base):
    __tablename__ = "PushToken"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    userId: Mapped[str] = mapped_column(ForeignKey("User.id", ondelete="CASCADE"))
    token: Mapped[str] = mapped_column(String, unique=True)
    platform: Mapped[str] = mapped_column(String)
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "AuditLog"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    actorId: Mapped[str | None] = mapped_column(String)
    action: Mapped[str] = mapped_column(String)
    entity: Mapped[str] = mapped_column(String)
    entityId: Mapped[str] = mapped_column(String)
    meta: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RefreshToken(Base):
    __tablename__ = "RefreshToken"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    userId: Mapped[str] = mapped_column(ForeignKey("User.id", ondelete="CASCADE"))
    tokenHash: Mapped[str] = mapped_column(String, unique=True)
    family: Mapped[str] = mapped_column(String)
    revokedAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expiresAt: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
