"""
Song and Lesson Models

Represents songs, lessons, and their content.
"""

from datetime import datetime
from ..extensions import db
import json


class Lesson(db.Model):
    """Lesson model for structured learning content."""

    __tablename__ = "lessons"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    title_hindi = db.Column(db.String(200))
    description = db.Column(db.Text)
    description_hindi = db.Column(db.Text)

    # Metadata
    instrument = db.Column(db.String(20), nullable=False, default="piano")
    skill_level = db.Column(db.String(20), nullable=False, default="beginner")
    duration_minutes = db.Column(db.Integer, default=10)
    order = db.Column(db.Integer, default=0)

    # Media
    thumbnail_url = db.Column(db.String(500))
    video_url = db.Column(db.String(500))

    # Module relationship
    module_id = db.Column(db.Integer, db.ForeignKey("lesson_modules.id"))
    module = db.relationship("LessonModule", back_populates="lessons")

    # Content (stored as JSON)
    sections_json = db.Column(db.Text)  # JSON array of sections

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    progress = db.relationship("LessonProgress", back_populates="lesson", lazy="dynamic")

    @property
    def sections(self):
        """Parse sections JSON."""
        if self.sections_json:
            return json.loads(self.sections_json)
        return []

    @sections.setter
    def sections(self, value):
        """Serialize sections to JSON."""
        self.sections_json = json.dumps(value)

    def to_dict(self, include_sections=False):
        """Convert to dictionary."""
        data = {
            "id": self.id,
            "title": self.title,
            "titleHindi": self.title_hindi,
            "description": self.description,
            "instrument": self.instrument,
            "skillLevel": self.skill_level,
            "durationMinutes": self.duration_minutes,
            "thumbnailUrl": self.thumbnail_url,
            "videoUrl": self.video_url,
            "order": self.order,
            "moduleId": self.module_id,
        }
        if include_sections:
            data["sections"] = self.sections
        return data


class LessonModule(db.Model):
    """Module grouping related lessons."""

    __tablename__ = "lesson_modules"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    title_hindi = db.Column(db.String(200))
    description = db.Column(db.Text)
    instrument = db.Column(db.String(20), nullable=False, default="piano")
    skill_level = db.Column(db.String(20), nullable=False, default="beginner")
    order = db.Column(db.Integer, default=0)
    thumbnail_url = db.Column(db.String(500))

    # Relationships
    lessons = db.relationship("Lesson", back_populates="module", lazy="dynamic", order_by="Lesson.order")

    def to_dict(self, include_lessons=False):
        """Convert to dictionary."""
        data = {
            "id": self.id,
            "title": self.title,
            "titleHindi": self.title_hindi,
            "description": self.description,
            "instrument": self.instrument,
            "skillLevel": self.skill_level,
            "order": self.order,
            "thumbnailUrl": self.thumbnail_url,
            "lessonsCount": self.lessons.count(),
        }
        if include_lessons:
            data["lessons"] = [l.to_dict() for l in self.lessons]
        return data


