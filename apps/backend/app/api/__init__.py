"""
API Blueprints

Export all Flask blueprints for registration.
"""

from .auth import auth_bp
from .lessons import lessons_bp
from .songs import songs_bp
from .progress import progress_bp
from .users import users_bp
from .gamification import gamification_bp
from .admin import admin_bp

__all__ = [
    "auth_bp",
    "lessons_bp",
    "songs_bp",
    "progress_bp",
    "users_bp",
    "gamification_bp",
    "admin_bp",
]
