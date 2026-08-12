import os
from pydantic_settings import BaseSettings
from typing import List


BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Magnet"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Firebase
    FIREBASE_CREDENTIALS_PATH: str = "./firebase-service-account.json"

    # SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    EMAIL_FROM: str = "noreply@magnet.app"

    # Frontend URL
    FRONTEND_URL: str = "http://localhost:5173"

    # Uploads
    MAX_UPLOAD_MB: int = 50

    @property
    def ALLOWED_ORIGINS_LIST(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True

    def model_post_init(self, __context):
        if self.DATABASE_URL.startswith("sqlite"):
            prefix = "sqlite+aiosqlite:///"
            raw_path = self.DATABASE_URL[len(prefix):]
            if not os.path.isabs(raw_path):
                abs_path = os.path.normpath(os.path.join(BACKEND_DIR, raw_path))
                object.__setattr__(self, "DATABASE_URL", f"{prefix}{abs_path}")
                os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        elif self.DATABASE_URL.startswith(("postgres://", "postgresql://")):
            object.__setattr__(
                self,
                "DATABASE_URL",
                "postgresql+asyncpg://" + self.DATABASE_URL.split("://", 1)[1],
            )


settings = Settings()
