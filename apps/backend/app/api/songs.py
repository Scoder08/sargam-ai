"""
Songs API

Endpoints for Bollywood song library and tutorials.
"""

import os
import tempfile
import json
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from werkzeug.utils import secure_filename
from ..models import Song, SongTutorial, SongProgress, User, UserUnlockedSong, UserGamification
from ..extensions import db
from ..services import audio_analysis_service, song_recognition_service, audd_recognition_service, claude_recognition_service, openai_recognition_service

songs_bp = Blueprint("songs", __name__)

ALLOWED_AUDIO_EXTENSIONS = {'mp3', 'wav', 'm4a', 'ogg', 'flac'}


def allowed_audio_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_AUDIO_EXTENSIONS


# ─────────────────────────────────────────────────────────────────────────────
# Song Library
# ─────────────────────────────────────────────────────────────────────────────

@songs_bp.route("", methods=["GET"])
def get_songs():
    """Get paginated songs with filters."""
    page = request.args.get("page", 1, type=int)
    page_size = request.args.get("pageSize", 10, type=int)
    genre = request.args.get("genre")
    difficulty = request.args.get("difficulty")
    search = request.args.get("search")
    
    query = Song.query
    
    if genre:
        query = query.filter_by(genre=genre)
    if difficulty:
        query = query.filter_by(difficulty=difficulty)
    if search:
        query = query.filter(
            db.or_(
                Song.title.ilike(f"%{search}%"),
                Song.title_hindi.ilike(f"%{search}%"),
                Song.artist.ilike(f"%{search}%"),
                Song.movie.ilike(f"%{search}%")
            )
        )
    
    query = query.order_by(Song.is_popular.desc(), Song.play_count.desc())
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)
    
    return jsonify({
        "data": [s.to_dict() for s in pagination.items],
        "pagination": {
            "page": pagination.page,
            "pageSize": pagination.per_page,
            "total": pagination.total,
            "totalPages": pagination.pages
        }
    })


@songs_bp.route("/<int:song_id>", methods=["GET"])
def get_song(song_id):
    """Get a single song."""
    song = Song.query.get_or_404(song_id)
    return jsonify(song.to_dict())


@songs_bp.route("/search", methods=["GET"])
def search_songs():
    """Search songs by query."""
    query = request.args.get("q", "")
    limit = request.args.get("limit", 20, type=int)
    
    if not query:
        return jsonify([])
    
    songs = Song.query.filter(
        db.or_(
            Song.title.ilike(f"%{query}%"),
            Song.title_hindi.ilike(f"%{query}%"),
            Song.artist.ilike(f"%{query}%"),
            Song.movie.ilike(f"%{query}%")
        )
    ).limit(limit).all()
    
    return jsonify([s.to_dict() for s in songs])


@songs_bp.route("/popular", methods=["GET"])
def get_popular():
    """Get popular songs."""
    limit = request.args.get("limit", 10, type=int)
    
    songs = Song.query.filter_by(is_popular=True).order_by(
        Song.play_count.desc()
    ).limit(limit).all()
    
    return jsonify([s.to_dict() for s in songs])


@songs_bp.route("/new", methods=["GET"])
def get_new():
    """Get recently added songs."""
    limit = request.args.get("limit", 10, type=int)
    
    songs = Song.query.order_by(
        Song.created_at.desc()
    ).limit(limit).all()
    
    return jsonify([s.to_dict() for s in songs])


# ─────────────────────────────────────────────────────────────────────────────
# Tutorials
# ─────────────────────────────────────────────────────────────────────────────

@songs_bp.route("/<int:song_id>/tutorial", methods=["GET"])
@jwt_required(optional=True)
def get_tutorial(song_id):
    """Get tutorial for a song."""
    version = request.args.get("version", "simplified")
    instrument = request.args.get("instrument", "piano")

    # Check if user has access (free song, premium user, or unlocked with gems)
    song = Song.query.get_or_404(song_id)

    # Get user info from JWT if present
    user_id = None
    is_premium = False
    try:
        user_identity = get_jwt_identity()
        if user_identity:
            user_id = int(user_identity)
            claims = get_jwt()
            is_premium = claims.get("isPremium", False)
    except:
        pass

    # Check if user has unlocked this song with gems
    has_unlocked = False
    if user_id:
        unlock_record = UserUnlockedSong.query.filter_by(
            user_id=user_id,
            song_id=song_id
        ).first()
        has_unlocked = unlock_record is not None

        # Also allow if user created this song
        if song.created_by_user_id == user_id:
            has_unlocked = True

    if not song.is_free and not is_premium and not has_unlocked:
        return jsonify({
            "error": "Premium required",
            "message": "This song requires a premium subscription"
        }), 403
    
    tutorial = SongTutorial.query.filter_by(
        song_id=song_id,
        version=version,
        instrument=instrument
    ).first()
    
    if not tutorial:
        # Try to find any tutorial for this song
        tutorial = SongTutorial.query.filter_by(song_id=song_id).first()
    
    if not tutorial:
        return jsonify({"error": "Tutorial not found"}), 404
    
    # Increment play count
    song.increment_play_count()
    
    return jsonify(tutorial.to_dict())


