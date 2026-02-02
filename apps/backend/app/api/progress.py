"""
Progress API

Endpoints for user progress and statistics.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from datetime import datetime, timedelta
from ..models import PracticeSession, LessonProgress, SongProgress, User
from ..extensions import db

progress_bp = Blueprint("progress", __name__)


@progress_bp.route("/stats", methods=["GET"])
@jwt_required()
def get_stats():
    """Get user's overall progress statistics."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Get practice stats for this week
    week_ago = datetime.utcnow() - timedelta(days=7)
    
    weekly_sessions = PracticeSession.query.filter(
        PracticeSession.user_id == user_id,
        PracticeSession.started_at >= week_ago
    ).all()
    
    weekly_practice_time = sum(s.duration_seconds or 0 for s in weekly_sessions)
    weekly_notes = sum(s.notes_played or 0 for s in weekly_sessions)
    
    # Daily breakdown
    daily_practice = {}
    for session in weekly_sessions:
        day = session.started_at.strftime("%Y-%m-%d")
        daily_practice[day] = daily_practice.get(day, 0) + (session.duration_seconds or 0)
    
    # Lessons progress
    lessons_in_progress = LessonProgress.query.filter(
        LessonProgress.user_id == user_id,
        LessonProgress.overall_progress > 0,
        LessonProgress.overall_progress < 100
    ).count()
    
    # Songs in progress
    songs_in_progress = SongProgress.query.filter(
        SongProgress.user_id == user_id,
        SongProgress.overall_progress > 0,
        SongProgress.overall_progress < 100
    ).count()
    
    return jsonify({
        "totalPracticeMinutes": user.total_practice_minutes,
        "streakDays": user.streak_days,
        "lessonsCompleted": user.lessons_completed,
        "songsLearned": user.songs_learned,
        "dailyGoalMinutes": user.daily_goal_minutes,
        "weeklyStats": {
            "practiceTimeSeconds": weekly_practice_time,
            "notesPlayed": weekly_notes,
            "sessionsCount": len(weekly_sessions),
            "dailyBreakdown": daily_practice
        },
        "inProgress": {
            "lessons": lessons_in_progress,
            "songs": songs_in_progress
        }
    })


@progress_bp.route("/sessions", methods=["GET"])
@jwt_required()
def get_sessions():
    """Get user's practice session history."""
    user_id = int(get_jwt_identity())
    
    page = request.args.get("page", 1, type=int)
    page_size = request.args.get("pageSize", 10, type=int)
    
    pagination = PracticeSession.query.filter_by(
        user_id=user_id
    ).order_by(
        PracticeSession.started_at.desc()
    ).paginate(page=page, per_page=page_size, error_out=False)
    
    return jsonify({
        "data": [s.to_dict() for s in pagination.items],
        "pagination": {
            "page": pagination.page,
            "pageSize": pagination.per_page,
            "total": pagination.total,
            "totalPages": pagination.pages
        }
    })


@progress_bp.route("/streak", methods=["GET"])
@jwt_required()
def get_streak():
    """Get user's streak information."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Get last 7 days of practice
    week_ago = datetime.utcnow() - timedelta(days=7)
    
    daily_totals = db.session.query(
        func.date(PracticeSession.started_at).label('date'),
        func.sum(PracticeSession.duration_seconds).label('total')
    ).filter(
        PracticeSession.user_id == user_id,
        PracticeSession.started_at >= week_ago
    ).group_by(
        func.date(PracticeSession.started_at)
    ).all()
    
    # Convert to list of minutes for last 7 days
    weekly_practice = []
    for i in range(6, -1, -1):
        day = (datetime.utcnow() - timedelta(days=i)).date()
        minutes = 0
        for dt, total in daily_totals:
            if dt == day:
                minutes = (total or 0) // 60
                break
        weekly_practice.append(minutes)
    
    return jsonify({
        "currentStreak": user.streak_days,
        "lastPracticeDate": user.last_practice_at.isoformat() if user.last_practice_at else None,
        "weeklyPractice": weekly_practice  # Last 7 days, minutes per day
    })


@progress_bp.route("/achievements", methods=["GET"])
@jwt_required()
def get_achievements():
    """Get user's achievements (MVP stub)."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Simple achievement system for MVP
    achievements = []
    
    if user.lessons_completed >= 1:
        achievements.append({
            "id": "first_lesson",
            "title": "First Steps",
            "description": "Complete your first lesson",
            "icon": "🎵",
            "unlockedAt": None  # Would track actual date
        })
    
    if user.songs_learned >= 1:
        achievements.append({
            "id": "first_song",
            "title": "Melody Maker",
            "description": "Learn your first song",
            "icon": "🎹",
            "unlockedAt": None
        })
    
    if user.streak_days >= 7:
        achievements.append({
            "id": "week_streak",
            "title": "Dedicated",
            "description": "Practice for 7 days in a row",
            "icon": "🔥",
            "unlockedAt": None
        })
    
    if user.total_practice_minutes >= 60:
        achievements.append({
            "id": "hour_practice",
            "title": "Practice Hour",
            "description": "Practice for a total of 1 hour",
            "icon": "⏱️",
            "unlockedAt": None
        })
    
    return jsonify(achievements)
