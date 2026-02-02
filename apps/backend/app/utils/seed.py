"""
Database Seeding

Populate database with sample data for development.
"""

import json
from ..extensions import db
from ..models import LessonModule, Lesson, Song, SongTutorial, Achievement


# Note name to semitone mapping (C=0, C#=1, D=2, etc.)
NOTE_MAP = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'Fb': 4, 'E#': 5,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11, 'Cb': 11, 'B#': 0,
}


def parse_note_to_midi(note_str: str, default_octave: int = 4) -> int:
    """Convert a note string like 'C', 'C#', 'D#' to MIDI number."""
    note_str = note_str.strip().upper()

    # Handle sharp notation
    if len(note_str) >= 2 and note_str[1] == '#':
        note_name = note_str[:2]
        octave = default_octave
    elif len(note_str) >= 2 and note_str[1] == 'B':
        # Handle flat (B as in Bb)
        note_name = note_str[0] + 'b'
        octave = default_octave
    else:
        note_name = note_str[0]
        octave = default_octave

    if note_name not in NOTE_MAP:
        # Try just first character
        note_name = note_str[0]

    semitone = NOTE_MAP.get(note_name, 0)
    return (octave + 1) * 12 + semitone


def parse_notation_line(line: str, default_octave: int = 4) -> list:
    """Parse a notation line like 'C C C G C G C C C C' into MIDI notes."""
    notes = []
    # Split by spaces and filter empty strings
    tokens = [t.strip() for t in line.split() if t.strip()]

    for token in tokens:
        # Skip non-note tokens
        if not token or token[0] not in 'ABCDEFG':
            continue

        midi = parse_note_to_midi(token, default_octave)
        notes.append(midi)

    return notes


def notes_to_tutorial_format(midi_notes: list, note_spacing: int = 600) -> list:
    """Convert a list of MIDI notes to tutorial format with timing."""
    return [
        {"midiNote": note, "startTime": i * note_spacing, "duration": note_spacing - 100}
        for i, note in enumerate(midi_notes)
    ]


def notes_with_durations_to_tutorial(notes_data: list) -> list:
    """
    Convert notes with explicit durations to tutorial format.
    notes_data: list of tuples (midi_note, duration_ms)
    Returns notes with proper startTime based on cumulative durations.
    """
    result = []
    current_time = 0
    for midi_note, duration in notes_data:
        result.append({
            "midiNote": midi_note,
            "startTime": current_time,
            "duration": int(duration * 0.9)  # Slight gap between notes
        })
        current_time += duration
    return result


def create_melody_pattern(notes_data: list, tempo: int = 120, key: str = "C") -> dict:
    """
    Create melody pattern from notes data for song recognition.
    notes_data: list of tuples (midi_note, duration_ms)
    Returns pattern with intervals and notes.
    """
    midi_notes = [n[0] for n in notes_data]
    intervals = []
    for i in range(1, len(midi_notes)):
        intervals.append(midi_notes[i] - midi_notes[i-1])
    return {
        "intervals": intervals,
        "notes": midi_notes[:20],  # First 20 notes for recognition
        "tempo": tempo,
        "key": key
    }