# ─────────────────────────────────────────────────────────────────────────────
# Progress
# ─────────────────────────────────────────────────────────────────────────────

@songs_bp.route("/<int:song_id>/progress", methods=["GET"])
@jwt_required()
def get_progress(song_id):
    """Get user's progress for a song."""
    user_id = int(get_jwt_identity())

    progress = SongProgress.query.filter_by(
        user_id=user_id,
        song_id=song_id
    ).first()
    
    if not progress:
        return jsonify({
            "songId": song_id,
            "sectionsCompleted": [],
            "overallProgress": 0,
            "practiceTimeSeconds": 0
        })
    
    return jsonify(progress.to_dict())


@songs_bp.route("/<int:song_id>/progress", methods=["PATCH"])
@jwt_required()
def update_progress(song_id):
    """Update song progress."""
    user_id = int(get_jwt_identity())
    data = request.get_json()

    progress = SongProgress.query.filter_by(
        user_id=user_id,
        song_id=song_id
    ).first()

    if not progress:
        progress = SongProgress(user_id=user_id, song_id=song_id)
        db.session.add(progress)
    
    if "tutorialId" in data:
        progress.tutorial_id = data["tutorialId"]
    if "overallProgress" in data:
        progress.overall_progress = data["overallProgress"]
    if "bestAccuracy" in data and (progress.best_accuracy is None or data["bestAccuracy"] > progress.best_accuracy):
        progress.best_accuracy = data["bestAccuracy"]
    if "practiceTimeSeconds" in data:
        progress.practice_time_seconds += data["practiceTimeSeconds"]
        from datetime import datetime
        progress.last_practiced_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify(progress.to_dict())


@songs_bp.route("/learned", methods=["GET"])
@jwt_required()
def get_learned():
    """Get songs the user has learned (>80% accuracy)."""
    user_id = int(get_jwt_identity())

    progress_records = SongProgress.query.filter(
        SongProgress.user_id == user_id,
        SongProgress.best_accuracy >= 80
    ).all()

    song_ids = [p.song_id for p in progress_records]
    songs = Song.query.filter(Song.id.in_(song_ids)).all()

    return jsonify([s.to_dict() for s in songs])


@songs_bp.route("/my-creations", methods=["GET"])
@jwt_required()
def get_my_creations():
    """Get songs created by the current user."""
    user_id = int(get_jwt_identity())

    songs = Song.query.filter_by(created_by_user_id=user_id).order_by(
        Song.created_at.desc()
    ).all()

    return jsonify([s.to_dict() for s in songs])


# ─────────────────────────────────────────────────────────────────────────────
# Favorites (MVP stub)
# ─────────────────────────────────────────────────────────────────────────────

@songs_bp.route("/<int:song_id>/favorite", methods=["POST"])
@jwt_required()
def add_favorite(song_id):
    """Add song to favorites."""
    # For MVP, this is a stub - would need a favorites table
    return jsonify({"message": "Added to favorites"})


@songs_bp.route("/<int:song_id>/favorite", methods=["DELETE"])
@jwt_required()
def remove_favorite(song_id):
    """Remove song from favorites."""
    return jsonify({"message": "Removed from favorites"})


@songs_bp.route("/favorites", methods=["GET"])
@jwt_required()
def get_favorites():
    """Get user's favorite songs."""
    # Stub for MVP
    return jsonify([])


# ─────────────────────────────────────────────────────────────────────────────
# Song Unlocking (Gem purchases)
# ─────────────────────────────────────────────────────────────────────────────

# Cost per difficulty level
SONG_COSTS = {
    "beginner": 100,
    "intermediate": 200,
    "advanced": 300,
}


