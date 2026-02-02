"""
Tutorial Parser Service

AI-powered service to parse various input formats into structured tutorial data.
Supports:
- Sargam notation (Sa Re Ga Ma Pa Dha Ni)
- Western notation (C D E F G A B)
- Numbered notation (1 2 3 4 5 6 7)
- MIDI note numbers
- Free-form text descriptions
"""

import os
import re
import json
from typing import Optional
from flask import current_app

# MIDI note mappings
SARGAM_TO_MIDI = {
    # Lower octave (with dot below)
    ".sa": 48, ".re": 50, ".ga": 52, ".ma": 53, ".pa": 55, ".dha": 57, ".ni": 59,
    # Middle octave
    "sa": 60, "re": 62, "ga": 64, "ma": 65, "pa": 67, "dha": 69, "ni": 71,
    # Upper octave (with dot above)
    "sa'": 72, "re'": 73, "ga'": 76, "ma'": 77, "pa'": 79, "dha'": 81, "ni'": 83,
    # Sharp/Komal variants
    "re_komal": 61, "ga_komal": 63, "dha_komal": 68, "ni_komal": 70,
    "ma_tivra": 66,
}

WESTERN_TO_MIDI = {
    "c": 60, "c#": 61, "db": 61, "d": 62, "d#": 63, "eb": 63,
    "e": 64, "f": 65, "f#": 66, "gb": 66, "g": 67, "g#": 68,
    "ab": 68, "a": 69, "a#": 70, "bb": 70, "b": 71,
}

NUMBERED_TO_MIDI = {
    "1": 60, "2": 62, "3": 64, "4": 65, "5": 67, "6": 69, "7": 71,
    # With octave markers
    "1'": 72, "2'": 74, "3'": 76, "4'": 77, "5'": 79, "6'": 81, "7'": 83,
    ".1": 48, ".2": 50, ".3": 52, ".4": 53, ".5": 55, ".6": 57, ".7": 59,
}