class Song(db.Model):
    """Song model for Bollywood song tutorials."""

    __tablename__ = "songs"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    title_hindi = db.Column(db.String(200))
    artist = db.Column(db.String(200))
    movie = db.Column(db.String(200))
    year = db.Column(db.Integer)

    # Music metadata
    tempo = db.Column(db.Integer, default=120)  # BPM
    key = db.Column(db.String(10), default="C")
    duration = db.Column(db.Integer, default=0)  # seconds

    # Categorization
    genre = db.Column(db.String(50), default="bollywood")
    difficulty = db.Column(db.String(20), default="beginner")
    instruments = db.Column(db.String(100), default="piano")  # comma-separated

    # Media
    thumbnail_url = db.Column(db.String(500))
    preview_url = db.Column(db.String(500))

    # Stats
    play_count = db.Column(db.Integer, default=0)
    is_popular = db.Column(db.Boolean, default=False)
    is_free = db.Column(db.Boolean, default=False)

    # AI Recognition - melody pattern stored as JSON
    # Format: {"intervals": [0, 2, 2, -1, ...], "notes": [60, 62, 64, 63, ...]}
    melody_pattern_json = db.Column(db.Text)

    # User-created song tracking
    created_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_by_user = db.relationship("User", backref="created_songs")

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tutorials = db.relationship("SongTutorial", back_populates="song", lazy="dynamic")
    progress = db.relationship("SongProgress", back_populates="song", lazy="dynamic")

    def increment_play_count(self):
        """Increment play count."""
        self.play_count += 1
        db.session.commit()

    @property
    def melody_pattern(self):
        """Parse melody pattern JSON."""
        if self.melody_pattern_json:
            return json.loads(self.melody_pattern_json)
        return None

    @melody_pattern.setter
    def melody_pattern(self, value):
        """Serialize melody pattern to JSON."""
        self.melody_pattern_json = json.dumps(value) if value else None

    @property
    def has_tutorial(self):
        """Check if song has at least one tutorial."""
        return self.tutorials.count() > 0

    def to_dict(self):
        """Convert to dictionary."""
        return {
            "id": self.id,
            "title": self.title,
            "titleHindi": self.title_hindi,
            "artist": self.artist,
            "movie": self.movie,
            "year": self.year,
            "tempo": self.tempo,
            "key": self.key,
            "duration": self.duration,
            "genre": self.genre,
            "difficulty": self.difficulty,
            "instruments": self.instruments.split(",") if self.instruments else [],
            "thumbnailUrl": self.thumbnail_url,
            "previewUrl": self.preview_url,
            "playCount": self.play_count,
            "isPopular": self.is_popular,
            "isFree": self.is_free,
            "hasTutorial": self.has_tutorial,
            "hasMelodyPattern": self.melody_pattern is not None,
            "createdByUserId": self.created_by_user_id,
        }


class UserUnlockedSong(db.Model):
    """Track which songs users have unlocked with gems."""

    __tablename__ = "user_unlocked_songs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    song_id = db.Column(db.Integer, db.ForeignKey("songs.id"), nullable=False)
    gems_spent = db.Column(db.Integer, default=0)
    unlocked_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship("User", backref="unlocked_songs")
    song = db.relationship("Song", backref="unlocked_by_users")

    __table_args__ = (
        db.UniqueConstraint("user_id", "song_id", name="unique_user_song_unlock"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "songId": self.song_id,
            "gemsSpent": self.gems_spent,
            "unlockedAt": self.unlocked_at.isoformat(),
        }


class SongTutorial(db.Model):
    """Tutorial content for a song."""

    __tablename__ = "song_tutorials"

    id = db.Column(db.Integer, primary_key=True)
    song_id = db.Column(db.Integer, db.ForeignKey("songs.id"), nullable=False)
    instrument = db.Column(db.String(20), nullable=False, default="piano")
    version = db.Column(db.String(20), default="simplified")  # simplified, standard, advanced

    # Tutorial content (JSON)
    sections_json = db.Column(db.Text)  # Array of tutorial sections
    notes_json = db.Column(db.Text)  # Full melody notes array
    chords_json = db.Column(db.Text)  # Chord progression

    # Media
    video_url = db.Column(db.String(500))

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    song = db.relationship("Song", back_populates="tutorials")

    @property
    def sections(self):
        """Parse sections JSON."""
        if self.sections_json:
            return json.loads(self.sections_json)
        return []

    @property
    def notes(self):
        """Parse notes JSON."""
        if self.notes_json:
            return json.loads(self.notes_json)
        return []

    @property
    def chords(self):
        """Parse chords JSON."""
        if self.chords_json:
            return json.loads(self.chords_json)
        return []

    def to_dict(self):
        """Convert to dictionary."""
        return {
            "id": self.id,
            "songId": self.song_id,
            "instrument": self.instrument,
            "version": self.version,
            "sections": self.sections,
            "notes": self.notes,
            "chords": self.chords,
            "videoUrl": self.video_url,
            "song": self.song.to_dict() if self.song else None,
        }