@songs_bp.route("/<int:song_id>/unlock", methods=["POST"])
@jwt_required()
def unlock_song(song_id):
    """Unlock a song by spending gems."""
    user_id = int(get_jwt_identity())

    # Check if song exists
    song = Song.query.get_or_404(song_id)

    # Check if already free or user-created
    if song.is_free:
        return jsonify({"error": "Song is already free"}), 400

    # Check if already unlocked
    existing = UserUnlockedSong.query.filter_by(
        user_id=user_id,
        song_id=song_id
    ).first()

    if existing:
        return jsonify({
            "error": "Already unlocked",
            "message": "You have already unlocked this song"
        }), 400

    # Get cost based on difficulty
    cost = SONG_COSTS.get(song.difficulty, 150)

    # Get user's gamification record
    gamification = UserGamification.query.filter_by(user_id=user_id).first()
    if not gamification:
        gamification = UserGamification(user_id=user_id)
        db.session.add(gamification)

    # Check if user has enough gems
    if gamification.gems < cost:
        return jsonify({
            "error": "Not enough gems",
            "required": cost,
            "current": gamification.gems
        }), 400

    # Spend gems
    gamification.spend_gems(cost)

    # Create unlock record
    unlock = UserUnlockedSong(
        user_id=user_id,
        song_id=song_id,
        gems_spent=cost
    )
    db.session.add(unlock)
    db.session.commit()

    return jsonify({
        "success": True,
        "songId": song_id,
        "gemsSpent": cost,
        "gemsRemaining": gamification.gems,
        "song": song.to_dict()
    })


@songs_bp.route("/unlocked", methods=["GET"])
@jwt_required()
def get_unlocked_songs():
    """Get all songs the user has unlocked."""
    user_id = int(get_jwt_identity())

    unlocked = UserUnlockedSong.query.filter_by(user_id=user_id).all()
    song_ids = [u.song_id for u in unlocked]

    # Also include free songs
    free_songs = Song.query.filter_by(is_free=True).all()
    free_song_ids = [s.id for s in free_songs]

    # Combine all accessible song IDs
    all_accessible_ids = set(song_ids + free_song_ids)

    return jsonify({
        "unlockedIds": list(all_accessible_ids),
        "purchasedIds": song_ids
    })


# ─────────────────────────────────────────────────────────────────────────────
# Audio Analysis & Song Creation
# ─────────────────────────────────────────────────────────────────────────────

@songs_bp.route("/analyze-audio", methods=["POST"])
@jwt_required(optional=True)
def analyze_audio():
    """
    Analyze uploaded audio file to extract melody.
    Returns extracted notes that can be used to create a tutorial.
    """
    if not audio_analysis_service.is_available():
        return jsonify({
            "error": "Audio analysis not available",
            "message": "Audio analysis libraries are not installed on the server"
        }), 503

    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    file = request.files['audio']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if not allowed_audio_file(file.filename):
        return jsonify({
            "error": "Invalid file type",
            "message": f"Supported formats: {', '.join(ALLOWED_AUDIO_EXTENSIONS)}"
        }), 400

    # Save to temp file
    filename = secure_filename(file.filename)
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, filename)

    try:
        file.save(temp_path)

        # Extract melody
        result = audio_analysis_service.extract_melody(temp_path)

        # Convert to tutorial format
        tutorial_notes = audio_analysis_service.create_tutorial_notes(result, simplify=True)
        melody_pattern = audio_analysis_service.create_melody_pattern(result)

        return jsonify({
            "success": True,
            "tempo": result.tempo,
            "key": result.key,
            "duration": result.duration,
            "noteCount": len(tutorial_notes),
            "notes": tutorial_notes,
            "melodyPattern": melody_pattern
        })

    except Exception as e:
        return jsonify({
            "error": "Analysis failed",
            "message": str(e)
        }), 500

    finally:
        # Cleanup temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)


