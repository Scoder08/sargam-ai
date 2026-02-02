"""
Gamification API

Endpoints for XP, gems, streaks, achievements, and rewards.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import User, UserGamification, Achievement, UserAchievement, RewardChest
from ..extensions import db
from datetime import datetime
import random

gamification_bp = Blueprint("gamification", __name__)


# ─────────────────────────────────────────────────────────────────────────────
# Stats & Overview
# ─────────────────────────────────────────────────────────────────────────────

@gamification_bp.route("/stats", methods=["GET"])
@jwt_required()
def get_stats():
    """Get user's gamification stats."""
    user_id = int(get_jwt_identity())

    # Get or create gamification record
    gamification = UserGamification.query.filter_by(user_id=user_id).first()
    if not gamification:
        gamification = UserGamification(user_id=user_id)
        db.session.add(gamification)
        db.session.commit()

    return jsonify(gamification.to_dict())


@gamification_bp.route("/add-xp", methods=["POST"])
@jwt_required()
def add_xp():
    """Add XP to user (called after practice sessions)."""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    amount = data.get("amount", 0)

    if amount <= 0:
        return jsonify({"error": "Invalid XP amount"}), 400

    gamification = UserGamification.query.filter_by(user_id=user_id).first()
    if not gamification:
        gamification = UserGamification(user_id=user_id)
        db.session.add(gamification)
    
    result = gamification.add_xp(amount)
    db.session.commit()
    
    # Check for level-based achievements
    _check_level_achievements(gamification)
    
    return jsonify(result)


# ─────────────────────────────────────────────────────────────────────────────
# Gems
# ─────────────────────────────────────────────────────────────────────────────

@gamification_bp.route("/gems", methods=["GET"])
@jwt_required()
def get_gems():
    """Get user's gem balance."""
    user_id = int(get_jwt_identity())
    gamification = UserGamification.query.filter_by(user_id=user_id).first()
    
    if not gamification:
        return jsonify({"gems": 50})  # Default starting gems
    
    return jsonify({"gems": gamification.gems})


@gamification_bp.route("/gems/spend", methods=["POST"])
@jwt_required()
def spend_gems():
    """Spend gems (unlock songs, buy items)."""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    amount = data.get("amount", 0)
    item_type = data.get("itemType")  # song, streak_freeze, etc.
    item_id = data.get("itemId")
    
    if amount <= 0:
        return jsonify({"error": "Invalid amount"}), 400
    
    gamification = UserGamification.query.filter_by(user_id=user_id).first()
    if not gamification:
        return jsonify({"error": "User not found"}), 404
    
    if not gamification.spend_gems(amount):
        return jsonify({"error": "Not enough gems", "required": amount, "current": gamification.gems}), 400
    
    # Handle specific item types
    if item_type == "streak_freeze":
        gamification.streak_freezes += 1
    
    db.session.commit()
    
    return jsonify({
        "success": True,
        "gemsRemaining": gamification.gems,
        "itemType": item_type,
        "itemId": item_id
    })


@gamification_bp.route("/gems/add", methods=["POST"])
@jwt_required()
def add_gems():
    """Add gems (from purchases or rewards)."""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    amount = data.get("amount", 0)
    source = data.get("source", "reward")  # purchase, reward, achievement

    if amount <= 0:
        return jsonify({"error": "Invalid amount"}), 400

    gamification = UserGamification.query.filter_by(user_id=user_id).first()
    if not gamification:
        gamification = UserGamification(user_id=user_id)
        db.session.add(gamification)
    
    gamification.add_gems(amount)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "gemsAdded": amount,
        "totalGems": gamification.gems,
        "source": source
    })


# ─────────────────────────────────────────────────────────────────────────────
# Streaks
# ─────────────────────────────────────────────────────────────────────────────

@gamification_bp.route("/streak", methods=["GET"])
@jwt_required()
def get_streak():
    """Get user's streak info."""
    user_id = int(get_jwt_identity())
    gamification = UserGamification.query.filter_by(user_id=user_id).first()
    
    if not gamification:
        return jsonify({
            "currentStreak": 0,
            "longestStreak": 0,
            "streakFreezes": 0,
            "lastPracticeDate": None
        })
    
    return jsonify({
        "currentStreak": gamification.current_streak,
        "longestStreak": gamification.longest_streak,
        "streakFreezes": gamification.streak_freezes,
        "lastPracticeDate": gamification.last_practice_date.isoformat() if gamification.last_practice_date else None
    })


