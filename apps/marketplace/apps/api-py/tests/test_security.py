"""JWT round-trip."""
from __future__ import annotations

import pytest

from app.errors import AppError
from app.security import sign_access, sign_refresh, verify_access, verify_refresh


def test_access_token_round_trip():
    token = sign_access(sub="u_1", role="CUSTOMER")
    claims = verify_access(token)
    assert claims["sub"] == "u_1"
    assert claims["role"] == "CUSTOMER"


def test_refresh_token_round_trip():
    token = sign_refresh(sub="u_1", family="fam_a")
    claims = verify_refresh(token)
    assert claims["sub"] == "u_1"
    assert claims["family"] == "fam_a"


def test_tampered_token_rejected():
    token = sign_access(sub="u_1", role="CUSTOMER") + "tamper"
    with pytest.raises(AppError):
        verify_access(token)
