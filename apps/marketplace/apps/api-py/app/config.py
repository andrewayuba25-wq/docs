"""Runtime configuration. Validated at import time so deploy errors fail loud."""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = Field(default="development")
    api_port: int = 4001
    api_base_url: str = "http://localhost:4001"

    database_url: str
    database_url_sync: str

    jwt_access_secret: str = Field(min_length=16)
    jwt_refresh_secret: str = Field(min_length=16)
    jwt_access_ttl_min: int = 15
    jwt_refresh_ttl_days: int = 30

    twilio_fake: bool = True
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_verify_sid: str | None = None

    s3_fake: bool = True
    s3_endpoint: str | None = None
    s3_region: str = "us-east-1"
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_bucket: str = "artisan-uploads"

    cors_origins: str = "*"
    log_level: str = "INFO"

    @property
    def cors_origin_list(self) -> list[str] | str:
        if self.cors_origins.strip() == "*":
            return "*"
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_dev(self) -> bool:
        return self.environment == "development"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