@gamification_bp.route("/streak/update", methods=["POST"])
@jwt_required()
def update_streak():
    """Update streak after practice."""
    user_id = int(get_jwt_identity())

    gamification = UserGamification.query.filter_by(user_id=user_id).first()
    if not gamification:
        gamification = UserGamification(user_id=user_id)
        db.session.add(gamification)
    
    result = gamification.update_streak()
    db.session.commit()
    
    # Check streak achievements
    _check_streak_achievements(gamification)
    
    return jsonify(result)


# ─────────────────────────────────────────────────────────────────────────────
# Daily Goal
# ─────────────────────────────────────────────────────────────────────────────

@gamification_bp.route("/daily-goal", methods=["GET"])
@jwt_required()
def get_daily_goal():
    """Get daily goal progress."""
    user_id = int(get_jwt_identity())
    gamification = UserGamification.query.filter_by(user_id=user_id).first()
    
    if not gamification:
        return jsonify({
            "goalMinutes": 15,
            "todayMinutes": 0,
            "goalReached": False
        })
    
    # Reset if new day
    today = datetime.utcnow().date()
    if gamification.last_goal_reset != today:
        gamification.today_practice_minutes = 0
        gamification.last_goal_reset = today
        db.session.commit()
    
    return jsonify({
        "goalMinutes": gamification.daily_goal_minutes,
        "todayMinutes": gamification.today_practice_minutes,
        "goalReached": gamification.today_practice_minutes >= gamification.daily_goal_minutes
    })


@gamification_bp.route("/daily-goal/update", methods=["POST"])
@jwt_required()
def update_daily_goal_progress():
    """Update daily goal progress."""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    minutes = data.get("minutes", 0)

    gamification = UserGamification.query.filter_by(user_id=user_id).first()
    if not gamification:
        gamification = UserGamification(user_id=user_id)
        db.session.add(gamification)
    
    result = gamification.update_daily_goal(minutes)
    db.session.commit()
    
    return jsonify(result)


@gamification_bp.route("/daily-goal/set", methods=["POST"])
@jwt_required()
def set_daily_goal():
    """Set daily goal minutes."""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    minutes = data.get("minutes", 15)

    if not 5 <= minutes <= 120:
        return jsonify({"error": "Goal must be between 5 and 120 minutes"}), 400

    gamification = UserGamification.query.filter_by(user_id=user_id).first()
    if not gamification:
        gamification = UserGamification(user_id=user_id)
        db.session.add(gamification)
    
    gamification.daily_goal_minutes = minutes
    db.session.commit()
    
    return jsonify({"goalMinutes": minutes})


# ─────────────────────────────────────────────────────────────────────────────
# Achievements
# ─────────────────────────────────────────────────────────────────────────────

@gamification_bp.route("/achievements", methods=["GET"])
@jwt_required()
def get_achievements():
    """Get all achievements with unlock status."""
    user_id = int(get_jwt_identity())

    gamification = UserGamification.query.filter_by(user_id=user_id).first()
    
    all_achievements = Achievement.query.filter_by(is_hidden=False).all()
    unlocked_ids = set()
    
    if gamification:
        unlocked = UserAchievement.query.filter_by(user_gamification_id=gamification.id).all()
        unlocked_ids = {ua.achievement_id for ua in unlocked}
    
    result = []
    for ach in all_achievements:
        result.append({
            **ach.to_dict(),
            "unlocked": ach.id in unlocked_ids
        })
    
    return jsonify(result)


@gamification_bp.route("/achievements/check", methods=["POST"])
@jwt_required()
def check_achievements():
    """Check and unlock any new achievements."""
    user_id = int(get_jwt_identity())

    gamification = UserGamification.query.filter_by(user_id=user_id).first()
    if not gamification:
        return jsonify({"unlocked": []})
    
    newly_unlocked = []
    
    # Check all achievement types
    newly_unlocked.extend(_check_streak_achievements(gamification))
    newly_unlocked.extend(_check_level_achievements(gamification))
    newly_unlocked.extend(_check_progress_achievements(gamification))
    
    return jsonify({"unlocked": newly_unlocked})


# ─────────────────────────────────────────────────────────────────────────────
# Reward Chests
# ─────────────────────────────────────────────────────────────────────────────

@gamification_bp.route("/chests", methods=["GET"])
@jwt_required()
def get_chests():
    """Get user's unopened chests."""
    user_id = int(get_jwt_identity())

    chests = RewardChest.query.filter_by(
        user_id=user_id,
        opened_at=None
    ).all()

    return jsonify([c.to_dict() for c in chests])


@gamification_bp.route("/chests/earn", methods=["POST"])
@jwt_required()
def earn_chest():
    """Award a chest to user (after completing lesson/song)."""
    user_id = int(get_jwt_identity())
    data = request.get_json()

    # Determine chest type based on performance
    score = data.get("score", 0)
    if score >= 95:
        chest_type = "gold"
    elif score >= 80:
        chest_type = "silver"
    else:
        chest_type = "bronze"

    chest = RewardChest(user_id=user_id, chest_type=chest_type)
    db.session.add(chest)
    db.session.commit()

    return jsonify(chest.to_dict())


