"""
Admin API Routes

Admin-only endpoints for managing the platform:
- Tutorial/Song CRUD
- User management (gems, premium, etc.)
- Dashboard stats
"""

from functools import wraps
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import User, Song, SongTutorial, UserGamification, LessonProgress, SongProgress, PracticeSession
from ..services.tutorial_parser import TutorialParserService
from datetime import datetime, timedelta
from sqlalchemy import func
import json

admin_bp = Blueprint("admin", __name__)


def admin_required(fn):
    """Decorator to require admin access for a route."""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user or not user.is_admin:
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper


# ═══════════════════════════════════════════════════════════════════════════════
# Dashboard & Stats
# ═══════════════════════════════════════════════════════════════════════════════

@admin_bp.route("/stats", methods=["GET"])
@admin_required
def get_stats():
    """Get admin dashboard statistics."""
    now = datetime.utcnow()
    today = now.date()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    # User stats
    total_users = User.query.count()
    new_users_week = User.query.filter(User.created_at >= week_ago).count()
    new_users_month = User.query.filter(User.created_at >= month_ago).count()
    premium_users = User.query.filter(User.is_premium == True).count()

    # Song/Tutorial stats
    total_songs = Song.query.count()
    free_songs = Song.query.filter(Song.is_free == True).count()
    user_created_songs = Song.query.filter(Song.created_by_user_id.isnot(None)).count()

    # Practice stats
    total_sessions = PracticeSession.query.count()
    sessions_today = PracticeSession.query.filter(
        func.date(PracticeSession.started_at) == today
    ).count()
    sessions_week = PracticeSession.query.filter(
        PracticeSession.started_at >= week_ago
    ).count()

    # Top songs by play count
    top_songs = Song.query.order_by(Song.play_count.desc()).limit(5).all()

    return jsonify({
        "users": {
            "total": total_users,
            "newThisWeek": new_users_week,
            "newThisMonth": new_users_month,
            "premium": premium_users,
        },
        "songs": {
            "total": total_songs,
            "free": free_songs,
            "userCreated": user_created_songs,
        },
        "practice": {
            "totalSessions": total_sessions,
            "sessionsToday": sessions_today,
            "sessionsThisWeek": sessions_week,
        },
        "topSongs": [
            {"id": s.id, "title": s.title, "artist": s.artist, "playCount": s.play_count}
            for s in top_songs
        ],
    })


# ═══════════════════════════════════════════════════════════════════════════════
# Tutorial/Song Management
# ═══════════════════════════════════════════════════════════════════════════════

