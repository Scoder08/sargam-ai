"""
Audio Analysis Service

Extracts melody from audio files using ML-based pitch detection.
"""

import os
import tempfile
import json
import subprocess
import shutil
from typing import Optional
from dataclasses import dataclass

# Try to import audio libraries (may not be installed in all environments)
try:
    import numpy as np
    import librosa
    from basic_pitch.inference import predict
    from basic_pitch import ICASSP_2022_MODEL_PATH
    AUDIO_LIBS_AVAILABLE = True
except ImportError:
    AUDIO_LIBS_AVAILABLE = False
    np = None
    librosa = None


@dataclass
class ExtractedNote:
    """Represents a note extracted from audio."""
    midi_note: int
    start_time: float  # seconds
    duration: float  # seconds
    velocity: int  # 0-127


@dataclass
class MelodyExtractionResult:
    """Result of melody extraction from audio."""
    notes: list[ExtractedNote]
    tempo: int
    duration: float  # total duration in seconds
    key: str
    intervals: list[int]  # pitch intervals for pattern matching
    time_intervals: list[int]  # time differences in ms between notes (rhythm)


class AudioAnalysisService:
    """Service for extracting melody from audio files."""

    def __init__(self):
        self.supported_formats = ['.mp3', '.wav', '.m4a', '.ogg', '.flac']
        self.convertible_formats = ['.webm', '.opus', '.aac']  # Formats we can convert

    def is_available(self) -> bool:
        """Check if audio analysis libraries are available."""
        return AUDIO_LIBS_AVAILABLE

    def _convert_to_wav(self, input_path: str) -> Optional[str]:
        """
        Convert audio file to WAV format using ffmpeg.

        Returns:
            Path to converted WAV file, or None if conversion failed
        """
        # Check if ffmpeg is available
        if not shutil.which('ffmpeg'):
            return None

        # Create temp WAV file using mkstemp (not deprecated)
        fd, temp_wav = tempfile.mkstemp(suffix='.wav')
        os.close(fd)  # Close the file descriptor, ffmpeg will write to it

        try:
            # Use ffmpeg to convert to WAV (16-bit PCM, 44.1kHz mono)
            result = subprocess.run([
                'ffmpeg', '-y',  # Overwrite output
                '-i', input_path,
                '-acodec', 'pcm_s16le',  # 16-bit PCM
                '-ar', '44100',  # 44.1kHz sample rate
                '-ac', '1',  # Mono
                temp_wav
            ], capture_output=True, timeout=30)

            if result.returncode == 0 and os.path.exists(temp_wav):
                return temp_wav
            # Cleanup on failure
            if os.path.exists(temp_wav):
                os.unlink(temp_wav)
            return None
        except (subprocess.TimeoutExpired, Exception):
            if os.path.exists(temp_wav):
                os.unlink(temp_wav)
            return None

    # Configuration constants
    MAX_DURATION_SECONDS = 30  # Only analyze first 30 seconds
    MAX_NOTES = 30  # Maximum notes for tutorial

    def extract_melody(self, audio_path: str) -> Optional[MelodyExtractionResult]:
        """
        Extract melody from an audio file.

        Args:
            audio_path: Path to the audio file

        Returns:
            MelodyExtractionResult with extracted notes and metadata

        Note:
            - Only analyzes first 30 seconds of audio
            - Limits output to 30 notes max for simpler tutorials
            - Filters out noise/accompaniment, keeps only main melody
            - WebM files are automatically converted to WAV
        """
        if not AUDIO_LIBS_AVAILABLE:
            raise RuntimeError("Audio analysis libraries not installed. Run: pip install basic-pitch librosa numpy soundfile")

        # Check file exists
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        # Check format and convert if needed
        ext = os.path.splitext(audio_path)[1].lower()
        converted_path = None

        if ext in self.convertible_formats:
            # Try to convert to WAV
            converted_path = self._convert_to_wav(audio_path)
            if converted_path:
                audio_path = converted_path
            else:
                raise ValueError(f"Could not convert {ext} to WAV. Make sure ffmpeg is installed.")
        elif ext not in self.supported_formats:
            raise ValueError(f"Unsupported audio format: {ext}. Supported: {self.supported_formats + self.convertible_formats}")

        try:
            # Load audio and limit to first 30 seconds
            y, sr = librosa.load(audio_path, duration=self.MAX_DURATION_SECONDS)
            actual_duration = float(len(y) / sr)

            # If audio is shorter, use the full length
            analysis_duration = min(actual_duration, self.MAX_DURATION_SECONDS)

            # Use basic-pitch to extract melody
            model_output, midi_data, note_events = predict(audio_path)

            # Extract notes from basic-pitch output, filtering by time limit
            notes = []
            for note in note_events:
                start_time, end_time, midi_note, amplitude, _ = note

                # Skip notes that start after the time limit
                if start_time >= self.MAX_DURATION_SECONDS:
                    continue

                # Trim notes that extend past the limit
                if end_time > self.MAX_DURATION_SECONDS:
                    end_time = self.MAX_DURATION_SECONDS

                duration = end_time - start_time
                velocity = min(int(amplitude * 127), 127)

                # Filter out very quiet notes (likely noise/accompaniment)
                if velocity < 30:
                    continue

                # Filter out very short notes (likely noise)
                if duration < 0.05:
                    continue

                notes.append(ExtractedNote(
                    midi_note=int(midi_note),
                    start_time=float(start_time),
                    duration=float(duration),
                    velocity=velocity
                ))

            # Sort by start time
            notes.sort(key=lambda n: n.start_time)

            # Filter to keep only melody (highest notes at each time)
            melody_notes = self._extract_melody_line(notes)

            # Limit to MAX_NOTES for simpler tutorials
            if len(melody_notes) > self.MAX_NOTES:
                melody_notes = melody_notes[:self.MAX_NOTES]

            # Detect tempo from the limited audio
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
            tempo = int(round(float(tempo)))

            # Detect key (simplified)
            chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
            key = self._detect_key(chroma)

            # Calculate intervals for pattern matching
            intervals = self._calculate_intervals(melody_notes)

            # Calculate time intervals (rhythm) between notes
            time_intervals = self._calculate_time_intervals(melody_notes)

            return MelodyExtractionResult(
                notes=melody_notes,
                tempo=tempo,
                duration=analysis_duration,
                key=key,
                intervals=intervals,
                time_intervals=time_intervals
            )
        finally:
            # Clean up converted file if we created one
            if converted_path and os.path.exists(converted_path):
                try:
                    os.unlink(converted_path)
                except OSError:
                    pass

    def _extract_melody_line(self, notes: list[ExtractedNote], time_threshold: float = 0.1) -> list[ExtractedNote]:
        """
        Extract the main melody line from polyphonic notes.
        Keeps the highest note when multiple notes overlap.
        """
        if not notes:
            return []

        melody = []
        current_time = 0

        # Group notes by time window
        i = 0
        while i < len(notes):
            # Find all notes starting within the time threshold
            group = [notes[i]]
            j = i + 1
            while j < len(notes) and notes[j].start_time - notes[i].start_time < time_threshold:
                group.append(notes[j])
                j += 1

            # Keep the highest note from the group
            highest = max(group, key=lambda n: n.midi_note)
            melody.append(highest)

            i = j if j > i + 1 else i + 1

        return melody

    def _calculate_intervals(self, notes: list[ExtractedNote]) -> list[int]:
        """
        Calculate pitch intervals between consecutive notes.
        Used for pattern matching in song recognition.
        """
        if len(notes) < 2:
            return []

        intervals = []
        for i in range(1, len(notes)):
            interval = notes[i].midi_note - notes[i-1].midi_note
            intervals.append(interval)

        return intervals

    def _calculate_time_intervals(self, notes: list[ExtractedNote]) -> list[int]:
        """
        Calculate time differences (rhythm) between consecutive notes in milliseconds.
        This captures the rhythm/tempo pattern which is crucial for melody recognition.
        """
        if len(notes) < 2:
            return []

        time_intervals = []
        for i in range(1, len(notes)):
            # Time from end of previous note to start of current note
            time_diff_ms = int((notes[i].start_time - notes[i-1].start_time) * 1000)
            time_intervals.append(time_diff_ms)

        return time_intervals

    def _detect_key(self, chroma) -> str:
        """Detect the key of the audio using chroma features."""
        key_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

        # Sum chroma across time
        chroma_sum = np.sum(chroma, axis=1)

        # Find the most prominent pitch class
        key_idx = int(np.argmax(chroma_sum))

        return key_names[key_idx]

    def create_tutorial_notes(self, result: MelodyExtractionResult, simplify: bool = True) -> list[dict]:
        """
        Convert extracted melody to tutorial note format.

        Args:
            result: MelodyExtractionResult from extraction
            simplify: If True, quantize timings and simplify for beginners

        Returns:
            List of note dictionaries for SongTutorial.notes_json
        """
        notes = []

        for i, note in enumerate(result.notes):
            if simplify:
                # Quantize to 16th notes based on tempo
                beat_duration = 60.0 / result.tempo
                sixteenth = beat_duration / 4

                # Round duration to nearest 16th note
                quantized_duration = round(note.duration / sixteenth) * sixteenth
                quantized_duration = max(quantized_duration, sixteenth)  # Min 16th note

                duration_ms = int(quantized_duration * 1000)
            else:
                duration_ms = int(note.duration * 1000)

            notes.append({
                "midiNote": note.midi_note,
                "duration": duration_ms,
                "time": int(note.start_time * 1000),
                "index": i
            })

        return notes

    def create_melody_pattern(self, result: MelodyExtractionResult) -> dict:
        """
        Create a melody pattern for song recognition.

        Returns:
            Dictionary with pitch intervals, time intervals, and notes for matching
        """
        # Get first N intervals (enough for recognition, but not too many)
        max_intervals = 50
        intervals = result.intervals[:max_intervals]
        time_intervals = result.time_intervals[:max_intervals]

        # Get the actual notes for more accurate matching
        notes = [n.midi_note for n in result.notes[:max_intervals + 1]]

        # Normalize time intervals to relative values (short/medium/long)
        # This makes rhythm matching tempo-invariant
        normalized_rhythm = self._normalize_rhythm(time_intervals)

        return {
            "intervals": intervals,
            "notes": notes,
            "time_intervals": time_intervals,  # Raw time differences in ms
            "rhythm": normalized_rhythm,  # Normalized rhythm pattern
            "tempo": result.tempo,
            "key": result.key
        }

    def _normalize_rhythm(self, time_intervals: list[int]) -> list[str]:
        """
        Normalize time intervals to relative rhythm categories.
        This makes rhythm matching independent of actual tempo.

        Categories:
        - 'S' (short): < 200ms
        - 'M' (medium): 200-500ms
        - 'L' (long): 500-1000ms
        - 'X' (extra long): > 1000ms
        """
        if not time_intervals:
            return []

        rhythm = []
        for interval in time_intervals:
            if interval < 200:
                rhythm.append('S')
            elif interval < 500:
                rhythm.append('M')
            elif interval < 1000:
                rhythm.append('L')
            else:
                rhythm.append('X')

        return rhythm


