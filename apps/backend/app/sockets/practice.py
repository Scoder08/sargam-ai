"""
Practice WebSocket Handlers

Real-time WebSocket events for practice sessions.
This is where MIDI notes from the frontend get processed.
"""

from flask import request
from flask_socketio import emit, join_room, leave_room
from flask_jwt_extended import decode_token
from ..extensions import socketio
from ..services import practice_service, FeedbackType
import uuid


# Store socket ID to user ID mapping
socket_users = {}


@socketio.on("connect")
def handle_connect():
    """Handle new WebSocket connection."""
    print(f"Client connected: {request.sid}")


@socketio.on("disconnect")
def handle_disconnect():
    """Handle WebSocket disconnection."""
    sid = request.sid
    print(f"Client disconnected: {sid}")
    
    # Clean up any active session
    user_data = socket_users.pop(sid, None)
    if user_data and user_data.get("session_id"):
        results = practice_service.end_session(user_data["session_id"])
        # Session ended due to disconnect - could notify or log


@socketio.on("authenticate")
def handle_authenticate(data):
    """
    Authenticate WebSocket connection with JWT token.
    
    Expected data: { "token": "jwt_token" }
    """
    token = data.get("token")
    if not token:
        emit("auth_error", {"message": "Token required"})
        return
    
    try:
        # Decode JWT token
        decoded = decode_token(token)
        user_id = decoded.get("sub")
        
        socket_users[request.sid] = {
            "user_id": user_id,
            "session_id": None
        }
        
        emit("authenticated", {"userId": user_id})
        print(f"User {user_id} authenticated on socket {request.sid}")
        
    except Exception as e:
        emit("auth_error", {"message": "Invalid token"})


@socketio.on("start_session")
def handle_start_session(data):
    """
    Start a new practice session.
    
    Expected data:
    {
        "sessionType": "lesson" | "song" | "free_play",
        "lessonId": optional int,
        "songId": optional int,
        "expectedNotes": [
            { "midiNote": 60, "startTime": 0, "duration": 500 },
            ...
        ],
        "tempo": 80
    }
    """
    user_data = socket_users.get(request.sid)
    if not user_data:
        emit("error", {"message": "Not authenticated"})
        return
    
    # Generate session ID
    session_id = str(uuid.uuid4())
    
    # Start the session
    session = practice_service.start_session(
        session_id=session_id,
        user_id=user_data["user_id"],
        session_type=data.get("sessionType", "free_play"),
        lesson_id=data.get("lessonId"),
        song_id=data.get("songId"),
        expected_notes=data.get("expectedNotes", []),
        tempo=data.get("tempo", 80)
    )
    
    # Update user data
    user_data["session_id"] = session_id
    
    # Join a room for this session (for future multiplayer/teacher features)
    join_room(session_id)
    
    emit("session_started", {
        "sessionId": session_id,
        "totalNotes": len(session.expected_notes)
    })


@socketio.on("note_played")
def handle_note_played(data):
    """
    Process a played note from MIDI input.
    
    Expected data:
    {
        "midiNote": 60,
        "velocity": 100,
        "timestamp": 1234.5  // ms since session start
    }
    """
    user_data = socket_users.get(request.sid)
    if not user_data or not user_data.get("session_id"):
        emit("error", {"message": "No active session"})
        return
    
    session_id = user_data["session_id"]
    
    # Process the note
    feedback = practice_service.process_note(
        session_id=session_id,
        midi_note=data["midiNote"],
        velocity=data.get("velocity", 100),
        timestamp=data["timestamp"]
    )
    
    if feedback:
        # Send immediate feedback
        emit("feedback", {
            "result": feedback.feedback_type.value,
            "expectedNote": feedback.expected_note,
            "playedNote": feedback.played_note,
            "timingDiff": feedback.timing_diff_ms,
            "scoreDelta": feedback.score_delta,
            "message": feedback.message
        })
        
        # Get and send updated stats
        stats = practice_service.get_current_stats(session_id)
        if stats:
            emit("stats_update", stats)


@socketio.on("update_notes")
def handle_update_notes(data):
    """
    Update expected notes (e.g., moving to next section).
    
    Expected data:
    {
        "expectedNotes": [...],
        "resetProgress": false
    }
    """
    user_data = socket_users.get(request.sid)
    if not user_data or not user_data.get("session_id"):
        emit("error", {"message": "No active session"})
        return
    
    success = practice_service.update_expected_notes(
        session_id=user_data["session_id"],
        expected_notes=data.get("expectedNotes", []),
        reset_progress=data.get("resetProgress", False)
    )
    
    if success:
        emit("notes_updated", {"success": True})


@socketio.on("get_stats")
def handle_get_stats():
    """Get current session statistics."""
    user_data = socket_users.get(request.sid)
    if not user_data or not user_data.get("session_id"):
        emit("error", {"message": "No active session"})
        return
    
    stats = practice_service.get_current_stats(user_data["session_id"])
    if stats:
        emit("stats_update", stats)


@socketio.on("end_session")
def handle_end_session():
    """
    End the current practice session.
    
    Returns final results and persists to database.
    """
    user_data = socket_users.get(request.sid)
    if not user_data or not user_data.get("session_id"):
        emit("error", {"message": "No active session"})
        return
    
    session_id = user_data["session_id"]
    
    # End session and get results
    results = practice_service.end_session(session_id)
    
    if results:
        # Leave the room
        leave_room(session_id)
        
        # Clear session from user data
        user_data["session_id"] = None
        
        emit("session_ended", results)
    else:
        emit("error", {"message": "Failed to end session"})


@socketio.on("ping")
def handle_ping():
    """Keep-alive ping."""
    emit("pong")
