"""
User Model

Represents a user in the system.
"""

from datetime import datetime
from ..extensions import db
import bcrypt


class User(db.Model):
    """User model for authentication and profile."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String(15), unique=True, nullable=True, index=True)
    email = db.Column(db.String(255), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=True)
    name = db.Column(db.String(100), nullable=False)
    avatar_url = db.Column(db.String(500))

    # Profile settings
    preferred_instrument = db.Column(db.String(20), default="piano")
    skill_level = db.Column(db.String(20), default="beginner")
    preferred_language = db.Column(db.String(5), default="en")
    timezone = db.Column(db.String(50), default="Asia/Kolkata")

    # Stats
    streak_days = db.Column(db.Integer, default=0)
    total_practice_minutes = db.Column(db.Integer, default=0)
    lessons_completed = db.Column(db.Integer, default=0)
    songs_learned = db.Column(db.Integer, default=0)

    # Preferences
    daily_goal_minutes = db.Column(db.Integer, default=15)
    notifications_enabled = db.Column(db.Boolean, default=True)
    metronome_enabled = db.Column(db.Boolean, default=True)
    default_tempo = db.Column(db.Integer, default=80)

    # Subscription
    is_premium = db.Column(db.Boolean, default=False)
    premium_until = db.Column(db.DateTime)

    # Admin
    is_admin = db.Column(db.Boolean, default=False)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = db.Column(db.DateTime)
    last_practice_at = db.Column(db.DateTime)

    # Relationships
    progress = db.relationship("LessonProgress", back_populates="user", lazy="dynamic")
    song_progress = db.relationship("SongProgress", back_populates="user", lazy="dynamic")
    practice_sessions = db.relationship("PracticeSession", back_populates="user", lazy="dynamic")

    def __init__(self, name, email=None, password=None, phone=None, **kwargs):
        super().__init__(name=name, email=email, phone=phone, **kwargs)
        if password:
            self.set_password(password)

    def set_password(self, password):
        """Hash and set the user's password."""
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    def check_password(self, password):
        """Verify the user's password."""
        if not self.password_hash:
            return False
        return bcrypt.checkpw(
            password.encode("utf-8"),
            self.password_hash.encode("utf-8")
        )

    def update_last_login(self):
        """Update last login timestamp."""
        self.last_login_at = datetime.utcnow()
        db.session.commit()

    def update_practice_stats(self, minutes, lesson_completed=False, song_learned=False):
        """Update practice statistics."""
        self.total_practice_minutes += minutes
        self.last_practice_at = datetime.utcnow()

        if lesson_completed:
            self.lessons_completed += 1
        if song_learned:
            self.songs_learned += 1

        db.session.commit()

    @property
    def is_active_premium(self):
        """Check if user has active premium subscription."""
        if not self.is_premium:
            return False
        if self.premium_until is None:
            return True
        return self.premium_until > datetime.utcnow()

    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "phone": self.phone,
            "email": self.email,
            "name": self.name,
            "avatarUrl": self.avatar_url,
            "preferredInstrument": self.preferred_instrument,
            "skillLevel": self.skill_level,
            "preferredLanguage": self.preferred_language,
            "streakDays": self.streak_days,
            "totalPracticeMinutes": self.total_practice_minutes,
            "lessonsCompleted": self.lessons_completed,
            "songsLearned": self.songs_learned,
            "isPremium": self.is_active_premium,
            "isAdmin": self.is_admin,
            "createdAt": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<User {self.phone or self.email}>"


class OTP(db.Model):
    """OTP for phone verification."""

    __tablename__ = "otps"

    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String(15), nullable=False, index=True)
    code = db.Column(db.String(6), nullable=False)
    attempts = db.Column(db.Integer, default=0)
    verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)

    @property
    def is_expired(self):
        """Check if OTP is expired."""
        return datetime.utcnow() > self.expires_at

    @property
    def is_valid(self):
        """Check if OTP can still be used."""
        return not self.is_expired and not self.verified and self.attempts < 5
