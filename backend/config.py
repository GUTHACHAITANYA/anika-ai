import os
from datetime import timedelta

class Config:
    """Base configurations for Anika-AI application."""
    SECRET_KEY = os.environ.get("SECRET_KEY", "super-secret-key-anika-ai-secure-12345")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jwt-super-secret-key-67890")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "uploads")
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///anika_dev.db")

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///anika_prod.db")

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False

config_by_name = {
    "dev": DevelopmentConfig,
    "prod": ProductionConfig,
    "test": TestingConfig,
    "default": DevelopmentConfig
}
