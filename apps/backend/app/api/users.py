"""
Users API

Endpoints for user management.
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import User

users_bp = Blueprint("users", __name__)


@users_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Get current user's full profile."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify(user.to_dict())


@users_bp.route("/me/preferences", methods=["GET"])
@jwt_required()
def get_preferences():
    """Get user's preferences."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "dailyGoalMinutes": user.daily_goal_minutes,
        "notificationsEnabled": user.notifications_enabled,
        "metronomeEnabled": user.metronome_enabled,
        "defaultTempo": user.default_tempo,
        "preferredInstrument": user.preferred_instrument,
        "skillLevel": user.skill_level,
        "preferredLanguage": user.preferred_language
    })


@users_bp.route("/me/subscription", methods=["GET"])
@jwt_required()
def get_subscription():
    """Get user's subscription status."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify({
        "isPremium": user.is_active_premium,
        "premiumUntil": user.premium_until.isoformat() if user.premium_until else None
    })