def seed_database():
    """Seed the database with sample data."""

    # Clear existing data
    SongTutorial.query.delete()
    Song.query.delete()
    Lesson.query.delete()
    LessonModule.query.delete()
    Achievement.query.delete()
    db.session.commit()

    # Seed achievements first
    seed_achievements()

    # Create lesson modules
    modules = [
        {
            "title": "Piano Basics",
            "title_hindi": "पियानो की मूल बातें",
            "description": "Learn the fundamentals of piano playing",
            "instrument": "piano",
            "skill_level": "beginner",
            "order": 1,
        },
        {
            "title": "Reading Music",
            "title_hindi": "संगीत पढ़ना",
            "description": "Learn to read musical notation",
            "instrument": "piano",
            "skill_level": "beginner",
            "order": 2,
        },
        {
            "title": "Chord Progressions",
            "title_hindi": "कॉर्ड प्रोग्रेशन",
            "description": "Master common chord progressions",
            "instrument": "piano",
            "skill_level": "intermediate",
            "order": 3,
        },
    ]

    created_modules = []
    for m in modules:
        module = LessonModule(**m)
        db.session.add(module)
        created_modules.append(module)

    db.session.flush()

    # Create lessons
    lessons = [
        # Module 1: Piano Basics
        {
            "title": "Meet the Piano",
            "title_hindi": "पियानो से मिलिए",
            "description": "Introduction to the piano keyboard",
            "instrument": "piano",
            "skill_level": "beginner",
            "duration_minutes": 10,
            "order": 1,
            "module_id": created_modules[0].id,
            "sections_json": json.dumps([
                {"id": "1", "title": "The Keyboard Layout", "type": "theory", "order": 1},
                {"id": "2", "title": "Finding Middle C", "type": "practice", "order": 2},
                {"id": "3", "title": "Your First Notes", "type": "exercise", "order": 3},
            ]),
        },
        {
            "title": "Finger Positioning",
            "title_hindi": "उंगलियों की स्थिति",
            "description": "Learn proper hand and finger placement",
            "instrument": "piano",
            "skill_level": "beginner",
            "duration_minutes": 15,
            "order": 2,
            "module_id": created_modules[0].id,
            "sections_json": json.dumps([
                {"id": "1", "title": "Hand Position", "type": "video", "order": 1},
                {"id": "2", "title": "Finger Numbers", "type": "theory", "order": 2},
                {"id": "3", "title": "Practice Exercise", "type": "exercise", "order": 3},
            ]),
        },
        {
            "title": "Playing C Major Scale",
            "title_hindi": "C मेजर स्केल बजाना",
            "description": "Master your first scale",
            "instrument": "piano",
            "skill_level": "beginner",
            "duration_minutes": 15,
            "order": 3,
            "module_id": created_modules[0].id,
            "sections_json": json.dumps([
                {"id": "1", "title": "Scale Basics", "type": "theory", "order": 1},
                {"id": "2", "title": "Right Hand Practice", "type": "exercise", "order": 2},
                {"id": "3", "title": "Left Hand Practice", "type": "exercise", "order": 3},
                {"id": "4", "title": "Both Hands Together", "type": "exercise", "order": 4},
            ]),
        },
        # Module 2: Reading Music
        {
            "title": "Understanding Staff Notation",
            "title_hindi": "स्टाफ नोटेशन समझना",
            "description": "Learn the basics of reading sheet music",
            "instrument": "piano",
            "skill_level": "beginner",
            "duration_minutes": 12,
            "order": 1,
            "module_id": created_modules[1].id,
            "sections_json": json.dumps([
                {"id": "1", "title": "The Staff Lines", "type": "theory", "order": 1},
                {"id": "2", "title": "Treble and Bass Clef", "type": "theory", "order": 2},
                {"id": "3", "title": "Note Recognition Quiz", "type": "exercise", "order": 3},
            ]),
        },
        {
            "title": "Note Values & Rhythm",
            "title_hindi": "नोट मान और ताल",
            "description": "Learn about whole, half, and quarter notes",
            "instrument": "piano",
            "skill_level": "beginner",
            "duration_minutes": 15,
            "order": 2,
            "module_id": created_modules[1].id,
            "sections_json": json.dumps([
                {"id": "1", "title": "Note Duration", "type": "theory", "order": 1},
                {"id": "2", "title": "Time Signatures", "type": "theory", "order": 2},
                {"id": "3", "title": "Rhythm Practice", "type": "exercise", "order": 3},
            ]),
        },
        {
            "title": "Reading Simple Melodies",
            "title_hindi": "सरल धुन पढ़ना",
            "description": "Put it all together and read your first melody",
            "instrument": "piano",
            "skill_level": "beginner",
            "duration_minutes": 18,
            "order": 3,
            "module_id": created_modules[1].id,
            "sections_json": json.dumps([
                {"id": "1", "title": "Reading Practice", "type": "theory", "order": 1},
                {"id": "2", "title": "Play What You See", "type": "exercise", "order": 2},
                {"id": "3", "title": "Melody Challenge", "type": "exercise", "order": 3},
            ]),
        },
        # Module 3: Chord Progressions
        {
            "title": "Introduction to Chords",
            "title_hindi": "कॉर्ड्स का परिचय",
            "description": "Learn what chords are and how they work",
            "instrument": "piano",
            "skill_level": "intermediate",
            "duration_minutes": 15,
            "order": 1,
            "module_id": created_modules[2].id,
            "sections_json": json.dumps([
                {"id": "1", "title": "What is a Chord?", "type": "theory", "order": 1},
                {"id": "2", "title": "Major vs Minor", "type": "theory", "order": 2},
                {"id": "3", "title": "Play C, F, G Chords", "type": "exercise", "order": 3},
            ]),
        },
        {
            "title": "Common Bollywood Progressions",
            "title_hindi": "आम बॉलीवुड प्रोग्रेशन",
            "description": "Learn chord patterns used in hit songs",
            "instrument": "piano",
            "skill_level": "intermediate",
            "duration_minutes": 20,
            "order": 2,
            "module_id": created_modules[2].id,
            "sections_json": json.dumps([
                {"id": "1", "title": "The I-V-vi-IV Progression", "type": "theory", "order": 1},
                {"id": "2", "title": "Practice with Tum Hi Ho", "type": "exercise", "order": 2},
                {"id": "3", "title": "Create Your Own", "type": "exercise", "order": 3},
            ]),
        },
        {
            "title": "Adding Melody to Chords",
            "title_hindi": "कॉर्ड्स में मेलोडी जोड़ना",
            "description": "Combine chords with melody for full songs",
            "instrument": "piano",
            "skill_level": "intermediate",
            "duration_minutes": 25,
            "order": 3,
            "module_id": created_modules[2].id,
            "sections_json": json.dumps([
                {"id": "1", "title": "Left Hand Chords", "type": "theory", "order": 1},
                {"id": "2", "title": "Right Hand Melody", "type": "theory", "order": 2},
                {"id": "3", "title": "Full Song Practice", "type": "exercise", "order": 3},
            ]),
        },
    ]

    for l in lessons:
        lesson = Lesson(**l)
        db.session.add(lesson)

    # =====================================
    # BOLLYWOOD SONGS WITH REAL NOTATIONS
    # =====================================

    songs_data = [
        # 1. Labon Ko (Bhool Bhulaiyaa) - Easy
        {
            "title": "Labon Ko",
            "title_hindi": "लबों को",
            "artist": "KK",
            "movie": "Bhool Bhulaiyaa",
            "year": 2007,
            "tempo": 85,
            "key": "Am",
            "duration": 285,
            "genre": "romantic",
            "difficulty": "beginner",
            "is_popular": True,
            "is_free": True,
        },
        # 2. Suraj Hua Maddham (K3G) - Medium
        {
            "title": "Suraj Hua Maddham",
            "title_hindi": "सूरज हुआ मद्धम",
            "artist": "Sonu Nigam, Alka Yagnik",
            "movie": "Kabhi Khushi Kabhie Gham",
            "year": 2001,
            "tempo": 75,
            "key": "Am",
            "duration": 485,
            "genre": "romantic",
            "difficulty": "beginner",
            "is_popular": True,
            "is_free": True,
        },
        # 3. Oh Oh Jane Jaana - Easy
        {
            "title": "Oh Oh Jane Jaana",
            "title_hindi": "ओ ओ जाने जाना",
            "artist": "Kamaal Khan",
            "movie": "Pyaar Kiya To Darna Kya",
            "year": 1998,
            "tempo": 120,
            "key": "Am",
            "duration": 295,
            "genre": "retro",
            "difficulty": "beginner",
            "is_popular": True,
            "is_free": True,
        },
        # 4. Aashiqui 2 Theme - Medium
        {
            "title": "Aashiqui 2 Theme",
            "title_hindi": "आशिकी 2 थीम",
            "artist": "Instrumental",
            "movie": "Aashiqui 2",
            "year": 2013,
            "tempo": 70,
            "key": "Fm",
            "duration": 180,
            "genre": "romantic",
            "difficulty": "intermediate",
            "is_popular": True,
            "is_free": False,
        },
        # 5. O Maahi (Dunki)
        {
            "title": "O Maahi",
            "title_hindi": "ओ माही",
            "artist": "Arijit Singh",
            "movie": "Dunki",
            "year": 2023,
            "tempo": 80,
            "key": "C#",
            "duration": 245,
            "genre": "romantic",
            "difficulty": "intermediate",
            "is_popular": True,
            "is_free": False,
        },
        # 6. Saari Duniya Jala Denge (Animal)
        {
            "title": "Saari Duniya Jala Denge",
            "title_hindi": "सारी दुनिया जला देंगे",
            "artist": "Arijit Singh",
            "movie": "Animal",
            "year": 2023,
            "tempo": 95,
            "key": "C",
            "duration": 320,
            "genre": "romantic",
            "difficulty": "intermediate",
            "is_popular": True,
            "is_free": False,
        },
        # 7. Tum Jo Aaye Zindagi Mein
        {
            "title": "Tum Jo Aaye Zindagi Mein",
            "title_hindi": "तुम जो आए जिंदगी में",
            "artist": "Rahat Fateh Ali Khan, Tulsi Kumar",
            "movie": "Once Upon a Time in Mumbaai",
            "year": 2010,
            "tempo": 78,
            "key": "E",
            "duration": 295,
            "genre": "romantic",
            "difficulty": "beginner",
            "is_popular": True,
            "is_free": True,
        },
        # 8. Pehle Bhi Main (Animal)
        {
            "title": "Pehle Bhi Main",
            "title_hindi": "पहले भी मैं",
            "artist": "Vishal Mishra",
            "movie": "Animal",
            "year": 2023,
            "tempo": 72,
            "key": "A#m",
            "duration": 268,
            "genre": "romantic",
            "difficulty": "intermediate",
            "is_popular": True,
            "is_free": False,
        },
        # 9. Tumse Milke Dil Ka (DDLJ)
        {
            "title": "Tumse Milke Dil Ka",
            "title_hindi": "तुमसे मिलके दिल का",
            "artist": "Kumar Sanu, Alka Yagnik",
            "movie": "Main Hoon Na",
            "year": 2004,
            "tempo": 130,
            "key": "D#m",
            "duration": 310,
            "genre": "retro",
            "difficulty": "intermediate",
            "is_popular": True,
            "is_free": False,
        },
        # 10. Satranga (Animal)
        {
            "title": "Satranga",
            "title_hindi": "सतरंगा",
            "artist": "Arijit Singh",
            "movie": "Animal",
            "year": 2023,
            "tempo": 85,
            "key": "C",
            "duration": 285,
            "genre": "romantic",
            "difficulty": "beginner",
            "is_popular": True,
            "is_free": True,
        },
        # 11. Gulabi Aankhen (The Train)
        {
            "title": "Gulabi Aankhen",
            "title_hindi": "गुलाबी आंखें",
            "artist": "Mohammed Rafi",
            "movie": "The Train",
            "year": 1970,
            "tempo": 120,
            "key": "Am",
            "duration": 285,
            "genre": "retro",
            "difficulty": "beginner",
            "is_popular": True,
            "is_free": True,
        },
        # 12. Tum Hi Ho (Aashiqui 2)
        {
            "title": "Tum Hi Ho",
            "title_hindi": "तुम ही हो",
            "artist": "Arijit Singh",
            "movie": "Aashiqui 2",
            "year": 2013,
            "tempo": 75,
            "key": "G#m",
            "duration": 320,
            "genre": "romantic",
            "difficulty": "beginner",
            "is_popular": True,
            "is_free": True,
        },
        # 13. Chura Liya Hai Tumne (Yaadon Ki Baaraat)
        {
            "title": "Chura Liya Hai Tumne",
            "title_hindi": "चुरा लिया है तुमने",
            "artist": "Asha Bhosle, Mohammed Rafi",
            "movie": "Yaadon Ki Baaraat",
            "year": 1973,
            "tempo": 100,
            "key": "Em",
            "duration": 310,
            "genre": "retro",
            "difficulty": "intermediate",
            "is_popular": True,
            "is_free": False,
        },
        # 14. Kal Ho Naa Ho (Title Track)
        {
            "title": "Kal Ho Naa Ho",
            "title_hindi": "कल हो ना हो",
            "artist": "Sonu Nigam",
            "movie": "Kal Ho Naa Ho",
            "year": 2003,
            "tempo": 90,
            "key": "C",
            "duration": 340,
            "genre": "romantic",
            "difficulty": "intermediate",
            "is_popular": True,
            "is_free": False,
        },
        # 15. Pani Da Rang (Vicky Donor)
        {
            "title": "Pani Da Rang",
            "title_hindi": "पानी दा रंग",
            "artist": "Ayushmann Khurrana",
            "movie": "Vicky Donor",
            "year": 2012,
            "tempo": 85,
            "key": "Em",
            "duration": 275,
            "genre": "romantic",
            "difficulty": "beginner",
            "is_popular": True,
            "is_free": True,
        },
    ]

    created_songs = []
    for s in songs_data:
        song = Song(**s)
        db.session.add(song)
        created_songs.append(song)

    db.session.flush()

    # =====================================
    # SONG TUTORIALS WITH REAL NOTATIONS
    # Using (midi_note, duration_ms) format for musical accuracy
    # =====================================

    # 1. Labon Ko (Bhool Bhulaiyaa) - Accurate notation
    # Key: Am, Tempo: ~85 BPM (beat = 706ms)
    # "Labon ko labon pe sajao" melody in octave 4-5
    labon_ko_notes = [
        # "La-bon ko" - B4 B4 C5
        (71, 350), (71, 350), (72, 700),
        # "la-bon pe" - A4 A4 B4
        (69, 350), (69, 350), (71, 700),
        # "sa-ja-o" - G4 G4 A4
        (67, 350), (67, 350), (69, 700),
        # Rest
        (67, 350),
        # "Kya ho tum" - B4 D5 C5
        (71, 350), (74, 350), (72, 700),
        # "mu-jhe ab" - A4 A4 B4
        (69, 350), (69, 350), (71, 700),
        # "ba-ta-o" - G4 G4 A4
        (67, 350), (67, 350), (69, 700),
        # "Todh do khud ko" - F4 E4 B4 F4
        (65, 500), (64, 500), (71, 500), (65, 500),
        # "tum" - E4 C5
        (64, 500), (72, 1000),
        # "Ban-hon mein" - D5 C5 B4
        (74, 500), (72, 500), (71, 700),
        # "me-ri" - C5 B4
        (72, 500), (71, 700),
    ]
    labon_ko_tutorial = notes_with_durations_to_tutorial(labon_ko_notes)

    tutorial1 = SongTutorial(
        song_id=created_songs[0].id,
        instrument="piano",
        version="simplified",
        notes_json=json.dumps(labon_ko_tutorial),
        sections_json=json.dumps([
            {"id": "verse1", "name": "Verse 1", "startTime": 0, "endTime": 30000, "startNote": 0, "endNote": len(labon_ko_notes)},
        ]),
        chords_json=json.dumps([
            {"chord": "Am", "startTime": 0, "duration": 8000},
            {"chord": "G", "startTime": 8000, "duration": 8000},
            {"chord": "F", "startTime": 16000, "duration": 8000},
        ])
    )
    db.session.add(tutorial1)

    # 2. Suraj Hua Maddham (K3G) - Accurate notation
    # Key: Am, Tempo: ~75 BPM (beat = 800ms), slow romantic ballad
    suraj_hua_notes = [
        # "Su-raj hua mad-dham" - E4 A4 A4 E4 G4 E4
        (64, 600), (69, 400), (69, 400), (64, 400), (67, 400), (64, 800),
        # "Chaand jal-ne la-ga" - A4 B4 C5 B4 A4 B4 G4
        (69, 400), (71, 400), (72, 400), (71, 400), (69, 400), (71, 400), (67, 800),
        # "Aas-maan yeh haay" - E4 A4 E4 G4 G4 E4
        (64, 600), (69, 400), (64, 400), (67, 400), (67, 400), (64, 800),
        # "Kyon pigh-al-ne la-ga" - A4 B4 C5 B4 A4 B4 G4
        (69, 400), (71, 400), (72, 400), (71, 400), (69, 400), (71, 400), (67, 800),
        # "Main theh-ra ra-ha" - A4 A4 A4 G4 A4
        (69, 500), (69, 500), (69, 500), (67, 500), (69, 800),
        # "Za-meen chal-ne la-gi" - B4 B4 G4 E4 G4 A4 A4
        (71, 400), (71, 400), (67, 400), (64, 400), (67, 400), (69, 400), (69, 800),
    ]
    suraj_hua_tutorial = notes_with_durations_to_tutorial(suraj_hua_notes)

    tutorial2 = SongTutorial(
        song_id=created_songs[1].id,
        instrument="piano",
        version="simplified",
        notes_json=json.dumps(suraj_hua_tutorial),
        sections_json=json.dumps([
            {"id": "verse1", "name": "Verse", "startTime": 0, "endTime": 60000, "startNote": 0, "endNote": len(suraj_hua_notes)},
        ]),
        chords_json=json.dumps([
            {"chord": "Am", "startTime": 0, "duration": 8000},
            {"chord": "G", "startTime": 8000, "duration": 8000},
            {"chord": "Am", "startTime": 16000, "duration": 8000},
        ])
    )
    db.session.add(tutorial2)

    # 3. Oh Oh Jane Jaana - Upbeat retro track
    # Key: Am, Tempo: ~120 BPM (beat = 500ms)
    oh_jane_notes = [
        # "O O" - C5 C5
        (72, 400), (72, 400),
        # "jaa-ne jaa-na" - B4 A4 B4 C5
        (71, 300), (69, 300), (71, 300), (72, 600),
        # "Dhoon-dhe tu-jhe" - D5 D5 B4 A4
        (74, 300), (74, 300), (71, 300), (69, 300),
        # "dee-waa-na" - B4 A4 G4
        (71, 300), (69, 300), (67, 600),
        # "Sap-non mein roz" - G4 G4 B4 B4
        (67, 300), (67, 300), (71, 300), (71, 300),
        # "aa-ye" - B4 B4
        (71, 400), (71, 400),
        # "Aa zin-da-gi mein" - E4 E4 C5 C5
        (64, 300), (64, 300), (72, 300), (72, 300),
        # "aa na" - C5 C5 B4 A4
        (72, 300), (72, 300), (71, 300), (69, 500),
        # "Me-re khaab me-re" - A4 E4 C5 A4
        (69, 300), (64, 300), (72, 300), (69, 300),
        # "kha-ya-lon ki ra-ni" - D5 B4 G4 G4 A4 B4 B4 A4
        (74, 250), (71, 250), (67, 250), (67, 250), (69, 250), (71, 250), (71, 250), (69, 500),
    ]
    oh_jane_tutorial = notes_with_durations_to_tutorial(oh_jane_notes)

    tutorial3 = SongTutorial(
        song_id=created_songs[2].id,
        instrument="piano",
        version="simplified",
        notes_json=json.dumps(oh_jane_tutorial),
        sections_json=json.dumps([
            {"id": "chorus", "name": "Chorus", "startTime": 0, "endTime": 45000, "startNote": 0, "endNote": len(oh_jane_notes)},
        ]),
        chords_json=json.dumps([
            {"chord": "Am", "startTime": 0, "duration": 6000},
            {"chord": "G", "startTime": 6000, "duration": 6000},
            {"chord": "Em", "startTime": 12000, "duration": 6000},
            {"chord": "Am", "startTime": 18000, "duration": 6000},
        ])
    )
    db.session.add(tutorial3)

    # 4. Aashiqui 2 Theme (Instrumental) - Slow, emotional
    # Key: Fm, Tempo: ~70 BPM (beat = 857ms)
    aashiqui_notes = [
        # Theme opening - F4 G4 G#4 (ascending)
        (65, 700), (67, 700), (68, 1000),
        # F4 G4 G#4 C#5 (rising)
        (65, 700), (67, 700), (68, 500), (73, 1200),
        # C#5 C#5 C5 C#5 (emotional peak)
        (73, 500), (73, 500), (72, 500), (73, 1000),
        # D#4 F4 G4 (descending phrase)
        (63, 700), (65, 700), (67, 1000),
        # D#4 F4 G4 C#5 (rising again)
        (63, 700), (65, 700), (67, 500), (73, 1200),
        # C#5 C5 C5 A#4 C5 (gentle descent)
        (73, 500), (72, 500), (72, 500), (70, 500), (72, 1000),
        # Resolution: G4 G4 E4 E4 C4 C4 C#4 C4
        (67, 600), (67, 600), (64, 600), (64, 600),
        (60, 600), (60, 600), (61, 600), (60, 1200),
    ]
    aashiqui_tutorial = notes_with_durations_to_tutorial(aashiqui_notes)

    tutorial4 = SongTutorial(
        song_id=created_songs[3].id,
        instrument="piano",
        version="simplified",
        notes_json=json.dumps(aashiqui_tutorial),
        sections_json=json.dumps([
            {"id": "theme", "name": "Main Theme", "startTime": 0, "endTime": 50000, "startNote": 0, "endNote": len(aashiqui_notes)},
        ]),
        chords_json=json.dumps([
            {"chord": "Fm", "startTime": 0, "duration": 8000},
            {"chord": "C#", "startTime": 8000, "duration": 8000},
            {"chord": "D#", "startTime": 16000, "duration": 8000},
            {"chord": "Cm", "startTime": 24000, "duration": 8000},
        ])
    )
    db.session.add(tutorial4)

    # 5. O Maahi (Dunki) - Arijit Singh romantic
    # Key: C#, Tempo: ~80 BPM (beat = 750ms)
    o_maahi_notes = [
        # "O Maa-hi" - G#4 G#4 A#4
        (68, 500), (68, 500), (70, 800),
        # "O Maa-hi" - G#4 G#4 A#4
        (68, 500), (68, 500), (70, 800),
        # "Me-ri wa-fa pe" - C5 C5 C5 D#5
        (72, 400), (72, 400), (72, 400), (75, 600),
        # "ya-keen kar le tu" - F4 F#4 F4 D#4 F4
        (65, 400), (66, 400), (65, 400), (63, 400), (65, 600),
        # "C#4 C4 A#4 C#4" (instrumental)
        (61, 500), (60, 500), (70, 500), (61, 800),
        # "Baa-ton ko beh-ne do" - G#4 C4 C#4 G#4
        (68, 500), (60, 400), (61, 400), (68, 600),
        # "C4 C#4" (ending phrase)
        (60, 400), (61, 800),
        # "Baa-hon mein reh-ne do" - G#4 C4 C#4 G#4
        (68, 500), (60, 400), (61, 400), (68, 600),
        # "C4 C#4" (ending)
        (60, 400), (61, 800),
    ]
    o_maahi_tutorial = notes_with_durations_to_tutorial(o_maahi_notes)

    tutorial5 = SongTutorial(
        song_id=created_songs[4].id,
        instrument="piano",
        version="simplified",
        notes_json=json.dumps(o_maahi_tutorial),
        sections_json=json.dumps([
            {"id": "chorus", "name": "Chorus", "startTime": 0, "endTime": 45000, "startNote": 0, "endNote": len(o_maahi_notes)},
        ]),
        chords_json=json.dumps([
            {"chord": "C#", "startTime": 0, "duration": 8000},
            {"chord": "G#", "startTime": 8000, "duration": 8000},
            {"chord": "F#", "startTime": 16000, "duration": 8000},
        ])
    )
    db.session.add(tutorial5)

    # 6. Saari Duniya Jala Denge (Animal) - Arijit Singh
    # Key: C, Tempo: ~95 BPM (beat = 632ms)
    saari_duniya_notes = [
        # Intro: C4 C4 C4 G4 C4 G4
        (60, 400), (60, 400), (60, 400), (67, 600),
        (60, 400), (67, 600),
        # "Saa-ri du-ni-ya" - C4 E4 D4 C4
        (60, 400), (64, 400), (62, 400), (60, 600),
        # "ja-la den-ge" - A4 C4
        (69, 500), (60, 800),
        # "Ho-o-o" - C4 E4 E4 F4
        (60, 400), (64, 400), (64, 400), (65, 500),
        # "A4 G4 F4" (melodic descent)
        (69, 400), (67, 400), (65, 600),
        # "Ho badd-la ne meeh pa-ya" - C4 C4 D4 G4 F4 E4
        (60, 300), (60, 300), (62, 400), (67, 400), (65, 400), (64, 400),
        # "F4 E4 D4 C4" (phrase end)
        (65, 300), (64, 300), (62, 300), (60, 600),
        # "D4 D4 E4 C4" (continuation)
        (62, 400), (62, 400), (64, 400), (60, 600),
        # "Ajj rab-ba o-hi din aa-ya" - G4 G4 A4 C4 D4 D4
        (67, 300), (67, 300), (69, 400), (60, 400), (62, 400), (62, 400),
        # "C4 E4 D4 C4 B4 C4" (verse end)
        (60, 400), (64, 400), (62, 400), (60, 400), (71, 400), (60, 800),
    ]
    saari_duniya_tutorial = notes_with_durations_to_tutorial(saari_duniya_notes)

    tutorial6 = SongTutorial(
        song_id=created_songs[5].id,
        instrument="piano",
        version="simplified",
        notes_json=json.dumps(saari_duniya_tutorial),
        sections_json=json.dumps([
            {"id": "verse", "name": "Verse", "startTime": 0, "endTime": 55000, "startNote": 0, "endNote": len(saari_duniya_notes)},
        ]),
        chords_json=json.dumps([
            {"chord": "C", "startTime": 0, "duration": 8000},
            {"chord": "Am", "startTime": 8000, "duration": 8000},
            {"chord": "F", "startTime": 16000, "duration": 8000},
            {"chord": "G", "startTime": 24000, "duration": 8000},
        ])
    )
    db.session.add(tutorial6)

    # 7. Tum Jo Aaye Zindagi Mein - Rahat Fateh Ali Khan
    # Key: E major, Tempo: ~78 BPM (beat = 769ms)
    tum_jo_aaye_notes = [
        # "Paa-ya mai-ne" - D#4 E4 F#4 E4
        (63, 500), (64, 500), (66, 500), (64, 700),
        # "paa-ya tum-hein" - D#4 E4 F#4 E4
        (63, 500), (64, 500), (66, 500), (64, 700),
        # "Rab ne mi-la-ya tum-hein" - D#4 E4 F#4 E4 D#4 E4 F#4 E4
        (63, 400), (64, 400), (66, 400), (64, 400),
        (63, 400), (64, 400), (66, 400), (64, 700),
        # "Paa-ya mai-ne" (higher) - E4 G#4 F#4
        (64, 500), (68, 500), (66, 700),
        # "A4 G#4 F#4 E4 D#4" (descent)
        (69, 400), (68, 400), (66, 400), (64, 400), (63, 600),
        # "Tum jo aa-ye zin-da-gi mein" - G#4 A4 G#4 F#4 E4 F#4
        (68, 400), (69, 400), (68, 400), (66, 400), (64, 400), (66, 500),
        # "G#4 F#4 E4 D#4" (phrase end)
        (68, 400), (66, 400), (64, 400), (63, 700),
        # "Baat ban ga-yi" - D#4 E4 F#4 A4 G#4 F#4 E4
        (63, 400), (64, 400), (66, 400), (69, 400), (68, 400), (66, 400), (64, 800),
    ]
    tum_jo_aaye_tutorial = notes_with_durations_to_tutorial(tum_jo_aaye_notes)

    tutorial7 = SongTutorial(
        song_id=created_songs[6].id,
        instrument="piano",
        version="simplified",
        notes_json=json.dumps(tum_jo_aaye_tutorial),
        sections_json=json.dumps([
            {"id": "verse", "name": "Verse", "startTime": 0, "endTime": 50000, "startNote": 0, "endNote": len(tum_jo_aaye_notes)},
        ]),
        chords_json=json.dumps([
            {"chord": "E", "startTime": 0, "duration": 8000},
            {"chord": "B", "startTime": 8000, "duration": 8000},
            {"chord": "A", "startTime": 16000, "duration": 8000},
            {"chord": "E", "startTime": 24000, "duration": 8000},
        ])
    )
    db.session.add(tutorial7)

    # 8. Pehle Bhi Main (Animal) - Vishal Mishra
    # Key: A#m, Tempo: ~72 BPM - REAL NOTES from pianodaddy.com
    # F D# C# D# F, F D# C# D# F D#, F D# C# D# F D#, F D# C# C C
    # Chorus: C#+ C#+ A#+. C#+ C#+ A# G# A#+
    pehle_bhi_notes = [
        # Verse: "Peh-le bhi main" - F D# C# D# F
        (65, 500), (63, 400), (61, 400), (63, 400), (65, 800),
        # "tum-se mi-la hoon" - F D# C# D# F D#
        (65, 400), (63, 400), (61, 400), (63, 400), (65, 400), (63, 600),
        # "Peh-li da-fa hi" - F D# C# D# F D#
        (65, 400), (63, 400), (61, 400), (63, 400), (65, 400), (63, 600),
        # "mil-ke la-ga" - F D# C# C C
        (65, 400), (63, 400), (61, 400), (60, 500), (60, 800),
        # Chorus: C#5 C#5 A#4, C#5 C#5 A#4 G#4 A#4
        (73, 500), (73, 500), (70, 700),
        (73, 400), (73, 400), (70, 400), (68, 400), (70, 800),
        # Repeat chorus
        (73, 500), (73, 500), (70, 700),
        (73, 400), (73, 400), (70, 400), (68, 400), (70, 800),
        # Higher verse: F5 D#5 C#5 D#5 F5
        (77, 400), (75, 400), (73, 400), (75, 400), (77, 700),
        # F5 D#5 C#5 D#5 F5 D#5
        (77, 400), (75, 400), (73, 400), (75, 400), (77, 400), (75, 600),
        # F5 D#5 C#5 C5 C5
        (77, 400), (75, 400), (73, 400), (72, 500), (72, 800),
    ]
    pehle_bhi_tutorial = notes_with_durations_to_tutorial(pehle_bhi_notes)

    tutorial8 = SongTutorial(
        song_id=created_songs[7].id,
        instrument="piano",
        version="simplified",
        notes_json=json.dumps(pehle_bhi_tutorial),
        sections_json=json.dumps([
            {"id": "verse", "name": "Verse", "startTime": 0, "endTime": 40000, "startNote": 0, "endNote": len(pehle_bhi_notes)},
        ]),
        chords_json=json.dumps([
            {"chord": "A#m", "startTime": 0, "duration": 8000},
            {"chord": "G#", "startTime": 8000, "duration": 8000},
            {"chord": "D#m", "startTime": 16000, "duration": 8000},
            {"chord": "Fm", "startTime": 24000, "duration": 8000},
        ])
    )
    db.session.add(tutorial8)

    # 9. Tumse Milke Dil Ka (Main Hoon Na) - Upbeat retro
    # Key: D#m, Tempo: ~130 BPM (beat = 462ms)
    tumse_milke_notes = [
        # Music Line: A#4 D#4 D4 D#4 A#4 C#4 C4 C#4
        (70, 350), (63, 350), (62, 350), (63, 350),
        (70, 350), (61, 350), (60, 350), (61, 500),
        # G#4 B4 A#4 B4 F#4 A#4 A4 A#4
        (68, 350), (71, 350), (70, 350), (71, 350),
        (66, 350), (70, 350), (69, 350), (70, 500),
        # F#4 A#4 C#5 A#4 F#4 D#4 F4
        (66, 350), (70, 350), (73, 350), (70, 350),
        (66, 350), (63, 350), (65, 500),
        # "Ishq jai-se hai ek aan-dhi" - D#4 D#4 D#4 D#4 C#4 D#4 F4
        (63, 300), (63, 300), (63, 300), (63, 300),
        (61, 300), (63, 300), (65, 400),
        # "D#4 C#4 A#4" (phrase end)
        (63, 300), (61, 300), (70, 500),
        # "Ishq hai ek too-faan" - D#4 D#4 D#4 D#4 G#4 F4 C#4
        (63, 300), (63, 300), (63, 300), (63, 300),
        (68, 350), (65, 350), (61, 500),
        # "Dun-iya mein har in-saan" - D#4 D#4 D#4 D#4 C#4 D#4 F4
        (63, 300), (63, 300), (63, 300), (63, 300),
        (61, 300), (63, 300), (65, 400),
        # "D#4 C#4 A#4" (ending)
        (63, 300), (61, 300), (70, 600),
    ]
    tumse_milke_tutorial = notes_with_durations_to_tutorial(tumse_milke_notes)

    tutorial9 = SongTutorial(
        song_id=created_songs[8].id,
        instrument="piano",
        version="simplified",
        notes_json=json.dumps(tumse_milke_tutorial),
        sections_json=json.dumps([
            {"id": "verse", "name": "Verse", "startTime": 0, "endTime": 45000, "startNote": 0, "endNote": len(tumse_milke_notes)},
        ]),
        chords_json=json.dumps([
            {"chord": "D#m", "startTime": 0, "duration": 8000},
            {"chord": "C#", "startTime": 8000, "duration": 8000},
            {"chord": "G#", "startTime": 16000, "duration": 8000},
        ])
    )
    db.session.add(tutorial9)

    # 10. Satranga (Animal) - Arijit Singh
    # Key: C major, Tempo: ~85 BPM - REAL NOTES from pianodaddy.com
    # GAAC+.. BC+BAGA / EAG, D+C+C+ C+BC+BAG, E+D+D+E+E+ D+C+C+D+D+ C+B
    satranga_notes = [
        # Opening: G4 A4 A4 C5 (held)
        (67, 400), (69, 400), (69, 400), (72, 900),
        # B4 C5 B4 A4 G4 A4
        (71, 350), (72, 350), (71, 350), (69, 350), (67, 350), (69, 500),
        # E4 A4 G4
        (64, 400), (69, 400), (67, 600),
        # D5 C5 C5, C5 B4 C5 B4 A4 G4
        (74, 400), (72, 400), (72, 500),
        (72, 300), (71, 300), (72, 300), (71, 300), (69, 300), (67, 500),
        # G4 E4 D5, D5 D5
        (67, 350), (64, 350), (74, 500), (74, 400), (74, 600),
        # E5 D5 D5 E5 E5
        (76, 350), (74, 350), (74, 350), (76, 350), (76, 500),
        # D5 C5 C5 D5 D5
        (74, 350), (72, 350), (72, 350), (74, 350), (74, 500),
        # C5 B4
        (72, 400), (71, 500),
        # A4 B4 C5 B4 A4
        (69, 350), (71, 350), (72, 400), (71, 350), (69, 600),
        # Ending phrase: G4 A4 A4 C5
        (67, 400), (69, 400), (69, 400), (72, 800),
    ]
    satranga_tutorial = notes_with_durations_to_tutorial(satranga_notes)

    tutorial10 = SongTutorial(
        song_id=created_songs[9].id,
        instrument="piano",
        version="simplified",
        notes_json=json.dumps(satranga_tutorial),
        sections_json=json.dumps([
            {"id": "verse", "name": "Verse", "startTime": 0, "endTime": 60000, "startNote": 0, "endNote": len(satranga_notes)},
        ]),
        chords_json=json.dumps([
            {"chord": "C", "startTime": 0, "duration": 8000},
            {"chord": "Am", "startTime": 8000, "duration": 8000},
            {"chord": "F", "startTime": 16000, "duration": 8000},
            {"chord": "G", "startTime": 24000, "duration": 8000},
        ])
    )
    db.session.add(tutorial10)

    # 11. Gulabi Aankhen (The Train) - Classic retro
    # Key: Am, Tempo: ~120 BPM
    # Notes: E E E E E D C B A A / A B C B A G A F E
    # Using octave 4-5 range: E5=76, D5=74, C5=72, B4=71, A4=69, G4=67, F4=65
    gulabi_aankhen_notes = [
        # "Gu-la-bi aan-khen jo te-ri de-khi" - E E E E E D C B A A
        (76, 350), (76, 350), (76, 350), (76, 350), (76, 350),
        (74, 350), (72, 350), (71, 350), (69, 500), (69, 500),
        # "Sha-raa-bi yeh dil ho ga-ya" - A B C B A G A F E
        (69, 350), (71, 350), (72, 350), (71, 350), (69, 350),
        (67, 350), (69, 350), (65, 350), (64, 600),
        # "Sam-bha-lo muj-ko o me-re yaa-ron" - E E E E E D C B A A
        (76, 350), (76, 350), (76, 350), (76, 350), (76, 350),
        (74, 350), (72, 350), (71, 350), (69, 500), (69, 500),
        # "Sam-bhal-na mush-kil ho ga-ya" - A B C B A G A F E
        (69, 350), (71, 350), (72, 350), (71, 350), (69, 350),
        (67, 350), (69, 350), (65, 350), (64, 600),
    ]
    gulabi_aankhen_tutorial = notes_with_durations_to_tutorial(gulabi_aankhen_notes)

    tutorial11 = SongTutorial(
        song_id=created_songs[10].id,
        instrument="piano",
        version="simplified",
        notes_json=json.dumps(gulabi_aankhen_tutorial),
        sections_json=json.dumps([
            {"id": "verse", "name": "Verse", "startTime": 0, "endTime": 35000, "startNote": 0, "endNote": len(gulabi_aankhen_notes)},
        ]),
        chords_json=json.dumps([
            {"chord": "Am", "startTime": 0, "duration": 8000},
            {"chord": "G", "startTime": 8000, "duration": 8000},
            {"chord": "F", "startTime": 16000, "duration": 8000},
            {"chord": "E", "startTime": 24000, "duration": 8000},
        ])
    )
    db.session.add(tutorial11)

    # 12. Tum Hi Ho (Aashiqui 2) - Arijit Singh
    # Key: G#m, Tempo: ~75 BPM
    # Chorus: D# E F# G# F# E D# / C# D# E F# E D# C#
    # Using octave 4-5: D#4=63, E4=64, F#4=66, G#4=68, C#4=61, B4=71, A#4=70
    tum_hi_ho_notes = [
        # "Kyun-ki Tum Hi Ho" - D#5 E5 F#5 G#5 F#5 E5 D#5
        (75, 500), (76, 400), (78, 400), (80, 600), (78, 400), (76, 400), (75, 600),
        # "Ab Tum Hi Ho" - C#5 D#5 E5 F#5 E5 D#5 C#5
        (73, 500), (75, 400), (76, 400), (78, 600), (76, 400), (75, 400), (73, 600),
        # "Zin-da-gi ab tum hi ho" - B4 C#5 D#5 E5 D#5 C#5 B4 A#4
        (71, 400), (73, 400), (75, 400), (76, 500), (75, 400), (73, 400), (71, 400), (70, 600),
        # "Chain bhi, me-ra dard bhi" - A#4 B4 C#5 D#5 C#5 B4 A#4 G#4
        (70, 400), (71, 400), (73, 400), (75, 500), (73, 400), (71, 400), (70, 400), (68, 600),
        # "Me-ri aa-shi-qui ab tum hi ho" - A#4 B4 C#5 D#5 C#5 B4 A#4 B4
        (70, 400), (71, 400), (73, 400), (75, 500), (73, 400), (71, 400), (70, 400), (71, 700),
    ]
    tum_hi_ho_tutorial = notes_with_durations_to_tutorial(tum_hi_ho_notes)

    tutorial12 = SongTutorial(
        song_id=created_songs[11].id,
        instrument="piano",
        version="simplified",
        notes_json=json.dumps(tum_hi_ho_tutorial),
        sections_json=json.dumps([
            {"id": "chorus", "name": "Chorus", "startTime": 0, "endTime": 45000, "startNote": 0, "endNote": len(tum_hi_ho_notes)},
        ]),
        chords_json=json.dumps([
            {"chord": "G#m", "startTime": 0, "duration": 8000},
            {"chord": "F#", "startTime": 8000, "duration": 8000},
            {"chord": "E", "startTime": 16000, "duration": 8000},
            {"chord": "B", "startTime": 24000, "duration": 8000},
        ])
    )
    db.session.add(tutorial12)

    # 13. Chura Liya Hai Tumne (Yaadon Ki Baaraat)
    # Key: Em, Tempo: ~100 BPM
    # B C# D D D E D C A C B A A A / A B C D E E D C B A B G
    # Using octave 4-5: B4=71, C#5=73, D5=74, E5=76, C5=72, A4=69, G4=67
    chura_liya_notes = [
        # "Chu-ra li-ya hai tum-ne jo dil ko" - B4 C#5 D5 D5 D5 E5 D5 C5 A4 C5 B4 A4 A4 A4
        (71, 350), (73, 350), (74, 350), (74, 300), (74, 300),
        (76, 400), (74, 350), (72, 350), (69, 350), (72, 350),
        (71, 350), (69, 350), (69, 350), (69, 500),
        # "Na-zar na-hin chu-ra-na sa-nam" - A4 B4 C5 D5 E5 E5 D5 C5 B4 A4 B4 G4
        (69, 350), (71, 350), (72, 350), (74, 350), (76, 400), (76, 350),
        (74, 350), (72, 350), (71, 350), (69, 350), (71, 350), (67, 600),
        # "Ba-dal ke me-ri tum zin-da-ga-ni" - B4 C#5 D5 D5 D5 E5 D5 C5 A4 C5 B4 A4 A4 A4
        (71, 350), (73, 350), (74, 350), (74, 300), (74, 300),
        (76, 400), (74, 350), (72, 350), (69, 350), (72, 350),
        (71, 350), (69, 350), (69, 350), (69, 500),
        # "Ka-hin ba-dal na jaa-na sa-nam" - A4 B4 C5 D5 E5 E5 D5 C5 B4 A4 B4 G4
        (69, 350), (71, 350), (72, 350), (74, 350), (76, 400), (76, 350),
        (74, 350), (72, 350), (71, 350), (69, 350), (71, 350), (67, 600),
    ]
    chura_liya_tutorial = notes_with_durations_to_tutorial(chura_liya_notes)

    tutorial13 = SongTutorial(
        song_id=created_songs[12].id,
        instrument="piano",
        version="simplified",
        notes_json=json.dumps(chura_liya_tutorial),
        sections_json=json.dumps([
            {"id": "verse", "name": "Verse", "startTime": 0, "endTime": 50000, "startNote": 0, "endNote": len(chura_liya_notes)},
        ]),
        chords_json=json.dumps([
            {"chord": "Em", "startTime": 0, "duration": 8000},
            {"chord": "Am", "startTime": 8000, "duration": 8000},
            {"chord": "D", "startTime": 16000, "duration": 8000},
            {"chord": "G", "startTime": 24000, "duration": 8000},
        ])
    )
    db.session.add(tutorial13)

    # 14. Kal Ho Naa Ho (Title Track)
    # Key: C, Tempo: ~90 BPM
    # E G G G G G F E F D D / D F F F F F E D E C C
    # Using octave 4-5: E4=64, G4=67, F4=65, D4=62, C4=60, A4=69, C5=72
    kal_ho_notes = [
        # "Har gha-di ba-dal ra-hi hai roop zin-da-gi" - E5 G5 G5 G5 G5 G5 F5 E5 F5 D5 D5
        (76, 350), (79, 300), (79, 300), (79, 300), (79, 300), (79, 300),
        (77, 350), (76, 350), (77, 350), (74, 400), (74, 500),
        # "Chaanv hai ka-bhi ka-bhi hai dhoop zin-da-gi" - D5 F5 F5 F5 F5 F5 E5 D5 E5 C5 C5
        (74, 350), (77, 300), (77, 300), (77, 300), (77, 300), (77, 300),
        (76, 350), (74, 350), (76, 350), (72, 400), (72, 500),
        # "Har pal ya-han, jee bhar ji-yo" - C5 E5 G5 A5 C6 A5 G5
        (72, 400), (76, 400), (79, 400), (81, 400), (84, 500), (81, 400), (79, 600),
        # "Jo hai sa-maa, Kal Ho Naa Ho" - G5 F5 E5 D5 F5 E5 D5 C5
        (79, 400), (77, 400), (76, 400), (74, 400), (77, 400), (76, 400), (74, 400), (72, 700),
    ]
    kal_ho_tutorial = notes_with_durations_to_tutorial(kal_ho_notes)

    tutorial14 = SongTutorial(
        song_id=created_songs[13].id,
        instrument="piano",
        version="simplified",
        notes_json=json.dumps(kal_ho_tutorial),
        sections_json=json.dumps([
            {"id": "chorus", "name": "Chorus", "startTime": 0, "endTime": 50000, "startNote": 0, "endNote": len(kal_ho_notes)},
        ]),
        chords_json=json.dumps([
            {"chord": "C", "startTime": 0, "duration": 8000},
            {"chord": "G", "startTime": 8000, "duration": 8000},
            {"chord": "Am", "startTime": 16000, "duration": 8000},
            {"chord": "F", "startTime": 24000, "duration": 8000},
            {"chord": "Em", "startTime": 32000, "duration": 8000},
        ])
    )
    db.session.add(tutorial14)

    # 15. Pani Da Rang (Vicky Donor)
    # Key: Em, Tempo: ~85 BPM
    # E G G G A A A / G A G F# G F# E D E
    # Using octave 4-5: E4=64, G4=67, A4=69, F#4=66, D4=62
    pani_da_rang_notes = [
        # "Pa-ni da rang vekh ke" - E5 G5 G5 G5 A5 A5 A5
        (76, 400), (79, 350), (79, 350), (79, 350), (81, 400), (81, 400), (81, 500),
        # "Aa-khi-yan 'ch han-ju rur ga-ye" - G5 A5 G5 F#5 G5 F#5 E5 D5 E5
        (79, 350), (81, 350), (79, 350), (78, 350), (79, 350), (78, 350), (76, 350), (74, 350), (76, 600),
        # "Maa-hi-ya na aa-ya me-ra" - E5 G5 G5 G5 A5 A5 A5
        (76, 400), (79, 350), (79, 350), (79, 350), (81, 400), (81, 400), (81, 500),
        # "Ran-jha-na na aa-ya me-ra" - G5 A5 G5 F#5 G5 F#5 E5 D5 E5
        (79, 350), (81, 350), (79, 350), (78, 350), (79, 350), (78, 350), (76, 350), (74, 350), (76, 600),
    ]
    pani_da_rang_tutorial = notes_with_durations_to_tutorial(pani_da_rang_notes)

    tutorial15 = SongTutorial(
        song_id=created_songs[14].id,
        instrument="piano",
        version="simplified",
        notes_json=json.dumps(pani_da_rang_tutorial),
        sections_json=json.dumps([
            {"id": "verse", "name": "Verse", "startTime": 0, "endTime": 40000, "startNote": 0, "endNote": len(pani_da_rang_notes)},
        ]),
        chords_json=json.dumps([
            {"chord": "Em", "startTime": 0, "duration": 8000},
            {"chord": "D", "startTime": 8000, "duration": 8000},
            {"chord": "C", "startTime": 16000, "duration": 8000},
            {"chord": "Am", "startTime": 24000, "duration": 8000},
        ])
    )
    db.session.add(tutorial15)

    # =====================================
    # ADD MELODY PATTERNS FOR RECOGNITION
    # =====================================
    # Store all note data for each song
    all_notes = [
        labon_ko_notes,      # 0
        suraj_hua_notes,     # 1
        oh_jane_notes,       # 2
        aashiqui_notes,      # 3
        o_maahi_notes,       # 4
        saari_duniya_notes,  # 5
        tum_jo_aaye_notes,   # 6
        pehle_bhi_notes,     # 7
        tumse_milke_notes,   # 8
        satranga_notes,      # 9
        gulabi_aankhen_notes,  # 10
        tum_hi_ho_notes,     # 11
        chura_liya_notes,    # 12
        kal_ho_notes,        # 13
        pani_da_rang_notes,  # 14
    ]

    # Add melody patterns to each song
    for i, song in enumerate(created_songs):
        notes = all_notes[i]
        tempo = songs_data[i].get("tempo", 120)
        key = songs_data[i].get("key", "C")
        pattern = create_melody_pattern(notes, tempo, key)
        song.melody_pattern = pattern

    db.session.commit()

    print(f"Created {len(created_modules)} modules")
    print(f"Created {len(lessons)} lessons")
    print(f"Created {len(songs_data)} songs with real Bollywood notations and melody patterns")
    print(f"Created 15 tutorials")
    print(f"Created achievements")
    print("Database seeded successfully!")


