"""S3 presigned PUT URL generator (lightweight, no boto3 dependency)."""
from __future__ import annotations

import datetime as dt
import hashlib
import hmac
from urllib.parse import quote, urlencode

from app.config import settings


def _hmac(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode(), hashlib.sha256).digest()


def public_url(key: str) -> str:
    if settings.s3_endpoint:
        return f"{settings.s3_endpoint}/{settings.s3_bucket}/{key}"
    return f"https://{settings.s3_bucket}.s3.{settings.s3_region}.amazonaws.com/{key}"


def presign_put(key: str, content_type: str, expires_seconds: int = 600) -> dict[str, str]:
    """Returns a presigned PUT URL valid for `expires_seconds`."""
    if settings.s3_fake:
        return {"url": public_url(key), "key": key}

    assert settings.s3_access_key and settings.s3_secret_key
    region = settings.s3_region
    host = (
        settings.s3_endpoint.removeprefix("https://").removeprefix("http://")
        if settings.s3_endpoint
        else f"{settings.s3_bucket}.s3.{region}.amazonaws.com"
    )
    now = dt.datetime.now(dt.UTC)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = now.strftime("%Y%m%d")
    credential = f"{settings.s3_access_key}/{date_stamp}/{region}/s3/aws4_request"

    params = {
        "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
        "X-Amz-Credential": credential,
        "X-Amz-Date": amz_date,
        "X-Amz-Expires": str(expires_seconds),
        "X-Amz-SignedHeaders": "host",
        "Content-Type": content_type,
    }
    canonical_query = urlencode(sorted(params.items()), quote_via=quote)
    canonical_request = "\n".join(
        [
            "PUT",
            f"/{quote(key)}",
            canonical_query,
            f"host:{host}\n",
            "host",
            "UNSIGNED-PAYLOAD",
        ]
    )
    string_to_sign = "\n".join(
        [
            "AWS4-HMAC-SHA256",
            amz_date,
            f"{date_stamp}/{region}/s3/aws4_request",
            hashlib.sha256(canonical_request.encode()).hexdigest(),
        ]
    )
    k_date = _hmac(f"AWS4{settings.s3_secret_key}".encode(), date_stamp)
    k_region = _hmac(k_date, region)
    k_service = _hmac(k_region, "s3")
    k_signing = _hmac(k_service, "aws4_request")
    signature = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()

    params["X-Amz-Signature"] = signature
    url = f"https://{host}/{quote(key)}?{urlencode(params, quote_via=quote)}"
    return {"url": url, "key": key}