@admin_bp.route("/tutorials", methods=["GET"])
@admin_required
def list_tutorials():
    """List all tutorials/songs with pagination."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("perPage", 20, type=int)
    search = request.args.get("search", "")
    difficulty = request.args.get("difficulty", "")

    query = Song.query

    if search:
        query = query.filter(
            db.or_(
                Song.title.ilike(f"%{search}%"),
                Song.artist.ilike(f"%{search}%"),
                Song.movie.ilike(f"%{search}%"),
            )
        )
    if difficulty:
        query = query.filter(Song.difficulty == difficulty)

    query = query.order_by(Song.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "tutorials": [_song_to_dict(s) for s in pagination.items],
        "pagination": {
            "page": page,
            "perPage": per_page,
            "total": pagination.total,
            "totalPages": pagination.pages,
        }
    })


@admin_bp.route("/tutorials/<int:song_id>", methods=["GET"])
@admin_required
def get_tutorial(song_id):
    """Get a single tutorial/song with full details."""
    song = Song.query.get_or_404(song_id)
    tutorials = SongTutorial.query.filter_by(song_id=song_id).all()

    result = _song_to_dict(song)
    result["tutorials"] = [
        {
            "id": t.id,
            "instrument": t.instrument,
            "version": t.version,
            "sections": json.loads(t.sections_json) if t.sections_json else [],
            "notes": json.loads(t.notes_json) if t.notes_json else [],
            "chords": json.loads(t.chords_json) if t.chords_json else [],
            "videoUrl": t.video_url,
        }
        for t in tutorials
    ]
    result["melodyPattern"] = song.melody_pattern

    return jsonify(result)


@admin_bp.route("/tutorials", methods=["POST"])
@admin_required
def create_tutorial():
    """
    Create a new tutorial/song.

    Accepts flexible input formats:
    1. Structured JSON (direct DB format)
    2. Raw text notation (Sa Re Ga Ma, C D E F, 1 2 3 4)
    3. Notes as string to be AI-parsed

    If 'rawInput' is provided, uses AI to parse into structured format.
    """
    data = request.get_json()

    # Check if we need AI parsing
    raw_input = data.get("rawInput")
    use_ai = data.get("useAI", False) or raw_input

    if use_ai and raw_input:
        # Parse with AI
        parser = TutorialParserService()
        try:
            parsed = parser.parse_tutorial_input(
                raw_input=raw_input,
                title=data.get("title", ""),
                artist=data.get("artist", ""),
                additional_context=data.get("context", "")
            )
            # Merge parsed data with provided data (provided takes precedence)
            for key in ["notes", "intervals", "tempo", "key", "sections"]:
                if key not in data or not data[key]:
                    data[key] = parsed.get(key)
        except Exception as e:
            return jsonify({
                "error": "AI parsing failed",
                "message": str(e),
                "hint": "Try providing structured input or check the format"
            }), 400

    # Validate required fields
    if not data.get("title"):
        return jsonify({"error": "Title is required"}), 400

    # Create song
    song = Song(
        title=data.get("title"),
        title_hindi=data.get("titleHindi"),
        artist=data.get("artist", "Unknown"),
        movie=data.get("movie"),
        year=data.get("year"),
        tempo=data.get("tempo", 120),
        key=data.get("key", "C"),
        duration=data.get("duration", 180),
        genre=data.get("genre", "bollywood"),
        difficulty=data.get("difficulty", "beginner"),
        instruments=data.get("instruments", "piano"),
        thumbnail_url=data.get("thumbnailUrl"),
        preview_url=data.get("previewUrl"),
        is_popular=data.get("isPopular", False),
        is_free=data.get("isFree", False),
    )

    # Set melody pattern for recognition
    melody_pattern = {
        "notes": data.get("notes", []),
        "intervals": data.get("intervals", []),
        "tempo": data.get("tempo", 120),
        "key": data.get("key", "C"),
    }

    # Calculate intervals from notes if not provided
    notes = data.get("notes", [])
    if notes and not data.get("intervals"):
        intervals = []
        for i in range(1, len(notes)):
            intervals.append(notes[i] - notes[i-1])
        melody_pattern["intervals"] = intervals

    song.melody_pattern = melody_pattern
    db.session.add(song)
    db.session.flush()  # Get the ID

    # Create tutorial if sections provided
    sections = data.get("sections", [])
    if sections or notes:
        tutorial = SongTutorial(
            song_id=song.id,
            instrument=data.get("instrument", "piano"),
            version=data.get("version", "standard"),
            sections_json=json.dumps(sections) if sections else None,
            notes_json=json.dumps(notes) if notes else None,
            chords_json=json.dumps(data.get("chords", [])) if data.get("chords") else None,
            video_url=data.get("videoUrl"),
        )
        db.session.add(tutorial)

    db.session.commit()

    return jsonify({
        "message": "Tutorial created successfully",
        "song": _song_to_dict(song),
        "aiParsed": use_ai and raw_input is not None,
    }), 201


@admin_bp.route("/tutorials/<int:song_id>", methods=["PUT"])
@admin_required
def update_tutorial(song_id):
    """Update an existing tutorial/song."""
    song = Song.query.get_or_404(song_id)
    data = request.get_json()

    # Update song fields
    if "title" in data:
        song.title = data["title"]
    if "titleHindi" in data:
        song.title_hindi = data["titleHindi"]
    if "artist" in data:
        song.artist = data["artist"]
    if "movie" in data:
        song.movie = data["movie"]
    if "year" in data:
        song.year = data["year"]
    if "tempo" in data:
        song.tempo = data["tempo"]
    if "key" in data:
        song.key = data["key"]
    if "duration" in data:
        song.duration = data["duration"]
    if "genre" in data:
        song.genre = data["genre"]
    if "difficulty" in data:
        song.difficulty = data["difficulty"]
    if "instruments" in data:
        song.instruments = data["instruments"]
    if "thumbnailUrl" in data:
        song.thumbnail_url = data["thumbnailUrl"]
    if "previewUrl" in data:
        song.preview_url = data["previewUrl"]
    if "isPopular" in data:
        song.is_popular = data["isPopular"]
    if "isFree" in data:
        song.is_free = data["isFree"]

    # Update melody pattern
    if "notes" in data or "intervals" in data:
        pattern = song.melody_pattern or {}
        if "notes" in data:
            pattern["notes"] = data["notes"]
            # Recalculate intervals
            notes = data["notes"]
            if notes and len(notes) > 1:
                intervals = []
                for i in range(1, len(notes)):
                    intervals.append(notes[i] - notes[i-1])
                pattern["intervals"] = intervals
        if "intervals" in data:
            pattern["intervals"] = data["intervals"]
        if "tempo" in data:
            pattern["tempo"] = data["tempo"]
        if "key" in data:
            pattern["key"] = data["key"]
        song.melody_pattern = pattern

    db.session.commit()

    return jsonify({
        "message": "Tutorial updated successfully",
        "song": _song_to_dict(song),
    })


@admin_bp.route("/tutorials/<int:song_id>", methods=["DELETE"])
@admin_required
def delete_tutorial(song_id):
    """Delete a tutorial/song and all related data."""
    song = Song.query.get_or_404(song_id)

    # Delete related tutorials
    SongTutorial.query.filter_by(song_id=song_id).delete()

    # Delete related progress
    SongProgress.query.filter_by(song_id=song_id).delete()

    # Delete the song
    db.session.delete(song)
    db.session.commit()

    return jsonify({"message": "Tutorial deleted successfully"})


@admin_bp.route("/tutorials/parse", methods=["POST"])
@admin_required
def parse_tutorial_input():
    """
    Preview AI parsing of tutorial input without saving.
    Useful for testing the parser before creating a tutorial.
    """
    data = request.get_json()
    raw_input = data.get("rawInput")

    if not raw_input:
        return jsonify({"error": "rawInput is required"}), 400

    parser = TutorialParserService()
    try:
        parsed = parser.parse_tutorial_input(
            raw_input=raw_input,
            title=data.get("title", ""),
            artist=data.get("artist", ""),
            additional_context=data.get("context", "")
        )
        return jsonify({
            "parsed": parsed,
            "message": "Successfully parsed input",
        })
    except Exception as e:
        return jsonify({
            "error": "Parsing failed",
            "message": str(e),
        }), 400


# ═══════════════════════════════════════════════════════════════════════════════
# User Management
# ═══════════════════════════════════════════════════════════════════════════════

@admin_bp.route("/users", methods=["GET"])
@admin_required
def list_users():
    """List all users with pagination."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("perPage", 20, type=int)
    search = request.args.get("search", "")

    query = User.query

    if search:
        query = query.filter(
            db.or_(
                User.name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.phone.ilike(f"%{search}%"),
            )
        )

    query = query.order_by(User.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    users_data = []
    for user in pagination.items:
        gamification = UserGamification.query.filter_by(user_id=user.id).first()
        users_data.append({
            **user.to_dict(),
            "gems": gamification.gems if gamification else 0,
            "xp": gamification.total_xp if gamification else 0,
            "level": gamification.level if gamification else 1,
            "streak": gamification.current_streak if gamification else 0,
        })

    return jsonify({
        "users": users_data,
        "pagination": {
            "page": page,
            "perPage": per_page,
            "total": pagination.total,
            "totalPages": pagination.pages,
        }
    })


@admin_bp.route("/users/<int:user_id>", methods=["GET"])
@admin_required
def get_user(user_id):
    """Get detailed user information."""
    user = User.query.get_or_404(user_id)
    gamification = UserGamification.query.filter_by(user_id=user_id).first()

    # Get practice stats
    total_sessions = PracticeSession.query.filter_by(user_id=user_id).count()
    lessons_completed = LessonProgress.query.filter(
        LessonProgress.user_id == user_id,
        LessonProgress.completed_at.isnot(None)
    ).count()
    songs_learned = SongProgress.query.filter(
        SongProgress.user_id == user_id,
        SongProgress.mastered_at.isnot(None)
    ).count()

    return jsonify({
        **user.to_dict(),
        "gamification": {
            "gems": gamification.gems if gamification else 0,
            "totalXp": gamification.total_xp if gamification else 0,
            "level": gamification.level if gamification else 1,
            "currentStreak": gamification.current_streak if gamification else 0,
            "longestStreak": gamification.longest_streak if gamification else 0,
            "streakFreezes": gamification.streak_freezes if gamification else 0,
        } if gamification else None,
        "stats": {
            "totalSessions": total_sessions,
            "lessonsCompleted": lessons_completed,
            "songsLearned": songs_learned,
        }
    })


@admin_bp.route("/users/<int:user_id>/gems", methods=["POST"])
@admin_required
def add_user_gems(user_id):
    """Add gems to a user's wallet."""
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    amount = data.get("amount", 0)
    reason = data.get("reason", "Admin grant")

    if amount <= 0:
        return jsonify({"error": "Amount must be positive"}), 400

    gamification = UserGamification.query.filter_by(user_id=user_id).first()
    if not gamification:
        gamification = UserGamification(user_id=user_id)
        db.session.add(gamification)

    old_gems = gamification.gems
    gamification.add_gems(amount)
    db.session.commit()

    return jsonify({
        "message": f"Added {amount} gems to {user.name}",
        "oldGems": old_gems,
        "newGems": gamification.gems,
        "reason": reason,
    })


@admin_bp.route("/users/<int:user_id>/premium", methods=["POST"])
@admin_required
def set_user_premium(user_id):
    """Grant or revoke premium status."""
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    is_premium = data.get("isPremium", True)
    days = data.get("days", 30)  # Default 30 days

    user.is_premium = is_premium
    if is_premium and days > 0:
        user.premium_until = datetime.utcnow() + timedelta(days=days)
    elif not is_premium:
        user.premium_until = None

    db.session.commit()

    return jsonify({
        "message": f"Premium status {'granted' if is_premium else 'revoked'} for {user.name}",
        "isPremium": user.is_premium,
        "premiumUntil": user.premium_until.isoformat() if user.premium_until else None,
    })


@admin_bp.route("/users/<int:user_id>/admin", methods=["POST"])
@admin_required
def set_user_admin(user_id):
    """Grant or revoke admin status."""
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    is_admin = data.get("isAdmin", True)
    user.is_admin = is_admin
    db.session.commit()

    return jsonify({
        "message": f"Admin status {'granted' if is_admin else 'revoked'} for {user.name}",
        "isAdmin": user.is_admin,
    })


@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    """Delete a user and all their data."""
    user = User.query.get_or_404(user_id)

    # Don't allow deleting yourself
    current_user_id = int(get_jwt_identity())
    if user_id == current_user_id:
        return jsonify({"error": "Cannot delete your own account"}), 400

    # Delete related data
    UserGamification.query.filter_by(user_id=user_id).delete()
    LessonProgress.query.filter_by(user_id=user_id).delete()
    SongProgress.query.filter_by(user_id=user_id).delete()
    PracticeSession.query.filter_by(user_id=user_id).delete()

    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": f"User {user.name} deleted successfully"})


# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════

def _song_to_dict(song):
    """Convert Song model to dictionary."""
    return {
        "id": song.id,
        "title": song.title,
        "titleHindi": song.title_hindi,
        "artist": song.artist,
        "movie": song.movie,
        "year": song.year,
        "tempo": song.tempo,
        "key": song.key,
        "duration": song.duration,
        "genre": song.genre,
        "difficulty": song.difficulty,
        "instruments": song.instruments,
        "thumbnailUrl": song.thumbnail_url,
        "previewUrl": song.preview_url,
        "playCount": song.play_count,
        "isPopular": song.is_popular,
        "isFree": song.is_free,
        "createdByUserId": song.created_by_user_id,
        "createdAt": song.created_at.isoformat() if song.created_at else None,
    }
