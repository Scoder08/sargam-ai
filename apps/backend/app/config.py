"""
Configuration Management

Environment-based configuration for the Flask application.
"""

import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""

    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    DEBUG = False
    TESTING = False

    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", "sqlite:///sargam.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False

    # JWT
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ["headers"]

    # CORS
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

    # SocketIO
    SOCKETIO_MESSAGE_QUEUE = os.getenv("REDIS_URL", None)  # None = in-memory for dev

    # App Settings
    APP_NAME = "Sargam AI"
    API_VERSION = "v1"

    # Scoring Settings (Core IP)
    TIMING_TOLERANCE_MS = 150  # ±150ms for correct timing
    TIMING_EARLY_THRESHOLD_MS = -150
    TIMING_LATE_THRESHOLD_MS = 150

    # Admin phone numbers (auto-promoted to admin on login)
    ADMIN_PHONES = os.getenv("ADMIN_PHONES", "+918279756297").split(",")

    # External APIs
    AUDD_API_KEY = os.getenv("AUDD_API_KEY", "")  # AudD music recognition API
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")  # Claude AI for intelligent song recognition
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")  # OpenAI API for song recognition (alternative to Claude)


class DevelopmentConfig(Config):
    """Development configuration."""

    DEBUG = True
    SQLALCHEMY_ECHO = True


class TestingConfig(Config):
    """Testing configuration."""

    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


class ProductionConfig(Config):
    """Production configuration."""

    DEBUG = False

    @property
    def SQLALCHEMY_DATABASE_URI(self):
        # Ensure production has a real database URL
        url = os.getenv("DATABASE_URL")
        if not url:
            raise ValueError("DATABASE_URL must be set in production")
        # Handle Heroku-style postgres:// URLs
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url


# Configuration mapping
config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}


def get_config():
    """Get configuration based on environment."""
    env = os.getenv("FLASK_ENV", "development")
    return config_by_name.get(env, DevelopmentConfig)
