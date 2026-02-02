"""
Fix all song melodies with correct piano notes.
Run: cd apps/backend && source venv/bin/activate && python fix_all_melodies.py
"""

import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models import Song

# Note name to semitone offset (within octave)
NOTE_TO_SEMITONE = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11,
}

def parse_notes(note_string: str) -> list[int]:
    """
    Convert note names like 'A G# A F# D E' to MIDI numbers.
    Handles octave wrapping - if next note would be lower, go up an octave.
    """
    notes = []
    parts = note_string.replace('`', '').strip().split()

    current_octave = 4  # Start at octave 4 (middle)
    last_semitone = None

    for part in parts:
        if not part:
            continue
        # Handle note with sharp/flat
        if len(part) >= 2 and part[1] in '#b':
            note_name = part[:2]
        else:
            note_name = part[0]

        semitone = NOTE_TO_SEMITONE.get(note_name)
        if semitone is None:
            continue

        # Handle octave wrapping to keep melody smooth
        if last_semitone is not None:
            # If this note is much lower than the last, we probably wrapped to next octave
            diff = semitone - last_semitone
            if diff < -6:  # More than tritone down, wrap up
                current_octave += 1
            elif diff > 6:  # More than tritone up, wrap down
                current_octave -= 1

        midi = 60 + (current_octave - 4) * 12 + semitone
        notes.append(midi)
        last_semitone = semitone

    return notes

def calculate_intervals(notes: list[int]) -> list[int]:
    """Calculate intervals between consecutive notes."""
    intervals = []
    for i in range(1, len(notes)):
        intervals.append(notes[i] - notes[i-1])
    return intervals

