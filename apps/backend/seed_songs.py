"""
Seed script to populate songs with melody patterns.

Usage:
1. Place MP3 files in a folder
2. Run: python seed_songs.py /path/to/mp3/folder

Each MP3 filename should be: "Artist - Song Title.mp3"
"""

import os
import sys
import json

# Add app to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models import Song, SongTutorial
from app.services import audio_analysis_service

def seed_songs_from_folder(folder_path: str):
    """Process all MP3 files in a folder and create songs."""

    if not audio_analysis_service.is_available():
        print("ERROR: Audio analysis libraries not installed!")
        print("Run: pip install basic-pitch librosa numpy soundfile")
        return

    app = create_app()

    with app.app_context():
        # Get all audio files
        audio_extensions = ('.mp3', '.wav', '.m4a', '.ogg', '.flac')
        audio_files = [
            f for f in os.listdir(folder_path)
            if f.lower().endswith(audio_extensions)
        ]

        if not audio_files:
            print(f"No audio files found in {folder_path}")
            return

        print(f"Found {len(audio_files)} audio files")

        for filename in audio_files:
            filepath = os.path.join(folder_path, filename)

            # Parse filename: "Artist - Title.mp3" or just "Title.mp3"
            name_without_ext = os.path.splitext(filename)[0]
            if ' - ' in name_without_ext:
                artist, title = name_without_ext.split(' - ', 1)
            else:
                title = name_without_ext
                artist = "Unknown Artist"

            # Check if song already exists
            existing = Song.query.filter_by(title=title, artist=artist).first()
            if existing:
                print(f"SKIP: '{title}' by {artist} already exists")
                continue

            print(f"\nProcessing: {filename}")
            print(f"  Title: {title}")
            print(f"  Artist: {artist}")

            try:
                # Extract melody
                print("  Extracting melody...")
                result = audio_analysis_service.extract_melody(filepath)

                print(f"  Found {len(result.notes)} notes")
                print(f"  Tempo: {result.tempo} BPM")
                print(f"  Key: {result.key}")

                # Create tutorial notes
                tutorial_notes = audio_analysis_service.create_tutorial_notes(result, simplify=True)
                melody_pattern = audio_analysis_service.create_melody_pattern(result)

                # Create song
                song = Song(
                    title=title,
                    artist=artist,
                    tempo=result.tempo,
                    key=result.key,
                    duration=int(result.duration),
                    difficulty='beginner',
                    is_free=True,
                    is_popular=False
                )
                song.melody_pattern = melody_pattern
                db.session.add(song)
                db.session.flush()

                # Create tutorial
                tutorial = SongTutorial(
                    song_id=song.id,
                    instrument="piano",
                    version="simplified",
                    notes_json=json.dumps(tutorial_notes)
                )
                db.session.add(tutorial)
                db.session.commit()

                print(f"  SUCCESS: Created song ID {song.id} with {len(tutorial_notes)} notes")

            except Exception as e:
                db.session.rollback()
                print(f"  ERROR: {str(e)}")
                continue

        # Summary
        total = Song.query.filter(Song.melody_pattern_json.isnot(None)).count()
        print(f"\n{'='*50}")
        print(f"Total songs with melody patterns: {total}")


def seed_sample_patterns():
    """Create sample song patterns manually (without audio files)."""

    app = create_app()

    # Sample Bollywood melodies (simplified note sequences)
    sample_songs = [
        {
            "title": "Tum Hi Ho",
            "artist": "Arijit Singh",
            "movie": "Aashiqui 2",
            "tempo": 70,
            "key": "E",
            # Opening melody: E F# G# A B A G# F# E
            "notes": [64, 66, 68, 69, 71, 69, 68, 66, 64, 64, 66, 68, 69, 71, 73, 71, 69, 68, 66],
        },
        {
            "title": "Kal Ho Naa Ho",
            "artist": "Sonu Nigam",
            "movie": "Kal Ho Naa Ho",
            "tempo": 85,
            "key": "G",
            # Opening: G A B C D C B A G
            "notes": [67, 69, 71, 72, 74, 72, 71, 69, 67, 67, 69, 71, 74, 76, 74, 71, 69, 67],
        },
        {
            "title": "Tujhe Dekha To",
            "artist": "Kumar Sanu & Lata Mangeshkar",
            "movie": "DDLJ",
            "tempo": 75,
            "key": "C",
            # Classic melody
            "notes": [60, 62, 64, 65, 67, 65, 64, 62, 60, 60, 64, 67, 72, 71, 69, 67, 65, 64, 62],
        },
        {
            "title": "Chaiyya Chaiyya",
            "artist": "Sukhwinder Singh",
            "movie": "Dil Se",
            "tempo": 130,
            "key": "D",
            "notes": [62, 64, 66, 67, 69, 71, 69, 67, 66, 64, 62, 64, 66, 69, 71, 74, 71, 69, 66],
        },
        {
            "title": "Kabira",
            "artist": "Arijit Singh & Harshdeep Kaur",
            "movie": "Yeh Jawaani Hai Deewani",
            "tempo": 90,
            "key": "A",
            "notes": [69, 71, 73, 74, 76, 74, 73, 71, 69, 69, 71, 73, 76, 78, 76, 73, 71, 69],
        },
    ]

    with app.app_context():
        for song_data in sample_songs:
            # Check if exists
            existing = Song.query.filter_by(
                title=song_data["title"],
                artist=song_data["artist"]
            ).first()

            if existing:
                print(f"SKIP: '{song_data['title']}' already exists")
                continue

            notes = song_data["notes"]

            # Calculate intervals
            intervals = []
            for i in range(1, len(notes)):
                intervals.append(notes[i] - notes[i-1])

            melody_pattern = {
                "intervals": intervals,
                "notes": notes,
                "tempo": song_data["tempo"],
                "key": song_data["key"]
            }

            # Create song
            song = Song(
                title=song_data["title"],
                artist=song_data["artist"],
                movie=song_data.get("movie"),
                tempo=song_data["tempo"],
                key=song_data["key"],
                duration=180,  # 3 min default
                difficulty='beginner',
                is_free=True,
                is_popular=True
            )
            song.melody_pattern = melody_pattern
            db.session.add(song)
            db.session.flush()

            # Create simple tutorial notes
            tutorial_notes = []
            time_ms = 0
            for i, note in enumerate(notes):
                tutorial_notes.append({
                    "midiNote": note,
                    "duration": 500,  # 500ms per note
                    "time": time_ms,
                    "index": i
                })
                time_ms += 500

            tutorial = SongTutorial(
                song_id=song.id,
                instrument="piano",
                version="simplified",
                notes_json=json.dumps(tutorial_notes)
            )
            db.session.add(tutorial)

            print(f"CREATED: '{song_data['title']}' by {song_data['artist']}")

        db.session.commit()

        total = Song.query.filter(Song.melody_pattern_json.isnot(None)).count()
        print(f"\nTotal songs with patterns: {total}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        folder = sys.argv[1]
        if os.path.isdir(folder):
            seed_songs_from_folder(folder)
        else:
            print(f"Folder not found: {folder}")
    else:
        print("No folder specified. Creating sample patterns instead...")
        seed_sample_patterns()