@gamification_bp.route("/chests/<int:chest_id>/open", methods=["POST"])
@jwt_required()
def open_chest(chest_id):
    """Open a reward chest."""
    user_id = int(get_jwt_identity())

    chest = RewardChest.query.filter_by(id=chest_id, user_id=user_id).first()
    if not chest:
        return jsonify({"error": "Chest not found"}), 404
    
    if chest.opened_at:
        return jsonify({"error": "Chest already opened"}), 400
    
    # Open chest and get contents
    contents = chest.open()
    
    # Apply rewards
    gamification = UserGamification.query.filter_by(user_id=user_id).first()
    if gamification:
        gamification.add_xp(contents["xp"])
        gamification.add_gems(contents["gems"])
    
    db.session.commit()
    
    return jsonify({
        "chestType": chest.chest_type,
        "contents": contents
    })


# ─────────────────────────────────────────────────────────────────────────────
# Leaderboard
# ─────────────────────────────────────────────────────────────────────────────

@gamification_bp.route("/leaderboard", methods=["GET"])
@jwt_required()
def get_leaderboard():
    """Get weekly leaderboard."""
    user_id = int(get_jwt_identity())
    limit = request.args.get("limit", 20, type=int)

    # Get top users by XP
    top_users = db.session.query(
        User, UserGamification
    ).join(
        UserGamification, User.id == UserGamification.user_id
    ).order_by(
        UserGamification.total_xp.desc()
    ).limit(limit).all()

    leaderboard = []
    user_rank = None

    for rank, (user, gamification) in enumerate(top_users, 1):
        entry = {
            "rank": rank,
            "name": user.name,
            "xp": gamification.total_xp,
            "level": gamification.level,
            "isCurrentUser": user.id == user_id
        }
        leaderboard.append(entry)

        if user.id == user_id:
            user_rank = rank

    return jsonify({
        "leaderboard": leaderboard,
        "userRank": user_rank
    })


# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────

def _check_streak_achievements(gamification) -> list:
    """Check and unlock streak achievements."""
    unlocked = []
    streak = gamification.current_streak
    
    streak_achievements = {
        7: "streak_7",
        30: "streak_30",
        100: "streak_100",
    }
    
    for days, ach_id in streak_achievements.items():
        if streak >= days:
            if _unlock_achievement(gamification, ach_id):
                unlocked.append(ach_id)
    
    return unlocked


def _check_level_achievements(gamification) -> list:
    """Check and unlock level achievements."""
    unlocked = []
    level = gamification.level
    
    level_achievements = {
        5: "level_5",
        10: "level_10",
    }
    
    for lvl, ach_id in level_achievements.items():
        if level >= lvl:
            if _unlock_achievement(gamification, ach_id):
                unlocked.append(ach_id)
    
    return unlocked


def _check_progress_achievements(gamification) -> list:
    """Check and unlock progress achievements."""
    unlocked = []
    
    # Songs learned
    if gamification.total_songs_learned >= 1:
        if _unlock_achievement(gamification, "first_song"):
            unlocked.append("first_song")
    if gamification.total_songs_learned >= 5:
        if _unlock_achievement(gamification, "songs_5"):
            unlocked.append("songs_5")
    
    # Lessons completed
    if gamification.total_lessons_completed >= 1:
        if _unlock_achievement(gamification, "first_lesson"):
            unlocked.append("first_lesson")
    
    # Perfect scores
    if gamification.perfect_scores >= 1:
        if _unlock_achievement(gamification, "perfect_score"):
            unlocked.append("perfect_score")
    if gamification.perfect_scores >= 10:
        if _unlock_achievement(gamification, "perfect_10"):
            unlocked.append("perfect_10")
    
    return unlocked


def _unlock_achievement(gamification, achievement_id: str) -> bool:
    """Unlock an achievement if not already unlocked."""
    # Check if already unlocked
    existing = UserAchievement.query.filter_by(
        user_gamification_id=gamification.id,
        achievement_id=achievement_id
    ).first()
    
    if existing:
        return False
    
    # Get achievement for rewards
    achievement = Achievement.query.get(achievement_id)
    if not achievement:
        return False
    
    # Unlock
    user_ach = UserAchievement(
        user_gamification_id=gamification.id,
        achievement_id=achievement_id
    )
    db.session.add(user_ach)
    
    # Give rewards
    gamification.add_xp(achievement.xp_reward)
    gamification.add_gems(achievement.gem_reward)
    
    db.session.commit()
    return True