def seed_achievements():
    """Seed default achievements."""
    achievements = [
        # Beginner achievements
        {"id": "first_note", "title": "First Steps", "description": "Play your first note", "icon": "🎵", "category": "beginner", "gem_reward": 10, "xp_reward": 25, "requirement_type": "notes_played", "requirement_value": 1},
        {"id": "first_lesson", "title": "Student", "description": "Complete your first lesson", "icon": "📚", "category": "beginner", "gem_reward": 15, "xp_reward": 50, "requirement_type": "lessons", "requirement_value": 1},
        {"id": "first_song", "title": "Melody Maker", "description": "Learn your first song", "icon": "🎶", "category": "beginner", "gem_reward": 25, "xp_reward": 100, "requirement_type": "songs", "requirement_value": 1},

        # Streak achievements
        {"id": "streak_7", "title": "Week Warrior", "description": "7-day practice streak", "icon": "🔥", "category": "streak", "gem_reward": 50, "xp_reward": 100, "requirement_type": "streak", "requirement_value": 7},
        {"id": "streak_30", "title": "Dedicated", "description": "30-day practice streak", "icon": "💪", "category": "streak", "gem_reward": 200, "xp_reward": 500, "requirement_type": "streak", "requirement_value": 30},
        {"id": "streak_100", "title": "Unstoppable", "description": "100-day practice streak", "icon": "⚡", "category": "streak", "gem_reward": 750, "xp_reward": 2000, "requirement_type": "streak", "requirement_value": 100},

        # Progress achievements
        {"id": "songs_5", "title": "Rising Star", "description": "Learn 5 songs", "icon": "⭐", "category": "progress", "gem_reward": 50, "xp_reward": 200, "requirement_type": "songs", "requirement_value": 5},
        {"id": "songs_25", "title": "Bollywood Fan", "description": "Learn 25 songs", "icon": "🌟", "category": "progress", "gem_reward": 200, "xp_reward": 1000, "requirement_type": "songs", "requirement_value": 25},
        {"id": "perfect_score", "title": "Perfectionist", "description": "Get 100% on any song", "icon": "💯", "category": "skill", "gem_reward": 30, "xp_reward": 150, "requirement_type": "perfect_scores", "requirement_value": 1},
        {"id": "perfect_10", "title": "Flawless", "description": "Get 10 perfect scores", "icon": "🏅", "category": "skill", "gem_reward": 150, "xp_reward": 500, "requirement_type": "perfect_scores", "requirement_value": 10},

        # Level achievements
        {"id": "level_5", "title": "Getting Serious", "description": "Reach level 5", "icon": "📈", "category": "level", "gem_reward": 50, "xp_reward": 0, "requirement_type": "level", "requirement_value": 5},
        {"id": "level_10", "title": "Committed", "description": "Reach level 10", "icon": "🎯", "category": "level", "gem_reward": 150, "xp_reward": 0, "requirement_type": "level", "requirement_value": 10},

        # Time-based (special)
        {"id": "night_owl", "title": "Night Owl", "description": "Practice after 10 PM", "icon": "🦉", "category": "special", "gem_reward": 15, "xp_reward": 50, "requirement_type": "special", "requirement_value": 0, "is_hidden": True},
        {"id": "early_bird", "title": "Early Bird", "description": "Practice before 7 AM", "icon": "🐦", "category": "special", "gem_reward": 15, "xp_reward": 50, "requirement_type": "special", "requirement_value": 0, "is_hidden": True},
    ]

    for ach_data in achievements:
        ach = Achievement.query.get(ach_data["id"])
        if not ach:
            ach = Achievement(**ach_data)
            db.session.add(ach)

    db.session.commit()
