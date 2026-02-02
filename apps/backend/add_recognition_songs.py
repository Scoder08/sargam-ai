"""
Add songs to database for melody recognition only (no full tutorials).
This allows recognizing many more songs than we have tutorials for.

Run: cd apps/backend && source venv/bin/activate && python add_recognition_songs.py
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
    parts = note_string.replace('`', '').replace('|', '').replace('+', '').strip().split()

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

# Songs to add for recognition only (no tutorials needed)
# Format: (title, artist, movie, notes_string, tempo, key)
RECOGNITION_ONLY_SONGS = [
    # From user's Batch 2 data
    ("Tum Kya Mile", "Arijit Singh", "Rocky Aur Rani Ki Prem Kahani", "B C# D# F# E D# C# B C# D# B", 85, "B"),
    ("Dil Jhoom", "Arijit Singh", "Gadar 2", "E F G A G F E D E F G F E D", 90, "E"),
    ("Manike", "Yohani", "Thank God", "B A B D B A G G A B B A G", 100, "G"),
    ("Ranjha", "B Praak", "Shershaah", "B A G F# E B A G F# E E F# G B A", 75, "Em"),
    ("Deewani Mastani", "Shreya Ghoshal", "Bajirao Mastani", "G A B C B A G F# G A B A G", 70, "G"),
    ("Malhari", "Vishal Dadlani", "Bajirao Mastani", "E E G E D C E E G E D C", 140, "C"),
    ("Apna Time Aayega", "Ranveer Singh", "Gully Boy", "C C C C C C Eb Eb Eb Eb Eb", 95, "Cm"),
    ("Ghoomar", "Shreya Ghoshal", "Padmaavat", "D E F# G A B A G F# G A G", 85, "D"),
    ("Dilbar", "Neha Kakkar", "Satyameva Jayate", "A A# C D C A# A G G A A# A G", 105, "Am"),
    ("Bom Diggy", "Zack Knight", "Sonu Ke Titu Ki Sweety", "C C C C Bb G C C C C Bb G", 110, "C"),
    ("Zalima", "Arijit Singh", "Raees", "G A B C D C B A G F# G A G", 80, "G"),
    ("Nashe Si Chadh Gayi", "Arijit Singh", "Befikre", "E G A B A G E G A B A G", 95, "Em"),
    ("Ae Dil Hai Mushkil", "Arijit Singh", "Ae Dil Hai Mushkil", "F G Ab G F Eb D Eb F G F", 72, "Fm"),
    ("Bulleya", "Amit Mishra", "Ae Dil Hai Mushkil", "B C D E D C B A B C D C B A", 85, "Am"),
    ("Kar Gayi Chull", "Badshah", "Kapoor & Sons", "G G G G A G E G G G G A G", 100, "G"),
    ("Janam Janam", "Arijit Singh", "Dilwale", "D E F G A Bb A G F G A G F E", 68, "Dm"),

    # Classic hits for recognition
    ("Jeena Jeena", "Atif Aslam", "Badlapur", "G A G F E D C D E", 75, "C"),
    ("Kaun Tujhe", "Palak Muchhal", "M.S. Dhoni", "E F G F E D C D E", 70, "C"),

    # More popular songs
    ("Aaj Se Teri", "Arijit Singh", "Padman", "E G A G E D C D E G A", 80, "C"),
    ("Tere Sang Yaara", "Atif Aslam", "Rustom", "G A B A G F# E F# G", 72, "G"),
    ("Enna Sona", "Arijit Singh", "OK Jaanu", "E F# G A G F# E D E", 78, "Em"),
    ("O Saathi", "Atif Aslam", "Baaghi 2", "G A B C D C B A G", 75, "C"),
    ("Dil Diyan Gallan", "Atif Aslam", "Tiger Zinda Hai", "E F# G A B A G F# E", 68, "Em"),
    ("Roke Na Ruke", "Arijit Singh", "Badrinath Ki Dulhania", "G A B C B A G F# G", 72, "G"),
    ("Mere Naam Tu", "Abhay Jodhpurkar", "Zero", "G A B D C B A G F# G", 75, "G"),
    ("Humsafar", "Akhil Sachdeva", "Badrinath Ki Dulhania", "E G A G E D C D E", 78, "C"),
    ("Naina", "Arijit Singh", "Dangal", "A B C D E D C B A", 70, "Am"),
    ("Tera Yaar Hoon Main", "Arijit Singh", "Sonu Ke Titu Ki Sweety", "G A B C D C B A G", 75, "C"),
    ("Ve Maahi", "Arijit Singh", "Kesari", "E F# G A G F# E D E", 72, "Em"),
    ("Dil Meri Na Sune", "Atif Aslam", "Genius", "G A B A G F# E F# G", 70, "G"),
]


def add_recognition_songs():
    """Add songs to database for recognition only."""
    app = create_app()

    with app.app_context():
        added = 0
        skipped = 0

        for title, artist, movie, notes_str, tempo, key in RECOGNITION_ONLY_SONGS:
            # Check if song already exists
            existing = Song.query.filter(
                db.func.lower(Song.title) == title.lower()
            ).first()

            if existing:
                print(f"SKIP (exists): '{title}'")
                skipped += 1
                continue

            # Parse notes
            notes = parse_notes(notes_str)
            if len(notes) < 4:
                print(f"SKIP (not enough notes): '{title}'")
                skipped += 1
                continue

            intervals = calculate_intervals(notes)

            # Create melody pattern
            melody_pattern = {
                "notes": notes,
                "intervals": intervals,
                "tempo": tempo,
                "key": key
            }

            # Create song (recognition only, no tutorial)
            song = Song(
                title=title,
                artist=artist,
                movie=movie,
                tempo=tempo,
                key=key,
                difficulty="intermediate",  # Default
                genre="Bollywood",
                is_free=True,  # Free since no tutorial
                is_popular=True,
                melody_pattern_json=json.dumps(melody_pattern)
            )

            db.session.add(song)

            print(f"ADDED: '{title}' by {artist}")
            print(f"  Notes: {notes}")
            print(f"  Intervals: {intervals}\n")
            added += 1

        db.session.commit()

        print(f"\n{'='*60}")
        print(f"Added: {added} songs")
        print(f"Skipped: {skipped} songs")
        print(f"\nTotal songs in database: {Song.query.count()}")


if __name__ == "__main__":
    add_recognition_songs()