class SongRecognitionService:
    """Service for recognizing songs from played notes with improved matching."""

    def __init__(self):
        self.min_notes_for_match = 4  # Lowered for better detection
        self.similarity_threshold = 0.6  # Lowered threshold for more matches
        self.rhythm_weight = 0.3  # How much rhythm affects final score (0-1)

    def find_matching_songs(
        self,
        played_notes: list[int],
        song_patterns: list[dict],
        played_times: list[int] = None  # Optional: timestamps in ms
    ) -> list[dict]:
        """
        Find songs that match the played note sequence using multiple matching strategies.
        Now also considers rhythm/timing patterns for better accuracy.

        Args:
            played_notes: List of MIDI notes played by user
            song_patterns: List of song patterns with 'intervals', 'notes', and 'rhythm' keys
            played_times: Optional list of timestamps (ms) when each note was played

        Returns:
            List of matches with song_id and confidence score
        """
        if len(played_notes) < self.min_notes_for_match:
            return []

        # Calculate intervals from played notes (transposition-invariant)
        played_intervals = self._notes_to_intervals(played_notes)

        # Calculate rhythm pattern from played times if available
        played_rhythm = None
        if played_times and len(played_times) >= 2:
            played_time_intervals = self._times_to_intervals(played_times)
            played_rhythm = self._normalize_rhythm(played_time_intervals)

        matches = []

        for pattern in song_patterns:
            song_intervals = pattern.get("intervals", [])
            song_notes = pattern.get("notes", [])
            song_rhythm = pattern.get("rhythm", [])

            if not song_intervals and song_notes:
                # Calculate intervals if not pre-computed
                song_intervals = self._notes_to_intervals(song_notes)

            if not song_intervals or len(song_intervals) < 3:
                continue

            # Try multiple matching strategies and take the best score
            scores = []

            # 1. Sliding window with fuzzy matching
            sliding_score = self._sliding_window_match(played_intervals, song_intervals)
            scores.append(sliding_score)

            # 2. Subsequence matching (find played sequence anywhere in song)
            subseq_score = self._subsequence_match(played_intervals, song_intervals)
            scores.append(subseq_score)

            # 3. Start matching (played notes match song start)
            start_score = self._start_match(played_intervals, song_intervals)
            scores.append(start_score * 1.1)  # Bonus for matching from start

            # Take best pitch score
            pitch_score = max(scores)

            # Apply rhythm matching if both have rhythm data
            final_score = pitch_score
            if played_rhythm and song_rhythm:
                rhythm_score = self._rhythm_match(played_rhythm, song_rhythm)
                # Combine pitch and rhythm scores
                final_score = (pitch_score * (1 - self.rhythm_weight) +
                              rhythm_score * self.rhythm_weight)

            if final_score >= self.similarity_threshold:
                matches.append({
                    "song_id": pattern.get("song_id"),
                    "title": pattern.get("title", "Unknown"),
                    "confidence": min(round(final_score * 100), 99),  # Cap at 99%
                    "artist": pattern.get("artist", ""),
                    "match_type": ["sliding", "subsequence", "start"][scores.index(max(scores))]
                })

        # Sort by confidence
        matches.sort(key=lambda m: m["confidence"], reverse=True)

        return matches[:5]  # Top 5 matches

    def _times_to_intervals(self, times: list[int]) -> list[int]:
        """Convert a list of timestamps to time intervals."""
        intervals = []
        for i in range(1, len(times)):
            intervals.append(times[i] - times[i-1])
        return intervals

    def _normalize_rhythm(self, time_intervals: list[int]) -> list[str]:
        """
        Normalize time intervals to relative rhythm categories.
        Categories: S (short), M (medium), L (long), X (extra long)
        """
        rhythm = []
        for interval in time_intervals:
            if interval < 200:
                rhythm.append('S')
            elif interval < 500:
                rhythm.append('M')
            elif interval < 1000:
                rhythm.append('L')
            else:
                rhythm.append('X')
        return rhythm

    def _rhythm_match(self, played: list[str], song: list[str]) -> float:
        """
        Match rhythm patterns. Returns similarity score 0-1.
        Allows some flexibility for human timing errors.
        """
        if not played or not song:
            return 0.0

        best_score = 0.0

        # Sliding window match for rhythm
        for offset in range(max(1, len(song) - len(played) + 1)):
            matches = 0
            comparisons = min(len(played), len(song) - offset)

            for i in range(comparisons):
                if played[i] == song[offset + i]:
                    matches += 1
                elif self._rhythm_close(played[i], song[offset + i]):
                    matches += 0.7  # Partial credit for close rhythm

            if comparisons > 0:
                score = matches / comparisons
                best_score = max(best_score, score)

        return best_score

    def _rhythm_close(self, r1: str, r2: str) -> bool:
        """Check if two rhythm categories are adjacent (close enough)."""
        order = {'S': 0, 'M': 1, 'L': 2, 'X': 3}
        return abs(order.get(r1, 0) - order.get(r2, 0)) == 1

    def _notes_to_intervals(self, notes: list[int]) -> list[int]:
        """Convert a list of MIDI notes to intervals."""
        intervals = []
        for i in range(1, len(notes)):
            intervals.append(notes[i] - notes[i-1])
        return intervals

    def _sliding_window_match(self, seq1: list[int], seq2: list[int]) -> float:
        """Sliding window approach with fuzzy matching."""
        if not seq1 or not seq2:
            return 0.0

        best_score = 0.0

        # Slide seq1 over seq2
        for offset in range(max(1, len(seq2) - len(seq1) + 1)):
            matches = 0
            near_matches = 0
            comparisons = min(len(seq1), len(seq2) - offset)

            for i in range(comparisons):
                diff = abs(seq1[i] - seq2[offset + i])
                if diff == 0:
                    matches += 1
                elif diff <= 1:
                    near_matches += 1
                elif diff <= 2:
                    near_matches += 0.5

            if comparisons > 0:
                # Weight exact matches more than near matches
                score = (matches + near_matches * 0.7) / comparisons
                best_score = max(best_score, score)

        return best_score

    def _subsequence_match(self, played: list[int], song: list[int]) -> float:
        """Find if played sequence appears as a subsequence in song with fuzzy matching."""
        if not played or not song:
            return 0.0

        # Use modified Needleman-Wunsch for local alignment
        best_score = 0.0
        played_len = len(played)

        for start in range(len(song)):
            score = 0
            matches = 0
            for i in range(min(played_len, len(song) - start)):
                diff = abs(played[i] - song[start + i])
                if diff == 0:
                    matches += 1
                    score += 1
                elif diff <= 1:
                    matches += 0.8
                    score += 0.8
                elif diff <= 2:
                    matches += 0.5
                    score += 0.5
                else:
                    score -= 0.3  # Penalty for mismatch

            if played_len > 0:
                normalized = matches / played_len
                best_score = max(best_score, normalized)

        return best_score

    def _start_match(self, played: list[int], song: list[int]) -> float:
        """Check if played notes match the start of the song."""
        if not played or not song:
            return 0.0

        matches = 0
        comparisons = min(len(played), len(song))

        for i in range(comparisons):
            diff = abs(played[i] - song[i])
            if diff == 0:
                matches += 1
            elif diff <= 1:
                matches += 0.8
            elif diff <= 2:
                matches += 0.5

        return matches / comparisons if comparisons > 0 else 0.0

    def _levenshtein_similarity(self, seq1: list[int], seq2: list[int]) -> float:
        """Calculate Levenshtein-based similarity between two sequences."""
        if not seq1 or not seq2:
            return 0.0

        m, n = len(seq1), len(seq2)
        dp = [[0] * (n + 1) for _ in range(m + 1)]

        for i in range(m + 1):
            dp[i][0] = i
        for j in range(n + 1):
            dp[0][j] = j

        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if abs(seq1[i-1] - seq2[j-1]) <= 1:  # Fuzzy match
                    dp[i][j] = dp[i-1][j-1]
                else:
                    dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])

        max_len = max(m, n)
        return 1 - (dp[m][n] / max_len) if max_len > 0 else 0.0