@songs_bp.route("/create-from-audio", methods=["POST"])
@jwt_required(optional=True)
def create_song_from_audio():
    """
    Create a new song with tutorial from uploaded audio.
    Expects multipart form with audio file and song metadata.
    """
    if not audio_analysis_service.is_available():
        return jsonify({
            "error": "Audio analysis not available",
            "message": "Audio analysis libraries are not installed"
        }), 503

    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    file = request.files['audio']
    if not allowed_audio_file(file.filename):
        return jsonify({"error": "Invalid file type"}), 400

    # Get song metadata from form
    title = request.form.get('title', 'Untitled Song')
    artist = request.form.get('artist', 'Unknown Artist')
    movie = request.form.get('movie', '')
    difficulty = request.form.get('difficulty', 'beginner')

    # Get current user ID if authenticated
    current_user_id = None
    try:
        user_identity = get_jwt_identity()
        if user_identity:
            current_user_id = int(user_identity)
    except:
        pass

    # Save and process audio
    filename = secure_filename(file.filename)
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, filename)

    try:
        file.save(temp_path)

        # Extract melody
        result = audio_analysis_service.extract_melody(temp_path)
        tutorial_notes = audio_analysis_service.create_tutorial_notes(result, simplify=True)
        melody_pattern = audio_analysis_service.create_melody_pattern(result)

        # Create song
        song = Song(
            title=title,
            artist=artist,
            movie=movie if movie else None,
            tempo=result.tempo,
            key=result.key,
            duration=int(result.duration),
            difficulty=difficulty,
            is_free=True,  # User-created songs are free
            is_popular=False,
            created_by_user_id=current_user_id  # Track who created this song
        )
        song.melody_pattern = melody_pattern
        db.session.add(song)
        db.session.flush()  # Get song ID

        # Create tutorial
        tutorial = SongTutorial(
            song_id=song.id,
            instrument="piano",
            version="simplified",
            notes_json=json.dumps(tutorial_notes)
        )
        db.session.add(tutorial)
        db.session.commit()

        return jsonify({
            "success": True,
            "song": song.to_dict(),
            "tutorialId": tutorial.id,
            "noteCount": len(tutorial_notes)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "error": "Song creation failed",
            "message": str(e)
        }), 500

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)


# ─────────────────────────────────────────────────────────────────────────────
# Song Recognition (AI Guessing)
# ─────────────────────────────────────────────────────────────────────────────

@songs_bp.route("/recognize", methods=["POST"])
def recognize_song():
    """
    Recognize a song from played notes.
    Expects JSON with array of MIDI notes.
    """
    data = request.get_json()
    if not data or 'notes' not in data:
        return jsonify({"error": "No notes provided"}), 400

    played_notes = data['notes']
    if not isinstance(played_notes, list) or len(played_notes) < 5:
        return jsonify({
            "matches": [],
            "message": "Need at least 5 notes for recognition"
        })

    # Get all songs with melody patterns
    songs_with_patterns = Song.query.filter(
        Song.melody_pattern_json.isnot(None)
    ).all()

    # Build pattern list
    song_patterns = []
    for song in songs_with_patterns:
        pattern = song.melody_pattern
        if pattern:
            pattern['song_id'] = song.id
            pattern['title'] = song.title
            pattern['artist'] = song.artist
            song_patterns.append(pattern)

    # Find matches
    matches = song_recognition_service.find_matching_songs(played_notes, song_patterns)

    return jsonify({
        "matches": matches,
        "notesAnalyzed": len(played_notes)
    })


@songs_bp.route("/patterns", methods=["GET"])
def get_song_patterns():
    """
    Get all song melody patterns for client-side recognition.
    This allows real-time recognition without server round-trips.
    Includes rhythm patterns for better matching accuracy.
    """
    songs_with_patterns = Song.query.filter(
        Song.melody_pattern_json.isnot(None)
    ).all()

    patterns = []
    for song in songs_with_patterns:
        pattern = song.melody_pattern
        if pattern:
            patterns.append({
                "songId": song.id,
                "title": song.title,
                "artist": song.artist,
                "intervals": pattern.get("intervals", []),
                "notes": pattern.get("notes", [])[:30],  # First 30 notes
                "rhythm": pattern.get("rhythm", []),  # Rhythm pattern (S/M/L/X)
                "time_intervals": pattern.get("time_intervals", [])[:30],  # Time differences in ms
                "tempo": pattern.get("tempo"),
                "key": pattern.get("key")
            })

    return jsonify(patterns)


# ─────────────────────────────────────────────────────────────────────────────
# Audio-Based Recognition (AudD + Claude AI fallback)
# ─────────────────────────────────────────────────────────────────────────────

