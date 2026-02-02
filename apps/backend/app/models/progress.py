"""
Progress Models

Tracks user progress through lessons, songs, and practice sessions.
"""

from datetime import datetime
from ..extensions import db
import json


class LessonProgress(db.Model):
    """Tracks user progress through lessons."""

    __tablename__ = "lesson_progress"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    lesson_id = db.Column(db.Integer, db.ForeignKey("lessons.id"), nullable=False)

    # Progress tracking
    sections_completed = db.Column(db.Text, default="[]")  # JSON array of section IDs
    current_section_id = db.Column(db.String(50))
    overall_progress = db.Column(db.Integer, default=0)  # 0-100
    best_score = db.Column(db.Integer)
    practice_time_seconds = db.Column(db.Integer, default=0)

    # Timestamps
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_attempt_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)

    # Relationships
    user = db.relationship("User", back_populates="progress")
    lesson = db.relationship("Lesson", back_populates="progress")

    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint("user_id", "lesson_id", name="unique_user_lesson"),
    )

    @property
    def completed_sections(self):
        """Get list of completed section IDs."""
        if self.sections_completed:
            return json.loads(self.sections_completed)
        return []

    def mark_section_complete(self, section_id):
        """Mark a section as complete."""
        completed = self.completed_sections
        if section_id not in completed:
            completed.append(section_id)
            self.sections_completed = json.dumps(completed)
            self.last_attempt_at = datetime.utcnow()

    def update_progress(self, total_sections):
        """Recalculate overall progress percentage."""
        completed_count = len(self.completed_sections)
        self.overall_progress = int((completed_count / total_sections) * 100) if total_sections > 0 else 0

        if self.overall_progress >= 100:
            self.completed_at = datetime.utcnow()

    def add_practice_time(self, seconds):
        """Add practice time."""
        self.practice_time_seconds += seconds
        self.last_attempt_at = datetime.utcnow()

    def to_dict(self):
        """Convert to dictionary."""
        return {
            "lessonId": self.lesson_id,
            "sectionsCompleted": self.completed_sections,
            "currentSectionId": self.current_section_id,
            "overallProgress": self.overall_progress,
            "bestScore": self.best_score,
            "practiceTimeSeconds": self.practice_time_seconds,
            "lastAttemptAt": self.last_attempt_at.isoformat() if self.last_attempt_at else None,
            "completedAt": self.completed_at.isoformat() if self.completed_at else None,
        }


class SongProgress(db.Model):
    """Tracks user progress through songs."""

    __tablename__ = "song_progress"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    song_id = db.Column(db.Integer, db.ForeignKey("songs.id"), nullable=False)
    tutorial_id = db.Column(db.Integer, db.ForeignKey("song_tutorials.id"))

    # Progress tracking
    sections_completed = db.Column(db.Text, default="[]")
    overall_progress = db.Column(db.Integer, default=0)
    best_accuracy = db.Column(db.Integer)  # 0-100
    practice_time_seconds = db.Column(db.Integer, default=0)

    # Timestamps
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_practiced_at = db.Column(db.DateTime)
    mastered_at = db.Column(db.DateTime)

    # Relationships
    user = db.relationship("User", back_populates="song_progress")
    song = db.relationship("Song", back_populates="progress")

    __table_args__ = (
        db.UniqueConstraint("user_id", "song_id", name="unique_user_song"),
    )

    def to_dict(self):
        """Convert to dictionary."""
        return {
            "songId": self.song_id,
            "tutorialId": self.tutorial_id,
            "sectionsCompleted": json.loads(self.sections_completed) if self.sections_completed else [],
            "overallProgress": self.overall_progress,
            "bestAccuracy": self.best_accuracy,
            "practiceTimeSeconds": self.practice_time_seconds,
            "lastPracticedAt": self.last_practiced_at.isoformat() if self.last_practiced_at else None,
        }


class PracticeSession(db.Model):
    """Tracks individual practice sessions for analytics."""

    __tablename__ = "practice_sessions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    # Session type
    session_type = db.Column(db.String(20), nullable=False)  # lesson, song, free_play
    lesson_id = db.Column(db.Integer, db.ForeignKey("lessons.id"))
    song_id = db.Column(db.Integer, db.ForeignKey("songs.id"))

    # Session data
    duration_seconds = db.Column(db.Integer, default=0)
    notes_played = db.Column(db.Integer, default=0)
    notes_correct = db.Column(db.Integer, default=0)
    notes_wrong = db.Column(db.Integer, default=0)
    timing_errors = db.Column(db.Integer, default=0)
    final_score = db.Column(db.Integer)  # 0-100

    # Raw event log (for detailed analytics)
    events_json = db.Column(db.Text)  # JSON array of all note events

    # Timestamps
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    ended_at = db.Column(db.DateTime)

    # Relationships
    user = db.relationship("User", back_populates="practice_sessions")

    def add_note_event(self, event):
        """Add a note event to the session log."""
        events = json.loads(self.events_json) if self.events_json else []
        events.append(event)
        self.events_json = json.dumps(events)
        self.notes_played += 1

    def end_session(self):
        """End the session and calculate final stats."""
        self.ended_at = datetime.utcnow()
        self.duration_seconds = int((self.ended_at - self.started_at).total_seconds())

        # Calculate final score
        if self.notes_played > 0:
            self.final_score = int((self.notes_correct / self.notes_played) * 100)
        else:
            self.final_score = 0

    def to_dict(self):
        """Convert to dictionary."""
        return {
            "id": self.id,
            "sessionType": self.session_type,
            "lessonId": self.lesson_id,
            "songId": self.song_id,
            "durationSeconds": self.duration_seconds,
            "notesPlayed": self.notes_played,
            "notesCorrect": self.notes_correct,
            "notesWrong": self.notes_wrong,
            "timingErrors": self.timing_errors,
            "finalScore": self.final_score,
            "startedAt": self.started_at.isoformat(),
            "endedAt": self.ended_at.isoformat() if self.ended_at else None,
        }