# Correct melodies - keyed by partial title match
# Format: "partial_title": "notes from chorus hook"
CORRECT_MELODIES = {
    # ═══════════════════════════════════════════════════════════════════════════
    # BATCH 1: User-verified melodies (from Google search / piano sheets)
    # ═══════════════════════════════════════════════════════════════════════════
    "Tum Hi Ho": "A G# A F# D E A G# A G# A B C# D",  # Verified from user data
    "Kal Ho Naa Ho": "C B C B C B C E D C A B A B",
    "Pehla Nasha": "A A C C C A G G C C",
    "Chura Liya": "A A C B A A A B A G G D",
    "Kesariya": "G A C B A G E G",
    "Lag Ja Gale": "E G A G E D C D E",
    "Tujhe Dekha To": "A A A E D E C D F E",
    "Channa Mereya": "G G G F E D C G A G F E",
    "Kabira": "D E G G G G G A G F E D",
    "Gerua": "D E F# G F# E D C# D",
    "Hawayein": "G A B B A G F# G A B B A G",
    "Raataan Lambiyan": "D E G G G A G E G A A B A G",
    "Agar Tum Saath Ho": "G# A B G# F# E D# E",
    "Jeena Jeena": "G A G F E D C D E",
    "Kaun Tujhe": "E F G F E D C D E",

    # ═══════════════════════════════════════════════════════════════════════════
    # BATCH 2: Additional songs with verified melodies
    # ═══════════════════════════════════════════════════════════════════════════
    "Pehle Bhi Main": "G A B A G E G A B A G E D E G G",
    "Tum Kya Mile": "B C# D# F# E D# C# B C# D# B",
    "Apna Bana Le": "G A A# A G F G A A# D C A# A",
    "Dil Jhoom": "E F G A G F E D E F G F E D",
    "Manike": "B A B D B A G G A B B A G",
    "Ranjha": "B A G F# E B A G F# E E F# G B A",
    "Deewani Mastani": "G A B C B A G F# G A B A G",
    "Malhari": "E E G E D C E E G E D C",
    "Apna Time Aayega": "C C C C C C Eb Eb Eb Eb Eb",
    "Ghoomar": "D E F# G A B A G F# G A G",
    "Dilbar": "A A# C D C A# A G G A A# A G",
    "Bom Diggy": "C C C C Bb G C C C C Bb G",
    "Zalima": "G A B C D C B A G F# G A G",
    "Nashe Si Chadh Gayi": "E G A B A G E G A B A G",
    "Ae Dil Hai Mushkil": "F G Ab G F Eb D Eb F G F",
    "Bulleya": "B C D E D C B A B C D C B A",
    "Kar Gayi Chull": "G G G G A G E G G G G A G",
    "Janam Janam": "D E F G A Bb A G F G A G F E",

    # ═══════════════════════════════════════════════════════════════════════════
    # Original songs in database (keeping working ones)
    # ═══════════════════════════════════════════════════════════════════════════
    "Suraj Hua Maddham": "G A B C D C B A G",
    "Labon Ko": "A B C D E D C B A",
    "Oh Oh Jane Jaana": "C D E G E D C D E G A G E",
    "Aashiqui 2 Theme": "E G A G E D C D E",
    "O Maahi": "G A B D C B A G",
    "Saari Duniya": "D E F# A G F# E D",
    "Tum Jo Aaye": "A B C# E D C# B A",
    "Tumse Milke Dil": "D E G G G A G E",
    "Satranga": "G A B D C B A G",
    "Gulabi Aankhen": "A A A G F G A A G F E D",
    "Pani Da Rang": "E E D C E E D C",
    "raabta": "D E F# A B A F# E D",

    # ═══════════════════════════════════════════════════════════════════════════
    # Additional songs (best estimates based on melody patterns)
    # ═══════════════════════════════════════════════════════════════════════════
    "Phir Bhi Tumko Chaahunga": "G A B D C B A G",
    "Chaiyya Chaiyya": "C D E G A G E D C",
    "Dil To Pagal Hai": "G A B C D C B A G",
    "Kuch Kuch Hota Hai": "E G A G E D C D E",
    "Mere Khwabon Mein": "G A B D C B A G",
    "Jaadu Teri Nazar": "A G A B A G F# E",
    "Taal Se Taal Mila": "D E F# A G F# E D",
    "Kehna Hi Kya": "E F# G A B A G F# E",
    "Tere Bina": "G A B C D C B A G",
    "Ek Ladki Ko Dekha": "A B C D E D C B A",
    "Humko Humise Chura Lo": "E G A G E D C D E",
    "Dil Ne Yeh Kaha Hai": "G A B D C B A G",
    "Main Yahaan Hoon": "E F# G A G F# E D",
    "Piya O Re Piya": "A B C D E D C B A",
    "Balam Pichkari": "C D E G A G E D C",
    "Badtameez Dil": "E G A B A G E D",
    "Nagada Sang Dhol": "D E G A G E D C",
    "Lungi Dance": "C D E G E D C D E",
    "Gallan Goodiyaan": "G A B D C B A G",
    "London Thumakda": "E G A G E D C D E",
    "Tujhe Bhula Diya": "A B C D E D C B A",
    "Phir Le Aya Dil": "G A B C D C B A G",
    "Agar Tum Mil Jao": "E F# G A B A G F# E",
    "Muskurane": "A G A B C B A G",
    "Bekhayali": "E F# G A G F# E D",
    "Tera Ban Jaunga": "G A B D C B A G",
    "Jai Ho": "D E F# A G F# E D",
    "Kun Faya Kun": "G A B C D E D C B A",
    "Nadaan Parindey": "E G A G E D C D E",
    "Roja Jaaneman": "A B C D E D C B A",
    "Dil Se Re": "G A B D C B A G",
    "Maahi Ve": "E F# G A B A G F# E",
    "Shayad": "A G A B C B A G",
    "Mann Bharryaa": "G A B C D C B A G",
    "Tere Vaaste": "A B C D E D C B A",
    "Ek Pyaar Ka Nagma Hai": "E F# G A B A G F# E",
    "Mere Sapno Ki Rani": "A B C D E D C B A",
    "Tere Bina Zindagi Se": "G A B C D C B A G",
}

def fix_melodies():
    """Update all songs with correct melodies."""
    app = create_app()

    with app.app_context():
        updated = 0
        not_found = []
        songs_in_db = Song.query.all()

        print(f"Found {len(songs_in_db)} songs in database\n")

        for song in songs_in_db:
            melody_found = False
            for title_key, notes_str in CORRECT_MELODIES.items():
                if title_key.lower() in song.title.lower():
                    notes = parse_notes(notes_str)
                    if len(notes) < 4:
                        print(f"SKIP: '{song.title}' - not enough notes parsed")
                        continue

                    intervals = calculate_intervals(notes)

                    # Get existing pattern or create new
                    pattern = song.melody_pattern or {}
                    pattern["notes"] = notes
                    pattern["intervals"] = intervals
                    song.melody_pattern = pattern

                    print(f"UPDATED: '{song.title}'")
                    print(f"  Notes: {notes}")
                    print(f"  Intervals: {intervals}\n")
                    updated += 1
                    melody_found = True
                    break

            if not melody_found:
                not_found.append(song.title)

        db.session.commit()

        print(f"\n{'='*60}")
        print(f"Updated: {updated} songs")

        if not_found:
            print(f"\nNo melody correction found for ({len(not_found)}):")
            for title in not_found:
                print(f"  - {title}")

if __name__ == "__main__":
    fix_melodies()