class AuddRecognitionService:
    """Service for recognizing songs using AudD API (audio fingerprinting)."""

    API_URL = "https://api.audd.io/"

    def __init__(self):
        self._api_key = None

    @property
    def api_key(self) -> str:
        """Lazy load API key from Flask config."""
        if self._api_key is None:
            try:
                from flask import current_app
                self._api_key = current_app.config.get("AUDD_API_KEY", "")
            except RuntimeError:
                self._api_key = os.environ.get("AUDD_API_KEY", "")
        return self._api_key

    def is_available(self) -> bool:
        """Check if AudD API is configured."""
        return bool(self.api_key)

    def recognize_from_file(self, audio_path: str) -> dict:
        """
        Recognize a song from an audio file using AudD API.

        Args:
            audio_path: Path to the audio file

        Returns:
            Recognition result with song info or error
        """
        import requests

        if not self.is_available():
            return {
                "success": False,
                "error": "AudD API key not configured",
                "message": "Please set AUDD_API_KEY in environment"
            }

        try:
            with open(audio_path, 'rb') as audio_file:
                files = {'file': audio_file}
                data = {'api_token': self.api_key, 'return': 'spotify'}

                response = requests.post(self.API_URL, data=data, files=files, timeout=30)
                response.raise_for_status()

                result = response.json()

                if result.get('status') == 'success' and result.get('result'):
                    song_data = result['result']
                    return {
                        "success": True,
                        "song": {
                            "title": song_data.get('title', 'Unknown'),
                            "artist": song_data.get('artist', 'Unknown'),
                            "album": song_data.get('album', ''),
                            "release_date": song_data.get('release_date', ''),
                            "spotify": song_data.get('spotify', {}),
                            "timecode": song_data.get('timecode', ''),
                        }
                    }
                else:
                    return {
                        "success": False,
                        "error": "Song not recognized",
                        "message": "Could not identify the song. Try playing actual music (not humming/singing) for 5+ seconds with minimal background noise."
                    }

        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "Timeout",
                "message": "Recognition request timed out"
            }
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": "API Error",
                "message": str(e)
            }
        except Exception as e:
            return {
                "success": False,
                "error": "Error",
                "message": str(e)
            }

    def recognize_from_bytes(self, audio_bytes: bytes, filename: str = "audio.wav") -> dict:
        """
        Recognize a song from audio bytes.

        Args:
            audio_bytes: Raw audio data
            filename: Original filename for content type detection

        Returns:
            Recognition result
        """
        import requests

        if not self.is_available():
            return {
                "success": False,
                "error": "AudD API key not configured",
                "message": "Please set AUDD_API_KEY in environment"
            }

        try:
            files = {'file': (filename, audio_bytes)}
            data = {'api_token': self.api_key, 'return': 'spotify'}

            response = requests.post(self.API_URL, data=data, files=files, timeout=30)
            response.raise_for_status()

            result = response.json()

            if result.get('status') == 'success' and result.get('result'):
                song_data = result['result']
                return {
                    "success": True,
                    "song": {
                        "title": song_data.get('title', 'Unknown'),
                        "artist": song_data.get('artist', 'Unknown'),
                        "album": song_data.get('album', ''),
                        "release_date": song_data.get('release_date', ''),
                        "spotify": song_data.get('spotify', {}),
                    }
                }
            else:
                return {
                    "success": False,
                    "error": "Song not recognized",
                    "message": "Could not identify the song from the audio"
                }

        except Exception as e:
            return {
                "success": False,
                "error": "Error",
                "message": str(e)
            }


