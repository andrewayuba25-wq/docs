"""Booking state machine: pure-logic checks (no DB)."""
from __future__ import annotations

from app.models import BookingStatus
from app.services.bookings import ALLOWED


def test_request_can_be_accepted_rejected_or_cancelled():
    assert ALLOWED[BookingStatus.REQUESTED] == {
        BookingStatus.ACCEPTED,
        BookingStatus.REJECTED,
        BookingStatus.CANCELLED,
    }


def test_in_progress_terminates_to_completed_or_cancelled():
    assert ALLOWED[BookingStatus.IN_PROGRESS] == {
        BookingStatus.COMPLETED,
        BookingStatus.CANCELLED,
    }


def test_terminal_states_cannot_transition():
    for terminal in (BookingStatus.COMPLETED, BookingStatus.REJECTED, BookingStatus.CANCELLED):
        assert ALLOWED[terminal] == set()
