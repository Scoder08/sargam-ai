"""
Scoring Service — Core IP 🎯

This is the heart of the AI feedback system.
Evaluates played notes against expected notes with timing tolerance.

For MVP with MIDI-only input, this is simple math, not ML.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional
from flask import current_app


class FeedbackType(Enum):
    """Types of feedback for a played note."""
    CORRECT = "correct"
    WRONG_NOTE = "wrong_note"
    EARLY = "early"
    LATE = "late"
    MISSED = "missed"


@dataclass
class NoteEvent:
    """Represents a played note from MIDI input."""
    midi_note: int
    velocity: int
    timestamp: float  # milliseconds since session start


@dataclass
class ExpectedNote:
    """Represents an expected note in the tutorial."""
    midi_note: int
    start_time: float  # milliseconds
    duration: float  # milliseconds
    velocity: Optional[int] = None  # optional for dynamics feedback


@dataclass
class NoteFeedback:
    """Feedback for a single note attempt."""
    feedback_type: FeedbackType
    expected_note: Optional[int]
    played_note: int
    timing_diff_ms: float
    score_delta: int
    message: str


class ScoringService:
    """
    Real-time note scoring engine.
    
    Design decisions:
    - Timing tolerance is configurable (default ±150ms)
    - Early/late is better than wrong note
    - Velocity matching is optional for MVP
    - Stateless - each note evaluated independently
    """

    def __init__(self, timing_tolerance_ms: int = None):
        """
        Initialize scoring service.
        
        Args:
            timing_tolerance_ms: Tolerance window for correct timing.
                                 Defaults to app config or 150ms.
        """
        if timing_tolerance_ms is None:
            try:
                timing_tolerance_ms = current_app.config.get("TIMING_TOLERANCE_MS", 150)
            except RuntimeError:
                timing_tolerance_ms = 150
        
        self.timing_tolerance_ms = timing_tolerance_ms
        
        # Score weights (tune these based on user feedback)
        self.CORRECT_POINTS = 10
        self.TIMING_ERROR_POINTS = 5  # Right note, wrong time
        self.WRONG_NOTE_POINTS = 0

    def evaluate_note(
        self,
        played: NoteEvent,
        expected: Optional[ExpectedNote],
        next_expected: Optional[ExpectedNote] = None
    ) -> NoteFeedback:
        """
        Evaluate a played note against expected note.
        
        Args:
            played: The note that was played
            expected: The expected note at this point
            next_expected: The next expected note (for early hit detection)
            
        Returns:
            NoteFeedback with evaluation result
        """
        # If no expected note, it's an extra note (not necessarily wrong in free play)
        if expected is None:
            return NoteFeedback(
                feedback_type=FeedbackType.WRONG_NOTE,
                expected_note=None,
                played_note=played.midi_note,
                timing_diff_ms=0,
                score_delta=0,
                message="Extra note played"
            )

        # Calculate timing difference
        timing_diff = played.timestamp - expected.start_time
        
        # Check if correct note
        is_correct_note = played.midi_note == expected.midi_note
        
        # Check timing
        is_within_tolerance = abs(timing_diff) <= self.timing_tolerance_ms
        is_early = timing_diff < -self.timing_tolerance_ms
        is_late = timing_diff > self.timing_tolerance_ms
        
        # Case 1: Correct note, correct timing
        if is_correct_note and is_within_tolerance:
            return NoteFeedback(
                feedback_type=FeedbackType.CORRECT,
                expected_note=expected.midi_note,
                played_note=played.midi_note,
                timing_diff_ms=timing_diff,
                score_delta=self.CORRECT_POINTS,
                message="Perfect! 🎉" if abs(timing_diff) < 50 else "Good!"
            )
        
        # Case 2: Correct note, early
        if is_correct_note and is_early:
            return NoteFeedback(
                feedback_type=FeedbackType.EARLY,
                expected_note=expected.midi_note,
                played_note=played.midi_note,
                timing_diff_ms=timing_diff,
                score_delta=self.TIMING_ERROR_POINTS,
                message=f"Too early ({int(abs(timing_diff))}ms)"
            )
        
        # Case 3: Correct note, late
        if is_correct_note and is_late:
            return NoteFeedback(
                feedback_type=FeedbackType.LATE,
                expected_note=expected.midi_note,
                played_note=played.midi_note,
                timing_diff_ms=timing_diff,
                score_delta=self.TIMING_ERROR_POINTS,
                message=f"Too late ({int(timing_diff)}ms)"
            )
        
        # Case 4: Wrong note
        return NoteFeedback(
            feedback_type=FeedbackType.WRONG_NOTE,
            expected_note=expected.midi_note,
            played_note=played.midi_note,
            timing_diff_ms=timing_diff,
            score_delta=self.WRONG_NOTE_POINTS,
            message=f"Wrong note (expected {self._midi_to_note_name(expected.midi_note)})"
        )

    def calculate_session_score(
        self,
        correct: int,
        timing_errors: int,
        wrong_notes: int,
        total_expected: int
    ) -> dict:
        """
        Calculate overall session score.
        
        Args:
            correct: Number of correct notes
            timing_errors: Number of timing errors
            wrong_notes: Number of wrong notes
            total_expected: Total expected notes
            
        Returns:
            Dictionary with score breakdown
        """
        if total_expected == 0:
            return {
                "overallScore": 0,
                "accuracy": 0,
                "timing": 0,
                "grade": "N/A",
                "message": "No notes to evaluate"
            }
        
        # Accuracy: what percentage of expected notes were hit correctly
        accuracy = (correct / total_expected) * 100
        
        # Timing score: penalize timing errors less than wrong notes
        total_attempts = correct + timing_errors + wrong_notes
        if total_attempts > 0:
            timing_score = ((correct + timing_errors * 0.5) / total_attempts) * 100
        else:
            timing_score = 0
        
        # Overall score: weighted combination
        overall = (accuracy * 0.7) + (timing_score * 0.3)
        
        # Grade
        grade = self._calculate_grade(overall)
        
        # Encouraging message
        message = self._get_score_message(overall, accuracy)
        
        return {
            "overallScore": round(overall),
            "accuracy": round(accuracy),
            "timing": round(timing_score),
            "grade": grade,
            "message": message,
            "breakdown": {
                "correct": correct,
                "timingErrors": timing_errors,
                "wrongNotes": wrong_notes,
                "totalExpected": total_expected
            }
        }

    def _calculate_grade(self, score: float) -> str:
        """Convert score to letter grade."""
        if score >= 90:
            return "A+"
        elif score >= 80:
            return "A"
        elif score >= 70:
            return "B"
        elif score >= 60:
            return "C"
        elif score >= 50:
            return "D"
        else:
            return "F"

    def _get_score_message(self, score: float, accuracy: float) -> str:
        """Get encouraging message based on score."""
        if score >= 90:
            return "Outstanding! You've mastered this! 🌟"
        elif score >= 80:
            return "Excellent work! Almost perfect! 🎉"
        elif score >= 70:
            return "Good job! Keep practicing! 💪"
        elif score >= 60:
            return "Nice effort! A bit more practice will help."
        elif score >= 50:
            return "You're getting there! Try slowing down."
        else:
            return "Keep practicing! Try at a slower tempo."

    @staticmethod
    def _midi_to_note_name(midi_note: int) -> str:
        """Convert MIDI note number to note name (e.g., 60 -> C4)."""
        note_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        octave = (midi_note // 12) - 1
        note = note_names[midi_note % 12]
        return f"{note}{octave}"


# Singleton instance for use across the app
scoring_service = ScoringService()