class ClaudeRecognitionService:
    """Service for recognizing songs using Claude AI based on melody analysis."""

    def __init__(self):
        self._api_key = None
        self._client = None

    @property
    def api_key(self) -> str:
        """Lazy load API key from Flask config."""
        if self._api_key is None:
            try:
                from flask import current_app
                self._api_key = current_app.config.get("ANTHROPIC_API_KEY", "")
            except RuntimeError:
                self._api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        return self._api_key

    def is_available(self) -> bool:
        """Check if Claude API is configured."""
        return bool(self.api_key)

    def _get_client(self):
        """Initialize Anthropic client."""
        if self._client is None:
            try:
                import anthropic
                self._client = anthropic.Anthropic(api_key=self.api_key)
            except ImportError:
                raise RuntimeError("anthropic not installed. Run: pip install anthropic")
        return self._client

    def recognize_from_melody_data(
        self,
        melody_info: dict,
        context: str = "Bollywood/Hindi film music"
    ) -> dict:
        """
        Recognize a song from extracted melody data using Claude.

        Args:
            melody_info: Dictionary containing tempo, key, intervals, notes, etc.
            context: Musical context hint (e.g., "Bollywood", "Western pop")

        Returns:
            Recognition result with song suggestions
        """
        if not self.is_available():
            return {
                "success": False,
                "error": "Claude API key not configured",
                "message": "Please set ANTHROPIC_API_KEY in environment"
            }

        try:
            client = self._get_client()

            # Build a detailed prompt with melody information
            notes_str = ", ".join(str(n) for n in melody_info.get("notes", [])[:30])
            intervals_str = ", ".join(str(i) for i in melody_info.get("intervals", [])[:30])
            rhythm_str = "".join(melody_info.get("rhythm", [])[:30])

            prompt = f"""You are a music expert specializing in {context}. Based on the following melody analysis, identify the song or provide your best suggestions.

**Melody Analysis:**
- Tempo: {melody_info.get('tempo', 'unknown')} BPM
- Musical Key: {melody_info.get('key', 'unknown')}
- First 30 MIDI notes: [{notes_str}]
- Pitch intervals between notes: [{intervals_str}]
- Rhythm pattern (S=short <200ms, M=medium 200-500ms, L=long 500ms-1s, X=extra long >1s): {rhythm_str}
- Duration analyzed: {melody_info.get('duration', 'unknown')} seconds

**Your task:**
1. Try to identify the specific song based on the melody pattern
2. Consider the tempo, key signature, and rhythm pattern
3. Focus on {context} songs, but consider other genres too

Respond in this exact JSON format:
{{
    "identified": true/false,
    "confidence": "high/medium/low",
    "title": "Song Title (if identified)",
    "artist": "Artist Name (if identified)",
    "album": "Album/Movie Name (if known)",
    "suggestions": [
        {{"title": "Possible Song 1", "artist": "Artist", "reason": "Why this might match"}},
        {{"title": "Possible Song 2", "artist": "Artist", "reason": "Why this might match"}}
    ],
    "analysis": "Brief analysis of the melody characteristics"
}}

Only respond with valid JSON."""

            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )

            # Parse response (json already imported at module level)
            text = response.content[0].text.strip()

            # Clean up markdown code blocks if present
            if text.startswith('```'):
                text = text.split('\n', 1)[1]
            if text.endswith('```'):
                text = text.rsplit('\n', 1)[0]
            if text.startswith('json'):
                text = text[4:].strip()

            result = json.loads(text)

            if result.get("identified") and result.get("confidence") in ["high", "medium"]:
                return {
                    "success": True,
                    "song": {
                        "title": result.get("title", "Unknown"),
                        "artist": result.get("artist", "Unknown"),
                        "album": result.get("album", ""),
                    },
                    "confidence": result.get("confidence"),
                    "source": "claude",
                    "suggestions": result.get("suggestions", []),
                    "analysis": result.get("analysis", "")
                }
            else:
                return {
                    "success": False,
                    "identified": False,
                    "suggestions": result.get("suggestions", []),
                    "analysis": result.get("analysis", ""),
                    "source": "claude",
                    "message": "Song not definitively identified, but here are some suggestions based on melody analysis"
                }

        except json.JSONDecodeError:
            return {
                "success": False,
                "error": "Parse error",
                "message": "Could not parse AI response"
            }
        except Exception as e:
            return {
                "success": False,
                "error": "Claude API Error",
                "message": str(e)
            }

    def analyze_melody_for_tutorial(self, melody_info: dict) -> dict:
        """
        Get Claude's analysis of a melody for creating a tutorial.
        Provides insights about difficulty, suggested practice approach, etc.
        """
        if not self.is_available():
            return {"success": False, "error": "Claude API not configured"}

        try:
            client = self._get_client()

            notes_str = ", ".join(str(n) for n in melody_info.get("notes", [])[:50])
            intervals_str = ", ".join(str(i) for i in melody_info.get("intervals", [])[:50])

            prompt = f"""Analyze this melody for a piano learning tutorial:

**Melody Data:**
- Tempo: {melody_info.get('tempo', 'unknown')} BPM
- Key: {melody_info.get('key', 'unknown')}
- MIDI notes: [{notes_str}]
- Intervals: [{intervals_str}]
- Note count: {len(melody_info.get('notes', []))}

Provide analysis in JSON format:
{{
    "difficulty": "beginner/intermediate/advanced",
    "difficulty_reasons": ["reason1", "reason2"],
    "suggested_practice_tempo": number (BPM to start practicing),
    "key_challenges": ["challenge1", "challenge2"],
    "hand_position_tips": "Tips for hand positioning",
    "practice_sections": [
        {{"bars": "1-4", "focus": "what to focus on"}},
        {{"bars": "5-8", "focus": "what to focus on"}}
    ],
    "genre_style": "Bollywood ballad / upbeat dance / classical etc",
    "similar_songs": ["Song 1", "Song 2"]
}}

Only respond with valid JSON."""

            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )

            # Parse response (json already imported at module level)
            text = response.content[0].text.strip()
            if text.startswith('```'):
                text = text.split('\n', 1)[1]
            if text.endswith('```'):
                text = text.rsplit('\n', 1)[0]
            if text.startswith('json'):
                text = text[4:].strip()

            analysis = json.loads(text)

            return {
                "success": True,
                "analysis": analysis
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


class OpenAIRecognitionService:
    """Service for recognizing songs using OpenAI GPT based on melody analysis."""

    def __init__(self):
        self._api_key = None
        self._client = None

    @property
    def api_key(self) -> str:
        """Lazy load API key from Flask config."""
        if self._api_key is None:
            try:
                from flask import current_app
                self._api_key = current_app.config.get("OPENAI_API_KEY", "")
            except RuntimeError:
                self._api_key = os.environ.get("OPENAI_API_KEY", "")
        return self._api_key

    def is_available(self) -> bool:
        """Check if OpenAI API is configured."""
        return bool(self.api_key)

    def _get_client(self):
        """Initialize OpenAI client."""
        if self._client is None:
            try:
                from openai import OpenAI
                self._client = OpenAI(api_key=self.api_key)
            except ImportError:
                raise RuntimeError("openai not installed. Run: pip install openai")
        return self._client

    def recognize_from_melody_data(
        self,
        melody_info: dict,
        context: str = "Bollywood/Hindi film music"
    ) -> dict:
        """
        Recognize a song from extracted melody data using OpenAI GPT.

        Args:
            melody_info: Dictionary containing tempo, key, intervals, notes, etc.
            context: Musical context hint (e.g., "Bollywood", "Western pop")

        Returns:
            Recognition result with song suggestions
        """
        if not self.is_available():
            return {
                "success": False,
                "error": "OpenAI API key not configured",
                "message": "Please set OPENAI_API_KEY in environment"
            }

        try:
            client = self._get_client()

            # Build a detailed prompt with melody information
            notes_str = ", ".join(str(n) for n in melody_info.get("notes", [])[:30])
            intervals_str = ", ".join(str(i) for i in melody_info.get("intervals", [])[:30])
            rhythm_str = "".join(melody_info.get("rhythm", [])[:30])

            prompt = f"""You are a music expert specializing in {context}. Based on the following melody analysis, identify the song or provide your best suggestions.

**Melody Analysis:**
- Tempo: {melody_info.get('tempo', 'unknown')} BPM
- Musical Key: {melody_info.get('key', 'unknown')}
- First 30 MIDI notes: [{notes_str}]
- Pitch intervals between notes: [{intervals_str}]
- Rhythm pattern (S=short <200ms, M=medium 200-500ms, L=long 500ms-1s, X=extra long >1s): {rhythm_str}
- Duration analyzed: {melody_info.get('duration', 'unknown')} seconds

**Your task:**
1. Try to identify the specific song based on the melody pattern
2. Consider the tempo, key signature, and rhythm pattern
3. Focus on {context} songs, but consider other genres too

Respond in this exact JSON format:
{{
    "identified": true/false,
    "confidence": "high/medium/low",
    "title": "Song Title (if identified)",
    "artist": "Artist Name (if identified)",
    "album": "Album/Movie Name (if known)",
    "suggestions": [
        {{"title": "Possible Song 1", "artist": "Artist", "reason": "Why this might match"}},
        {{"title": "Possible Song 2", "artist": "Artist", "reason": "Why this might match"}}
    ],
    "analysis": "Brief analysis of the melody characteristics"
}}

Only respond with valid JSON."""

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1024,
                temperature=0.3
            )

            # Parse response
            text = response.choices[0].message.content.strip()

            # Clean up markdown code blocks if present
            if text.startswith('```'):
                text = text.split('\n', 1)[1]
            if text.endswith('```'):
                text = text.rsplit('\n', 1)[0]
            if text.startswith('json'):
                text = text[4:].strip()

            result = json.loads(text)

            if result.get("identified") and result.get("confidence") in ["high", "medium"]:
                return {
                    "success": True,
                    "song": {
                        "title": result.get("title", "Unknown"),
                        "artist": result.get("artist", "Unknown"),
                        "album": result.get("album", ""),
                    },
                    "confidence": result.get("confidence"),
                    "source": "openai",
                    "suggestions": result.get("suggestions", []),
                    "analysis": result.get("analysis", "")
                }
            else:
                return {
                    "success": False,
                    "identified": False,
                    "suggestions": result.get("suggestions", []),
                    "analysis": result.get("analysis", ""),
                    "source": "openai",
                    "message": "Song not definitively identified, but here are some suggestions based on melody analysis"
                }

        except json.JSONDecodeError:
            return {
                "success": False,
                "error": "Parse error",
                "message": "Could not parse AI response"
            }
        except Exception as e:
            return {
                "success": False,
                "error": "OpenAI API Error",
                "message": str(e)
            }


# Singleton instances
audio_analysis_service = AudioAnalysisService()
song_recognition_service = SongRecognitionService()
audd_recognition_service = AuddRecognitionService()
claude_recognition_service = ClaudeRecognitionService()
openai_recognition_service = OpenAIRecognitionService()
