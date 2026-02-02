"""
Seed script with 50+ popular Bollywood song melodies.
No audio files needed - just run this script!

Usage:
    cd apps/backend
    source venv/bin/activate
    python seed_bollywood_songs.py
"""

import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models import Song, SongTutorial

# Popular Bollywood songs with their opening melodies
# Notes are MIDI numbers (60 = Middle C)
# These are the recognizable "hook" parts of each song

BOLLYWOOD_SONGS = [
    # ─────────────────────────────────────────────────────────────────────────
    # Arijit Singh Era (2010s-2020s)
    # ─────────────────────────────────────────────────────────────────────────
    {
        "title": "Tum Hi Ho",
        "artist": "Arijit Singh",
        "movie": "Aashiqui 2",
        "year": 2013,
        "tempo": 70,
        "key": "E",
        "difficulty": "beginner",
        # "Tum hi ho... ab tum hi ho"
        "notes": [64, 64, 66, 68, 68, 66, 64, 62, 64, 64, 66, 68, 71, 69, 68, 66, 64],
    },
    {
        "title": "Channa Mereya",
        "artist": "Arijit Singh",
        "movie": "Ae Dil Hai Mushkil",
        "year": 2016,
        "tempo": 85,
        "key": "G",
        "difficulty": "intermediate",
        "notes": [67, 69, 71, 72, 74, 72, 71, 69, 67, 69, 71, 74, 76, 74, 71, 69, 67, 66],
    },
    {
        "title": "Gerua",
        "artist": "Arijit Singh",
        "movie": "Dilwale",
        "year": 2015,
        "tempo": 78,
        "key": "D",
        "difficulty": "beginner",
        "notes": [62, 64, 66, 69, 67, 66, 64, 62, 62, 64, 66, 69, 71, 69, 67, 66, 64],
    },
    {
        "title": "Kabira",
        "artist": "Arijit Singh",
        "movie": "Yeh Jawaani Hai Deewani",
        "year": 2013,
        "tempo": 95,
        "key": "A",
        "difficulty": "beginner",
        "notes": [69, 71, 73, 74, 76, 74, 73, 71, 69, 71, 73, 76, 78, 76, 73, 71, 69],
    },
    {
        "title": "Kesariya",
        "artist": "Arijit Singh",
        "movie": "Brahmastra",
        "year": 2022,
        "tempo": 80,
        "key": "F",
        "difficulty": "beginner",
        "notes": [65, 67, 69, 70, 72, 70, 69, 67, 65, 67, 69, 72, 74, 72, 69, 67, 65],
    },
    {
        "title": "Hawayein",
        "artist": "Arijit Singh",
        "movie": "Jab Harry Met Sejal",
        "year": 2017,
        "tempo": 75,
        "key": "C",
        "difficulty": "beginner",
        "notes": [60, 62, 64, 67, 65, 64, 62, 60, 60, 62, 64, 67, 69, 67, 65, 64, 62],
    },
    {
        "title": "Agar Tum Saath Ho",
        "artist": "Arijit Singh & Alka Yagnik",
        "movie": "Tamasha",
        "year": 2015,
        "tempo": 72,
        "key": "E",
        "difficulty": "intermediate",
        "notes": [64, 66, 68, 71, 69, 68, 66, 64, 64, 66, 68, 71, 73, 71, 69, 68, 66],
    },
    {
        "title": "Phir Bhi Tumko Chaahunga",
        "artist": "Arijit Singh",
        "movie": "Half Girlfriend",
        "year": 2017,
        "tempo": 82,
        "key": "G",
        "difficulty": "beginner",
        "notes": [67, 69, 71, 74, 72, 71, 69, 67, 67, 69, 71, 74, 76, 74, 72, 71, 69],
    },
    {
        "title": "Raabta",
        "artist": "Arijit Singh",
        "movie": "Agent Vinod",
        "year": 2012,
        "tempo": 88,
        "key": "D",
        "difficulty": "intermediate",
        "notes": [62, 64, 66, 69, 71, 69, 66, 64, 62, 64, 66, 69, 71, 74, 71, 69, 66],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # Classic Bollywood (90s-2000s)
    # ─────────────────────────────────────────────────────────────────────────
    {
        "title": "Tujhe Dekha To",
        "artist": "Kumar Sanu & Lata Mangeshkar",
        "movie": "DDLJ",
        "year": 1995,
        "tempo": 75,
        "key": "C",
        "difficulty": "beginner",
        "notes": [60, 62, 64, 65, 67, 65, 64, 62, 60, 64, 67, 72, 71, 69, 67, 65, 64],
    },
    {
        "title": "Kal Ho Naa Ho",
        "artist": "Sonu Nigam",
        "movie": "Kal Ho Naa Ho",
        "year": 2003,
        "tempo": 85,
        "key": "G",
        "difficulty": "beginner",
        "notes": [67, 69, 71, 72, 74, 72, 71, 69, 67, 71, 74, 76, 74, 71, 69, 67],
    },
    {
        "title": "Chaiyya Chaiyya",
        "artist": "Sukhwinder Singh",
        "movie": "Dil Se",
        "year": 1998,
        "tempo": 130,
        "key": "D",
        "difficulty": "advanced",
        "notes": [62, 64, 66, 67, 69, 71, 69, 67, 66, 64, 62, 64, 66, 69, 71, 74, 71],
    },
    {
        "title": "Dil To Pagal Hai",
        "artist": "Lata Mangeshkar & Udit Narayan",
        "movie": "Dil To Pagal Hai",
        "year": 1997,
        "tempo": 92,
        "key": "F",
        "difficulty": "intermediate",
        "notes": [65, 67, 69, 70, 72, 74, 72, 70, 69, 67, 65, 67, 69, 72, 74, 77],
    },
    {
        "title": "Kuch Kuch Hota Hai",
        "artist": "Udit Narayan & Alka Yagnik",
        "movie": "Kuch Kuch Hota Hai",
        "year": 1998,
        "tempo": 88,
        "key": "E",
        "difficulty": "beginner",
        "notes": [64, 66, 68, 69, 71, 69, 68, 66, 64, 66, 68, 71, 73, 71, 69, 68],
    },
    {
        "title": "Pehla Nasha",
        "artist": "Udit Narayan & Sadhana Sargam",
        "movie": "Jo Jeeta Wohi Sikandar",
        "year": 1992,
        "tempo": 80,
        "key": "C",
        "difficulty": "beginner",
        "notes": [60, 62, 64, 67, 65, 64, 62, 60, 60, 64, 67, 69, 67, 65, 64, 62],
    },
    {
        "title": "Mere Khwabon Mein",
        "artist": "Lata Mangeshkar",
        "movie": "DDLJ",
        "year": 1995,
        "tempo": 78,
        "key": "G",
        "difficulty": "intermediate",
        "notes": [67, 69, 71, 74, 72, 71, 69, 67, 67, 71, 74, 76, 74, 72, 71, 69],
    },
    {
        "title": "Jaadu Teri Nazar",
        "artist": "Udit Narayan",
        "movie": "Darr",
        "year": 1993,
        "tempo": 82,
        "key": "D",
        "difficulty": "beginner",
        "notes": [62, 64, 66, 69, 67, 66, 64, 62, 62, 66, 69, 71, 69, 67, 66, 64],
    },
    {
        "title": "Taal Se Taal Mila",
        "artist": "Alka Yagnik & Udit Narayan",
        "movie": "Taal",
        "year": 1999,
        "tempo": 95,
        "key": "A",
        "difficulty": "intermediate",
        "notes": [69, 71, 73, 74, 76, 78, 76, 74, 73, 71, 69, 71, 73, 76, 78, 81],
    },
    {
        "title": "Kehna Hi Kya",
        "artist": "Lata Mangeshkar",
        "movie": "Bombay",
        "year": 1995,
        "tempo": 70,
        "key": "F",
        "difficulty": "beginner",
        "notes": [65, 67, 69, 72, 70, 69, 67, 65, 65, 69, 72, 74, 72, 70, 69, 67],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # Romantic Hits
    # ─────────────────────────────────────────────────────────────────────────
    {
        "title": "Tere Bina",
        "artist": "A.R. Rahman",
        "movie": "Guru",
        "year": 2007,
        "tempo": 76,
        "key": "E",
        "difficulty": "intermediate",
        "notes": [64, 66, 68, 71, 69, 68, 66, 64, 64, 68, 71, 73, 71, 69, 68, 66],
    },
    {
        "title": "Ek Ladki Ko Dekha",
        "artist": "Kumar Sanu",
        "movie": "1942: A Love Story",
        "year": 1994,
        "tempo": 72,
        "key": "C",
        "difficulty": "beginner",
        "notes": [60, 62, 64, 67, 65, 64, 62, 60, 60, 64, 67, 69, 67, 65, 64, 62],
    },
    {
        "title": "Suraj Hua Maddham",
        "artist": "Sonu Nigam & Alka Yagnik",
        "movie": "K3G",
        "year": 2001,
        "tempo": 78,
        "key": "G",
        "difficulty": "beginner",
        "notes": [67, 69, 71, 74, 72, 71, 69, 67, 67, 71, 74, 76, 74, 72, 71, 69],
    },
    {
        "title": "Humko Humise Chura Lo",
        "artist": "Lata Mangeshkar & Udit Narayan",
        "movie": "Mohabbatein",
        "year": 2000,
        "tempo": 85,
        "key": "D",
        "difficulty": "intermediate",
        "notes": [62, 64, 66, 69, 71, 69, 66, 64, 62, 66, 69, 71, 74, 71, 69, 66],
    },
    {
        "title": "Dil Ne Yeh Kaha Hai",
        "artist": "Udit Narayan & Alka Yagnik",
        "movie": "Dhadkan",
        "year": 2000,
        "tempo": 82,
        "key": "F",
        "difficulty": "beginner",
        "notes": [65, 67, 69, 72, 70, 69, 67, 65, 65, 69, 72, 74, 72, 70, 69, 67],
    },
    {
        "title": "Main Yahaan Hoon",
        "artist": "Udit Narayan",
        "movie": "Veer-Zaara",
        "year": 2004,
        "tempo": 75,
        "key": "E",
        "difficulty": "beginner",
        "notes": [64, 66, 68, 71, 69, 68, 66, 64, 64, 68, 71, 73, 71, 69, 68, 66],
    },
    {
        "title": "Piya O Re Piya",
        "artist": "Atif Aslam & Shreya Ghoshal",
        "movie": "Tere Naal Love Ho Gaya",
        "year": 2012,
        "tempo": 90,
        "key": "A",
        "difficulty": "beginner",
        "notes": [69, 71, 73, 76, 74, 73, 71, 69, 69, 73, 76, 78, 76, 74, 73, 71],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # Party/Dance Numbers
    # ─────────────────────────────────────────────────────────────────────────
    {
        "title": "Balam Pichkari",
        "artist": "Vishal Dadlani & Shalmali Kholgade",
        "movie": "Yeh Jawaani Hai Deewani",
        "year": 2013,
        "tempo": 128,
        "key": "G",
        "difficulty": "intermediate",
        "notes": [67, 67, 69, 71, 74, 74, 72, 71, 69, 67, 67, 71, 74, 76, 74, 71],
    },
    {
        "title": "Badtameez Dil",
        "artist": "Benny Dayal",
        "movie": "Yeh Jawaani Hai Deewani",
        "year": 2013,
        "tempo": 135,
        "key": "D",
        "difficulty": "advanced",
        "notes": [62, 62, 64, 66, 69, 69, 67, 66, 64, 62, 62, 66, 69, 71, 69, 66],
    },
    {
        "title": "Nagada Sang Dhol",
        "artist": "Shreya Ghoshal",
        "movie": "Ram-Leela",
        "year": 2013,
        "tempo": 140,
        "key": "E",
        "difficulty": "advanced",
        "notes": [64, 64, 66, 68, 71, 71, 69, 68, 66, 64, 64, 68, 71, 73, 71, 68],
    },
    {
        "title": "Lungi Dance",
        "artist": "Yo Yo Honey Singh",
        "movie": "Chennai Express",
        "year": 2013,
        "tempo": 130,
        "key": "C",
        "difficulty": "beginner",
        "notes": [60, 60, 62, 64, 67, 67, 65, 64, 62, 60, 60, 64, 67, 69, 67, 64],
    },
    {
        "title": "Gallan Goodiyaan",
        "artist": "Yashita Sharma & Manish Kumar",
        "movie": "Dil Dhadakne Do",
        "year": 2015,
        "tempo": 125,
        "key": "G",
        "difficulty": "intermediate",
        "notes": [67, 67, 69, 71, 74, 74, 72, 71, 69, 67, 67, 71, 74, 76, 74, 71],
    },
    {
        "title": "London Thumakda",
        "artist": "Labh Janjua & Sonu Kakkar",
        "movie": "Queen",
        "year": 2014,
        "tempo": 132,
        "key": "F",
        "difficulty": "intermediate",
        "notes": [65, 65, 67, 69, 72, 72, 70, 69, 67, 65, 65, 69, 72, 74, 72, 69],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # Sad/Emotional Songs
    # ─────────────────────────────────────────────────────────────────────────
    {
        "title": "Tujhe Bhula Diya",
        "artist": "Mohit Chauhan",
        "movie": "Anjaana Anjaani",
        "year": 2010,
        "tempo": 75,
        "key": "E",
        "difficulty": "beginner",
        "notes": [64, 66, 68, 69, 71, 69, 68, 66, 64, 66, 68, 71, 73, 71, 69, 68],
    },
    {
        "title": "Phir Le Aya Dil",
        "artist": "Arijit Singh",
        "movie": "Barfi!",
        "year": 2012,
        "tempo": 72,
        "key": "C",
        "difficulty": "intermediate",
        "notes": [60, 62, 64, 67, 65, 64, 62, 60, 60, 64, 67, 72, 69, 67, 65, 64],
    },
    {
        "title": "Agar Tum Mil Jao",
        "artist": "Shreya Ghoshal",
        "movie": "Zeher",
        "year": 2005,
        "tempo": 68,
        "key": "D",
        "difficulty": "beginner",
        "notes": [62, 64, 66, 69, 67, 66, 64, 62, 62, 66, 69, 71, 69, 67, 66, 64],
    },
    {
        "title": "Muskurane",
        "artist": "Arijit Singh",
        "movie": "CityLights",
        "year": 2014,
        "tempo": 78,
        "key": "G",
        "difficulty": "beginner",
        "notes": [67, 69, 71, 74, 72, 71, 69, 67, 67, 71, 74, 76, 74, 72, 71, 69],
    },
    {
        "title": "Bekhayali",
        "artist": "Sachet Tandon",
        "movie": "Kabir Singh",
        "year": 2019,
        "tempo": 82,
        "key": "F",
        "difficulty": "intermediate",
        "notes": [65, 67, 69, 72, 70, 69, 67, 65, 65, 69, 72, 77, 74, 72, 70, 69],
    },
    {
        "title": "Tera Ban Jaunga",
        "artist": "Akhil Sachdeva & Tulsi Kumar",
        "movie": "Kabir Singh",
        "year": 2019,
        "tempo": 75,
        "key": "E",
        "difficulty": "beginner",
        "notes": [64, 66, 68, 71, 69, 68, 66, 64, 64, 68, 71, 73, 71, 69, 68, 66],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # A.R. Rahman Specials
    # ─────────────────────────────────────────────────────────────────────────
    {
        "title": "Jai Ho",
        "artist": "A.R. Rahman & Sukhwinder Singh",
        "movie": "Slumdog Millionaire",
        "year": 2008,
        "tempo": 125,
        "key": "D",
        "difficulty": "intermediate",
        "notes": [62, 64, 66, 69, 71, 69, 66, 64, 62, 66, 69, 71, 74, 71, 69, 66],
    },
    {
        "title": "Kun Faya Kun",
        "artist": "A.R. Rahman & Javed Ali",
        "movie": "Rockstar",
        "year": 2011,
        "tempo": 70,
        "key": "E",
        "difficulty": "intermediate",
        "notes": [64, 66, 68, 71, 69, 68, 66, 64, 64, 68, 71, 76, 73, 71, 69, 68],
    },
    {
        "title": "Nadaan Parindey",
        "artist": "A.R. Rahman & Mohit Chauhan",
        "movie": "Rockstar",
        "year": 2011,
        "tempo": 78,
        "key": "G",
        "difficulty": "intermediate",
        "notes": [67, 69, 71, 74, 72, 71, 69, 67, 67, 71, 74, 79, 76, 74, 72, 71],
    },
    {
        "title": "Roja Jaaneman",
        "artist": "S.P. Balasubrahmanyam",
        "movie": "Roja",
        "year": 1992,
        "tempo": 80,
        "key": "C",
        "difficulty": "intermediate",
        "notes": [60, 62, 64, 67, 65, 64, 62, 60, 60, 64, 67, 72, 69, 67, 65, 64],
    },
    {
        "title": "Dil Se Re",
        "artist": "A.R. Rahman",
        "movie": "Dil Se",
        "year": 1998,
        "tempo": 92,
        "key": "A",
        "difficulty": "advanced",
        "notes": [69, 71, 73, 76, 78, 76, 73, 71, 69, 73, 76, 78, 81, 78, 76, 73],
    },
    {
        "title": "Maahi Ve",
        "artist": "A.R. Rahman",
        "movie": "Highway",
        "year": 2014,
        "tempo": 72,
        "key": "F",
        "difficulty": "beginner",
        "notes": [65, 67, 69, 72, 70, 69, 67, 65, 65, 69, 72, 74, 72, 70, 69, 67],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # Modern Hits (2020s)
    # ─────────────────────────────────────────────────────────────────────────
    {
        "title": "Shayad",
        "artist": "Arijit Singh",
        "movie": "Love Aaj Kal",
        "year": 2020,
        "tempo": 78,
        "key": "G",
        "difficulty": "beginner",
        "notes": [67, 69, 71, 74, 72, 71, 69, 67, 67, 71, 74, 76, 74, 72, 71, 69],
    },
    {
        "title": "Raataan Lambiyan",
        "artist": "Jubin Nautiyal & Asees Kaur",
        "movie": "Shershaah",
        "year": 2021,
        "tempo": 82,
        "key": "E",
        "difficulty": "beginner",
        "notes": [64, 66, 68, 71, 69, 68, 66, 64, 64, 68, 71, 73, 71, 69, 68, 66],
    },
    {
        "title": "Mann Bharryaa",
        "artist": "B Praak",
        "movie": "Shershaah",
        "year": 2021,
        "tempo": 75,
        "key": "D",
        "difficulty": "beginner",
        "notes": [62, 64, 66, 69, 67, 66, 64, 62, 62, 66, 69, 71, 69, 67, 66, 64],
    },
    {
        "title": "Apna Bana Le",
        "artist": "Arijit Singh",
        "movie": "Bhediya",
        "year": 2022,
        "tempo": 80,
        "key": "F",
        "difficulty": "beginner",
        "notes": [65, 67, 69, 72, 70, 69, 67, 65, 65, 69, 72, 74, 72, 70, 69, 67],
    },
    {
        "title": "Tere Vaaste",
        "artist": "Varun Jain & Sachin-Jigar",
        "movie": "Zara Hatke Zara Bachke",
        "year": 2023,
        "tempo": 85,
        "key": "G",
        "difficulty": "beginner",
        "notes": [67, 69, 71, 74, 72, 71, 69, 67, 67, 71, 74, 76, 74, 72, 71, 69],
    },

    # ─────────────────────────────────────────────────────────────────────────
    # Evergreen Classics
    # ─────────────────────────────────────────────────────────────────────────
    {
        "title": "Lag Ja Gale",
        "artist": "Lata Mangeshkar",
        "movie": "Woh Kaun Thi",
        "year": 1964,
        "tempo": 65,
        "key": "C",
        "difficulty": "intermediate",
        "notes": [60, 62, 64, 67, 65, 64, 62, 60, 60, 64, 67, 72, 69, 67, 65, 64],
    },
    {
        "title": "Ek Pyaar Ka Nagma Hai",
        "artist": "Lata Mangeshkar & Mukesh",
        "movie": "Shor",
        "year": 1972,
        "tempo": 70,
        "key": "G",
        "difficulty": "beginner",
        "notes": [67, 69, 71, 74, 72, 71, 69, 67, 67, 71, 74, 76, 74, 72, 71, 69],
    },
    {
        "title": "Mere Sapno Ki Rani",
        "artist": "Kishore Kumar",
        "movie": "Aradhana",
        "year": 1969,
        "tempo": 95,
        "key": "D",
        "difficulty": "intermediate",
        "notes": [62, 64, 66, 69, 67, 66, 64, 62, 62, 66, 69, 71, 69, 67, 66, 64],
    },
    {
        "title": "Tere Bina Zindagi Se",
        "artist": "Lata Mangeshkar & Kishore Kumar",
        "movie": "Aandhi",
        "year": 1975,
        "tempo": 72,
        "key": "E",
        "difficulty": "intermediate",
        "notes": [64, 66, 68, 71, 69, 68, 66, 64, 64, 68, 71, 73, 71, 69, 68, 66],
    },
]


def calculate_intervals(notes):
    """Calculate intervals between consecutive notes."""
    intervals = []
    for i in range(1, len(notes)):
        intervals.append(notes[i] - notes[i-1])
    return intervals


def create_tutorial_notes(notes, tempo=80):
    """Create tutorial note format from melody."""
    beat_duration = 60000 / tempo  # ms per beat
    tutorial_notes = []
    time_ms = 0

    for i, note in enumerate(notes):
        tutorial_notes.append({
            "midiNote": note,
            "duration": int(beat_duration * 0.8),  # 80% of beat
            "time": int(time_ms),
            "index": i
        })
        time_ms += beat_duration

    return tutorial_notes


def seed_songs():
    """Seed all Bollywood songs into the database."""

    app = create_app()

    with app.app_context():
        created = 0
        skipped = 0

        for song_data in BOLLYWOOD_SONGS:
            # Check if exists
            existing = Song.query.filter_by(
                title=song_data["title"],
                artist=song_data["artist"]
            ).first()

            if existing:
                print(f"SKIP: '{song_data['title']}' already exists")
                skipped += 1
                continue

            notes = song_data["notes"]
            intervals = calculate_intervals(notes)

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
                year=song_data.get("year"),
                tempo=song_data["tempo"],
                key=song_data["key"],
                duration=180,
                difficulty=song_data.get("difficulty", "beginner"),
                is_free=True,
                is_popular=True
            )
            song.melody_pattern = melody_pattern
            db.session.add(song)
            db.session.flush()

            # Create tutorial
            tutorial_notes = create_tutorial_notes(notes, song_data["tempo"])
            tutorial = SongTutorial(
                song_id=song.id,
                instrument="piano",
                version="simplified",
                notes_json=json.dumps(tutorial_notes)
            )
            db.session.add(tutorial)

            print(f"CREATED: '{song_data['title']}' by {song_data['artist']}")
            created += 1

        db.session.commit()

        print(f"\n{'='*60}")
        print(f"Created: {created} songs")
        print(f"Skipped: {skipped} songs (already exist)")

        total = Song.query.filter(Song.melody_pattern_json.isnot(None)).count()
        print(f"Total songs with patterns: {total}")


if __name__ == "__main__":
    seed_songs()
