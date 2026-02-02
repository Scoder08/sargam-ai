"""
Practice Session Service

Manages real-time practice sessions.
Coordinates between WebSocket events, scoring, and persistence.
"""

from datetime import datetime
from typing import Dict, Optional, List
from dataclasses import dataclass, field
from ..models import PracticeSession, User, Lesson, Song
from ..extensions import db
from .scoring_service import (
    ScoringService,
    NoteEvent,
    ExpectedNote,
    NoteFeedback,
    FeedbackType
)


@dataclass
class ActiveSession:
    """In-memory representation of an active practice session."""
    session_id: str
    user_id: int
    session_type: str  # "lesson", "song", "free_play"
    lesson_id: Optional[int] = None
    song_id: Optional[int] = None
    
    # Expected notes for the current section
    expected_notes: List[ExpectedNote] = field(default_factory=list)
    current_note_index: int = 0
    
    # Real-time stats
    notes_played: int = 0
    notes_correct: int = 0
    notes_wrong: int = 0
    timing_errors: int = 0
    current_score: int = 0
    
    # Timing
    started_at: datetime = field(default_factory=datetime.utcnow)
    tempo: int = 80  # BPM
    
    # Event log for persistence
    events: List[dict] = field(default_factory=list)


class PracticeSessionService:
    """
    Manages practice sessions.
    
    Responsibilities:
    - Create/end sessions
    - Process incoming notes
    - Track real-time stats
    - Persist results to database
    """
    
    def __init__(self):
        self.scoring_service = ScoringService()
        # In-memory storage for active sessions
        # In production with multiple workers, use Redis
        self._active_sessions: Dict[str, ActiveSession] = {}

    def start_session(
        self,
        session_id: str,
        user_id: int,
        session_type: str,
        lesson_id: Optional[int] = None,
        song_id: Optional[int] = None,
        expected_notes: Optional[List[dict]] = None,
        tempo: int = 80
    ) -> ActiveSession:
        """
        Start a new practice session.
        
        Args:
            session_id: Unique session identifier (from WebSocket)
            user_id: User ID
            session_type: Type of session (lesson, song, free_play)
            lesson_id: Optional lesson ID
            song_id: Optional song ID
            expected_notes: List of expected notes for evaluation
            tempo: Tempo in BPM
            
        Returns:
            ActiveSession instance
        """
        # Parse expected notes
        parsed_notes = []
        if expected_notes:
            for note in expected_notes:
                parsed_notes.append(ExpectedNote(
                    midi_note=note["midiNote"],
                    start_time=note["startTime"],
                    duration=note.get("duration", 500),
                    velocity=note.get("velocity")
                ))
        
        session = ActiveSession(
            session_id=session_id,
            user_id=user_id,
            session_type=session_type,
            lesson_id=lesson_id,
            song_id=song_id,
            expected_notes=parsed_notes,
            tempo=tempo
        )
        
        self._active_sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[ActiveSession]:
        """Get an active session by ID."""
        return self._active_sessions.get(session_id)

    def process_note(
        self,
        session_id: str,
        midi_note: int,
        velocity: int,
        timestamp: float
    ) -> Optional[NoteFeedback]:
        """
        Process a played note and return feedback.
        
        Args:
            session_id: Session ID
            midi_note: MIDI note number (0-127)
            velocity: Note velocity (0-127)
            timestamp: Timestamp in ms since session start
            
        Returns:
            NoteFeedback or None if session not found
        """
        session = self._active_sessions.get(session_id)
        if not session:
            return None
        
        # Create note event
        played = NoteEvent(
            midi_note=midi_note,
            velocity=velocity,
            timestamp=timestamp
        )
        
        # Get expected note at current position
        expected = None
        next_expected = None
        
        if session.current_note_index < len(session.expected_notes):
            expected = session.expected_notes[session.current_note_index]
            
            # Also get next note for early hit detection
            if session.current_note_index + 1 < len(session.expected_notes):
                next_expected = session.expected_notes[session.current_note_index + 1]
        
        # Evaluate the note
        feedback = self.scoring_service.evaluate_note(played, expected, next_expected)
        
        # Update session stats
        session.notes_played += 1
        
        if feedback.feedback_type == FeedbackType.CORRECT:
            session.notes_correct += 1
            session.current_note_index += 1
        elif feedback.feedback_type in [FeedbackType.EARLY, FeedbackType.LATE]:
            session.timing_errors += 1
            session.current_note_index += 1  # Still advance, it was the right note
        else:
            session.notes_wrong += 1
        
        session.current_score += feedback.score_delta
        
        # Log event
        session.events.append({
            "timestamp": timestamp,
            "midiNote": midi_note,
            "velocity": velocity,
            "expectedNote": expected.midi_note if expected else None,
            "feedback": feedback.feedback_type.value,
            "timingDiff": feedback.timing_diff_ms
        })
        
        return feedback

    def get_current_stats(self, session_id: str) -> Optional[dict]:
        """Get current session statistics."""
        session = self._active_sessions.get(session_id)
        if not session:
            return None
        
        total_expected = len(session.expected_notes)
        progress = 0
        if total_expected > 0:
            progress = int((session.current_note_index / total_expected) * 100)
        
        return {
            "notesPlayed": session.notes_played,
            "notesCorrect": session.notes_correct,
            "notesWrong": session.notes_wrong,
            "timingErrors": session.timing_errors,
            "currentScore": session.current_score,
            "progress": progress,
            "currentNoteIndex": session.current_note_index,
            "totalNotes": total_expected
        }

    def end_session(self, session_id: str) -> Optional[dict]:
        """
        End a session and persist results.
        
        Args:
            session_id: Session ID
            
        Returns:
            Final session results or None if not found
        """
        session = self._active_sessions.pop(session_id, None)
        if not session:
            return None
        
        # Calculate final score
        total_expected = len(session.expected_notes)
        final_results = self.scoring_service.calculate_session_score(
            correct=session.notes_correct,
            timing_errors=session.timing_errors,
            wrong_notes=session.notes_wrong,
            total_expected=total_expected
        )
        
        # Persist to database
        db_session = PracticeSession(
            user_id=session.user_id,
            session_type=session.session_type,
            lesson_id=session.lesson_id,
            song_id=session.song_id,
            notes_played=session.notes_played,
            notes_correct=session.notes_correct,
            notes_wrong=session.notes_wrong,
            timing_errors=session.timing_errors,
            final_score=final_results["overallScore"],
            started_at=session.started_at
        )
        db_session.events_json = str(session.events)  # Simplified for MVP
        db_session.end_session()
        
        db.session.add(db_session)
        
        # Update user stats
        user = User.query.get(session.user_id)
        if user:
            duration_minutes = db_session.duration_seconds // 60
            user.update_practice_stats(
                minutes=duration_minutes,
                lesson_completed=(final_results["overallScore"] >= 70 and session.lesson_id),
                song_learned=(final_results["overallScore"] >= 80 and session.song_id)
            )
        
        db.session.commit()
        
        return {
            "sessionId": db_session.id,
            **final_results,
            "durationSeconds": db_session.duration_seconds
        }

    def update_expected_notes(
        self,
        session_id: str,
        expected_notes: List[dict],
        reset_progress: bool = False
    ) -> bool:
        """
        Update expected notes (e.g., when user moves to next section).
        
        Args:
            session_id: Session ID
            expected_notes: New expected notes
            reset_progress: Whether to reset the note index
            
        Returns:
            True if successful
        """
        session = self._active_sessions.get(session_id)
        if not session:
            return False
        
        session.expected_notes = [
            ExpectedNote(
                midi_note=n["midiNote"],
                start_time=n["startTime"],
                duration=n.get("duration", 500)
            )
            for n in expected_notes
        ]
        
        if reset_progress:
            session.current_note_index = 0
        
        return True


# Singleton instance
practice_service = PracticeSessionService()