@songs_bp.route("/recognize-audio", methods=["POST"])
def recognize_audio():
    """
    Recognize a song from an audio recording.
    Uses AudD API for fingerprinting, with AI (OpenAI/Claude) as intelligent fallback.
    Expects multipart form with audio file (recorded or uploaded).
    """
    # Check if at least one recognition service is available
    audd_available = audd_recognition_service.is_available()
    claude_available = claude_recognition_service.is_available()
    openai_available = openai_recognition_service.is_available()

    if not audd_available and not claude_available and not openai_available:
        return jsonify({
            "error": "Audio recognition not configured",
            "message": "No recognition API configured. Set AUDD_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY in .env"
        }), 503

    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    file = request.files['audio']
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    # Get original filename and content type
    original_filename = secure_filename(file.filename) or "recording.webm"
    content_type = file.content_type or "audio/webm"

    # Log for debugging
    current_app.logger.info(f"Audio recognition request: filename={original_filename}, content_type={content_type}")

    # Save temporarily
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, original_filename)

    try:
        file.save(temp_path)

        # Log file size for debugging
        file_size = os.path.getsize(temp_path)
        current_app.logger.info(f"Saved audio file: {temp_path}, size={file_size} bytes")

        if file_size < 1000:
            return jsonify({
                "error": "Audio too short",
                "message": "Recording is too short. Please record at least 5 seconds."
            }), 400

        result = None

        # Step 1: Try AudD API for audio fingerprinting (best for actual song recordings)
        if audd_available:
            result = audd_recognition_service.recognize_from_file(temp_path)
            current_app.logger.info(f"AudD result: {result}")

            if result.get("success"):
                # Found via AudD! Try to find local match
                song_info = result.get("song", {})
                title = song_info.get("title", "").lower()
                artist = song_info.get("artist", "").lower()

                local_match = Song.query.filter(
                    db.or_(
                        Song.title.ilike(f"%{title}%"),
                        Song.artist.ilike(f"%{artist}%")
                    )
                ).first()

                return jsonify({
                    "success": True,
                    "recognized": song_info,
                    "localMatch": local_match.to_dict() if local_match else None,
                    "source": "audd"
                })

        # Step 2: AudD failed or unavailable - try AI with melody analysis (OpenAI preferred, Claude fallback)
        ai_available = openai_available or claude_available
        if ai_available:
            # Prefer OpenAI (cheaper, faster), fall back to Claude
            ai_service = openai_recognition_service if openai_available else claude_recognition_service
            ai_name = "OpenAI" if openai_available else "Claude"
            current_app.logger.info(f"AudD failed, trying {ai_name} AI melody analysis...")

            # Check if audio analysis is available (needs librosa, basic-pitch)
            if audio_analysis_service.is_available():
                try:
                    # Extract melody from the audio
                    melody_result = audio_analysis_service.extract_melody(temp_path)

                    if melody_result:
                        # Create melody info for AI
                        melody_info = {
                            "tempo": melody_result.tempo,
                            "key": melody_result.key,
                            "duration": melody_result.duration,
                            "notes": [n.midi_note for n in melody_result.notes],
                            "intervals": melody_result.intervals,
                            "time_intervals": melody_result.time_intervals,
                            "rhythm": audio_analysis_service._normalize_rhythm(melody_result.time_intervals)
                        }

                        # Ask AI to identify the song
                        ai_result = ai_service.recognize_from_melody_data(
                            melody_info,
                            context="Bollywood/Hindi film music"
                        )

                        current_app.logger.info(f"{ai_name} result: {ai_result}")

                        if ai_result.get("success"):
                            song_info = ai_result.get("song", {})
                            title = song_info.get("title", "").lower()
                            artist = song_info.get("artist", "").lower()

                            # Search our database
                            local_match = Song.query.filter(
                                db.or_(
                                    Song.title.ilike(f"%{title}%"),
                                    Song.artist.ilike(f"%{artist}%")
                                )
                            ).first()

                            return jsonify({
                                "success": True,
                                "recognized": song_info,
                                "localMatch": local_match.to_dict() if local_match else None,
                                "source": ai_result.get("source", "openai" if openai_available else "claude"),
                                "confidence": ai_result.get("confidence", "medium"),
                                "suggestions": ai_result.get("suggestions", [])
                            })
                        else:
                            # AI couldn't identify but may have suggestions
                            return jsonify({
                                "success": False,
                                "error": "Song not recognized",
                                "message": ai_result.get("message", "Could not identify the song"),
                                "suggestions": ai_result.get("suggestions", []),
                                "analysis": ai_result.get("analysis", ""),
                                "source": ai_result.get("source", "openai" if openai_available else "claude")
                            }), 404

                except Exception as melody_err:
                    current_app.logger.error(f"Melody extraction error: {str(melody_err)}")
                    # Fall through to return AudD's error

        # No recognition worked
        if result:
            return jsonify(result), 404
        else:
            return jsonify({
                "success": False,
                "error": "Song not recognized",
                "message": "Could not identify the song. Try playing actual music for 5+ seconds."
            }), 404

    except Exception as e:
        current_app.logger.error(f"Recognition error: {str(e)}")
        return jsonify({
            "error": "Recognition failed",
            "message": str(e)
        }), 500

    finally:
        # Cleanup
        try:
            os.unlink(temp_path)
            os.rmdir(temp_dir)
        except:
            pass