class TutorialParserService:
    """Service for parsing tutorial input into structured format."""

    def __init__(self):
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
        self.openai_key = os.getenv("OPENAI_API_KEY", "")

    def parse_tutorial_input(
        self,
        raw_input: str,
        title: str = "",
        artist: str = "",
        additional_context: str = ""
    ) -> dict:
        """
        Parse raw tutorial input into structured format.

        Args:
            raw_input: The raw notation/text input
            title: Song title (for context)
            artist: Artist name (for context)
            additional_context: Any additional context

        Returns:
            dict with: notes, intervals, tempo, key, sections
        """
        # First, try to detect the format and parse directly
        detected_format = self._detect_format(raw_input)

        if detected_format == "midi":
            return self._parse_midi_input(raw_input)
        elif detected_format == "json":
            return self._parse_json_input(raw_input)
        elif detected_format == "sargam":
            return self._parse_sargam_input(raw_input)
        elif detected_format == "western":
            return self._parse_western_input(raw_input)
        elif detected_format == "numbered":
            return self._parse_numbered_input(raw_input)
        else:
            # Use AI to parse complex/mixed input
            return self._parse_with_ai(raw_input, title, artist, additional_context)

    def _detect_format(self, raw_input: str) -> str:
        """Detect the format of the input."""
        text = raw_input.strip().lower()

        # Check for JSON
        if text.startswith("{") or text.startswith("["):
            try:
                json.loads(raw_input)
                return "json"
            except:
                pass

        # Check for pure MIDI numbers
        if re.match(r'^[\d\s,\[\]]+$', text):
            numbers = re.findall(r'\d+', text)
            if all(36 <= int(n) <= 96 for n in numbers):
                return "midi"

        # Check for Sargam notation
        sargam_pattern = r'\b(sa|re|ga|ma|pa|dha|ni)\b'
        if re.search(sargam_pattern, text, re.IGNORECASE):
            return "sargam"

        # Check for Western notation with octaves (C4, D#5, etc.)
        western_pattern = r'\b[a-g][#b]?\d\b'
        if re.search(western_pattern, text, re.IGNORECASE):
            return "western"

        # Check for numbered notation
        numbered_pattern = r'\b[1-7][\'.]?\b'
        if re.search(numbered_pattern, text) and not re.search(r'\b[89]\b', text):
            return "numbered"

        return "unknown"

    def _parse_midi_input(self, raw_input: str) -> dict:
        """Parse MIDI note numbers."""
        numbers = re.findall(r'\d+', raw_input)
        notes = [int(n) for n in numbers if 36 <= int(n) <= 96]

        intervals = []
        for i in range(1, len(notes)):
            intervals.append(notes[i] - notes[i-1])

        return {
            "notes": notes,
            "intervals": intervals,
            "tempo": 120,
            "key": self._detect_key(notes),
            "sections": [],
        }

    def _parse_json_input(self, raw_input: str) -> dict:
        """Parse JSON input."""
        data = json.loads(raw_input)

        notes = data.get("notes", [])
        intervals = data.get("intervals", [])

        # Calculate intervals if not provided
        if notes and not intervals:
            for i in range(1, len(notes)):
                intervals.append(notes[i] - notes[i-1])

        return {
            "notes": notes,
            "intervals": intervals,
            "tempo": data.get("tempo", 120),
            "key": data.get("key", "C"),
            "sections": data.get("sections", []),
        }

    def _parse_sargam_input(self, raw_input: str) -> dict:
        """Parse Sargam notation (Sa Re Ga Ma Pa Dha Ni)."""
        # Normalize input
        text = raw_input.lower().strip()

        # Split into tokens
        tokens = re.split(r'[\s,\-]+', text)

        notes = []
        current_octave = 0  # 0 = middle, -12 = lower, +12 = upper

        for token in tokens:
            token = token.strip()
            if not token:
                continue

            # Check for octave markers
            if token.startswith('.'):
                current_octave = -12
                token = token[1:]
            elif token.endswith("'"):
                current_octave = 12
                token = token[:-1]
            else:
                current_octave = 0

            # Handle komal/tivra
            base_note = token.replace('_komal', '').replace('_tivra', '')

            # Map to MIDI
            if token in SARGAM_TO_MIDI:
                notes.append(SARGAM_TO_MIDI[token])
            elif base_note in SARGAM_TO_MIDI:
                midi = SARGAM_TO_MIDI[base_note] + current_octave
                notes.append(midi)

        # Calculate intervals
        intervals = []
        for i in range(1, len(notes)):
            intervals.append(notes[i] - notes[i-1])

        return {
            "notes": notes,
            "intervals": intervals,
            "tempo": 120,
            "key": self._detect_key(notes),
            "sections": [],
        }

    def _parse_western_input(self, raw_input: str) -> dict:
        """Parse Western notation (C4, D#5, etc.)."""
        # Find all note patterns like C4, D#5, Bb3
        pattern = r'([A-Ga-g][#b]?)(\d)'
        matches = re.findall(pattern, raw_input)

        notes = []
        for note_name, octave in matches:
            base_midi = WESTERN_TO_MIDI.get(note_name.lower(), 60)
            # Adjust for octave (C4 = MIDI 60)
            midi = base_midi + (int(octave) - 4) * 12
            notes.append(midi)

        # Calculate intervals
        intervals = []
        for i in range(1, len(notes)):
            intervals.append(notes[i] - notes[i-1])

        return {
            "notes": notes,
            "intervals": intervals,
            "tempo": 120,
            "key": self._detect_key(notes),
            "sections": [],
        }

    def _parse_numbered_input(self, raw_input: str) -> dict:
        """Parse numbered notation (1 2 3 4 5 6 7)."""
        # Find tokens
        tokens = re.split(r'[\s,\-]+', raw_input)

        notes = []
        for token in tokens:
            token = token.strip()
            if token in NUMBERED_TO_MIDI:
                notes.append(NUMBERED_TO_MIDI[token])
            elif len(token) == 1 and token.isdigit() and 1 <= int(token) <= 7:
                notes.append(NUMBERED_TO_MIDI[token])

        # Calculate intervals
        intervals = []
        for i in range(1, len(notes)):
            intervals.append(notes[i] - notes[i-1])

        return {
            "notes": notes,
            "intervals": intervals,
            "tempo": 120,
            "key": "C",
            "sections": [],
        }

    def _parse_with_ai(
        self,
        raw_input: str,
        title: str,
        artist: str,
        additional_context: str
    ) -> dict:
        """Use AI to parse complex/mixed input."""

        prompt = f"""You are a music notation expert. Parse the following music notation into a structured format.

Song: {title} by {artist}
Additional context: {additional_context}

Input notation:
{raw_input}

Return a JSON object with:
- "notes": array of MIDI note numbers (Middle C = 60, each semitone +1)
- "intervals": array of intervals between consecutive notes
- "tempo": suggested tempo in BPM (default 120)
- "key": detected musical key (e.g., "C", "G", "Am")
- "sections": array of section objects with "name", "startNote", "endNote"

Important MIDI reference:
- C4 (Middle C) = 60
- D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71
- C5 = 72
- For Indian notation: Sa = 60, Re = 62, Ga = 64, Ma = 65, Pa = 67, Dha = 69, Ni = 71

Respond with ONLY the JSON object, no other text."""

        # Try Anthropic first
        if self.anthropic_key:
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=self.anthropic_key)
                response = client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=2000,
                    messages=[{"role": "user", "content": prompt}]
                )
                result_text = response.content[0].text
                # Extract JSON from response
                return self._extract_json(result_text)
            except Exception as e:
                print(f"Anthropic API error: {e}")

        # Fall back to OpenAI
        if self.openai_key:
            try:
                import openai
                client = openai.OpenAI(api_key=self.openai_key)
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=2000,
                )
                result_text = response.choices[0].message.content
                return self._extract_json(result_text)
            except Exception as e:
                print(f"OpenAI API error: {e}")

        # If no AI available, try best-effort parsing
        return self._best_effort_parse(raw_input)

    def _extract_json(self, text: str) -> dict:
        """Extract JSON from AI response text."""
        # Try to find JSON in the response
        text = text.strip()

        # Remove markdown code blocks if present
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

        # Find JSON object
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            json_str = text[start:end]
            return json.loads(json_str)

        raise ValueError("Could not extract JSON from AI response")

    def _best_effort_parse(self, raw_input: str) -> dict:
        """Best effort parsing when AI is not available."""
        # Try to extract any numbers that could be MIDI notes
        numbers = re.findall(r'\b(\d+)\b', raw_input)
        notes = [int(n) for n in numbers if 36 <= int(n) <= 96]

        if not notes:
            # Try to parse as simple note letters
            letters = re.findall(r'\b([A-Ga-g])\b', raw_input)
            for letter in letters:
                if letter.lower() in WESTERN_TO_MIDI:
                    notes.append(WESTERN_TO_MIDI[letter.lower()])

        intervals = []
        for i in range(1, len(notes)):
            intervals.append(notes[i] - notes[i-1])

        return {
            "notes": notes,
            "intervals": intervals,
            "tempo": 120,
            "key": self._detect_key(notes) if notes else "C",
            "sections": [],
        }

    def _detect_key(self, notes: list) -> str:
        """Detect the likely key from a list of MIDI notes."""
        if not notes:
            return "C"

        # Get pitch classes (0-11)
        pitch_classes = [n % 12 for n in notes]

        # Count occurrences
        counts = {}
        for pc in pitch_classes:
            counts[pc] = counts.get(pc, 0) + 1

        # Simple heuristic: the most common pitch class might be the tonic
        if counts:
            tonic = max(counts, key=counts.get)
            # Map pitch class to key name
            key_names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
            return key_names[tonic]

        return "C"
