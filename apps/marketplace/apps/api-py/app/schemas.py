"""Pydantic request / response models — parity with @artisan/shared zod schemas."""
from __future__ import annotations

import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

PHONE_RE = re.compile(r"^\+\d{6,15}$")


class Base(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ---------- Auth ----------
class OtpRequest(Base):
    phone: str

    @field_validator("phone")
    @classmethod
    def _validate(cls, v: str) -> str:
        if not PHONE_RE.match(v):
            raise ValueError("Phone must be E.164 format, e.g. +2348012345678")
        return v


class OtpVerify(Base):
    phone: str
    code: str = Field(min_length=6, max_length=6)


class RefreshTokenReq(Base):
    refreshToken: str


class TokensResp(Base):
    accessToken: str
    refreshToken: str


class UserResp(Base):
    id: str
    phone: str
    role: Literal["CUSTOMER", "ARTISAN", "ADMIN"]
    fullName: str | None = None
    avatarUrl: str | None = None


class VerifyOtpResp(TokensResp):
    user: UserResp
    isNew: bool


# ---------- Profile ----------
class SetRoleReq(Base):
    role: Literal["CUSTOMER", "ARTISAN"]


class UpdateMeReq(Base):
    fullName: str | None = Field(default=None, max_length=80)
    avatarUrl: str | None = None
    email: str | None = None


class ArtisanOnboardingReq(Base):
    bio: str | None = Field(default=None, max_length=500)
    yearsExperience: int = Field(ge=0, le=70)
    baseRateCents: int = Field(ge=0)
    hourlyRateCents: int = Field(ge=0)
    categoryIds: list[str] = Field(min_length=1, max_length=5)


class AvailabilityReq(Base):
    available: bool
    lat: float | None = None
    lng: float | None = None


# ---------- Discovery ----------
class CategoryResp(Base):
    id: str
    slug: str
    name: str
    iconKey: str | None = None
    active: bool


class ArtisanSearchResp(Base):
    id: str
    fullName: str | None
    avatarUrl: str | None
    bio: str | None
    avgRating: float
    ratingCount: int
    completedJobs: int
    baseRateCents: int
    hourlyRateCents: int
    available: bool
    verified: bool
    distanceKm: float
    currentLat: float | None
    currentLng: float | None
    categories: list[CategoryResp] = Field(default_factory=list)


class ArtisanListResp(Base):
    results: list[ArtisanSearchResp]


# ---------- Booking ----------
class CreateBookingReq(Base):
    artisanId: str
    categoryId: str
    description: str = Field(min_length=5, max_length=2000)
    addressText: str = Field(min_length=3, max_length=300)
    addressLat: float
    addressLng: float
    scheduledFor: datetime | None = None
    isEmergency: bool = False


class RejectReq(Base):
    reason: str = Field(min_length=1, max_length=300)


class CancelReq(Base):
    reason: str = Field(min_length=1, max_length=300)


class ReviewReq(Base):
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class BookingResp(Base):
    id: str
    status: str
    description: str
    addressText: str
    addressLat: float
    addressLng: float
    priceCents: int | None
    isEmergency: bool
    customerId: str
    artisanId: str
    categoryId: str
    createdAt: datetime


# ---------- Chat ----------
class SendMessageReq(Base):
    body: str = Field(min_length=1, max_length=2000)
    kind: Literal["TEXT", "IMAGE", "LOCATION"] = "TEXT"
    s3Key: str | None = None
    lat: float | None = None
    lng: float | None = None


class MessageResp(Base):
    id: str
    threadId: str
    senderId: str
    body: str
    kind: str
    createdAt: datetime


# ---------- Push ----------
class RegisterPushTokenReq(Base):
    token: str = Field(min_length=10)
    platform: Literal["ios", "android", "web"]
