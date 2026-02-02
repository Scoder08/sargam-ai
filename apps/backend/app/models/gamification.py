"""
Gamification Models

XP, Gems, Streaks, Achievements, Rewards
"""

from datetime import datetime, timedelta
from ..extensions import db
import json


class UserGamification(db.Model):
    """Extended gamification data for users."""

    __tablename__ = "user_gamification"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)

    # XP & Levels
    total_xp = db.Column(db.Integer, default=0)
    level = db.Column(db.Integer, default=1)

    # Currency
    gems = db.Column(db.Integer, default=50)  # Start with 50 gems

    # Streaks
    current_streak = db.Column(db.Integer, default=0)
    longest_streak = db.Column(db.Integer, default=0)
    last_practice_date = db.Column(db.Date)
    streak_freezes = db.Column(db.Integer, default=0)

    # Daily goal
    daily_goal_minutes = db.Column(db.Integer, default=15)
    today_practice_minutes = db.Column(db.Integer, default=0)
    last_goal_reset = db.Column(db.Date)

    # Stats
    total_lessons_completed = db.Column(db.Integer, default=0)
    total_songs_learned = db.Column(db.Integer, default=0)
    total_practice_sessions = db.Column(db.Integer, default=0)
    perfect_scores = db.Column(db.Integer, default=0)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship("User", backref=db.backref("gamification", uselist=False))
    achievements = db.relationship("UserAchievement", back_populates="user_gamification", lazy="dynamic")

    # XP thresholds for levels
    LEVEL_THRESHOLDS = [
        0,      # Level 1
        100,    # Level 2
        300,    # Level 3
        600,    # Level 4
        1000,   # Level 5
        1500,   # Level 6
        2200,   # Level 7
        3000,   # Level 8
        4000,   # Level 9
        5500,   # Level 10
        7500,   # Level 11
        10000,  # Level 12
        13000,  # Level 13
        17000,  # Level 14
        22000,  # Level 15
        28000,  # Level 16
        35000,  # Level 17
        43000,  # Level 18
        52000,  # Level 19
        62000,  # Level 20
    ]

    def add_xp(self, amount: int) -> dict:
        """Add XP and handle level up."""
        old_level = self.level
        self.total_xp += amount

        # Calculate new level
        new_level = 1
        for i, threshold in enumerate(self.LEVEL_THRESHOLDS):
            if self.total_xp >= threshold:
                new_level = i + 1
            else:
                break

        self.level = min(new_level, 20)  # Cap at level 20

        leveled_up = self.level > old_level
        if leveled_up:
            # Bonus gems for leveling up
            if self.gems is None:
                self.gems = 50
            self.gems += 25 * (self.level - old_level)

        return {
            "xpAdded": amount,
            "totalXp": self.total_xp,
            "level": self.level,
            "leveledUp": leveled_up,
            "oldLevel": old_level,
        }

    def add_gems(self, amount: int):
        """Add gems."""
        if self.gems is None:
            self.gems = 50  # Default starting gems
        self.gems += amount

    def spend_gems(self, amount: int) -> bool:
        """Spend gems if user has enough."""
        if self.gems is None:
            self.gems = 50  # Default starting gems
        if self.gems >= amount:
            self.gems -= amount
            return True
        return False

    def update_streak(self) -> dict:
        """Update streak based on practice today."""
        today = datetime.utcnow().date()

        if self.last_practice_date is None:
            # First practice ever
            self.current_streak = 1
            self.last_practice_date = today
        elif self.last_practice_date == today:
            # Already practiced today, no change
            pass
        elif self.last_practice_date == today - timedelta(days=1):
            # Practiced yesterday, extend streak
            self.current_streak += 1
        else:
            # Missed days - check for streak freeze
            days_missed = (today - self.last_practice_date).days - 1
            if days_missed <= self.streak_freezes:
                self.streak_freezes -= days_missed
                self.current_streak += 1
            else:
                # Streak broken
                self.current_streak = 1

        self.last_practice_date = today

        # Update longest streak
        if self.current_streak > self.longest_streak:
            self.longest_streak = self.current_streak

        # Milestone rewards
        milestone_reward = self._check_streak_milestone()

        return {
            "currentStreak": self.current_streak,
            "longestStreak": self.longest_streak,
            "milestoneReward": milestone_reward,
        }

    def _check_streak_milestone(self) -> dict | None:
        """Check if streak hit a milestone."""
        milestones = {
            7: 50,    # 7 days = 50 gems
            14: 100,  # 14 days = 100 gems
            30: 200,  # 30 days = 200 gems
            60: 400,
            100: 750,
            365: 2000,
        }

        if self.current_streak in milestones:
            gems = milestones[self.current_streak]
            self.gems += gems
            return {"days": self.current_streak, "gems": gems}
        return None

    def update_daily_goal(self, minutes: int) -> dict:
        """Update daily goal progress."""
        today = datetime.utcnow().date()

        # Reset if new day
        if self.last_goal_reset != today:
            self.today_practice_minutes = 0
            self.last_goal_reset = today

        self.today_practice_minutes += minutes
        goal_reached = self.today_practice_minutes >= self.daily_goal_minutes

        # Bonus XP for reaching goal
        bonus_xp = 0
        if goal_reached and (self.today_practice_minutes - minutes) < self.daily_goal_minutes:
            bonus_xp = 20
            self.total_xp += bonus_xp

        return {
            "todayMinutes": self.today_practice_minutes,
            "goalMinutes": self.daily_goal_minutes,
            "goalReached": goal_reached,
            "bonusXp": bonus_xp,
        }

    def get_xp_for_next_level(self) -> int:
        """Get XP needed for next level."""
        if self.level >= len(self.LEVEL_THRESHOLDS):
            return 0
        return self.LEVEL_THRESHOLDS[self.level] - self.total_xp

    def to_dict(self):
        """Convert to dictionary."""
        return {
            "totalXp": self.total_xp,
            "level": self.level,
            "xpForNextLevel": self.get_xp_for_next_level(),
            "gems": self.gems,
            "currentStreak": self.current_streak,
            "longestStreak": self.longest_streak,
            "streakFreezes": self.streak_freezes,
            "dailyGoalMinutes": self.daily_goal_minutes,
            "todayPracticeMinutes": self.today_practice_minutes,
            "goalReachedToday": self.today_practice_minutes >= self.daily_goal_minutes,
            "totalLessonsCompleted": self.total_lessons_completed,
            "totalSongsLearned": self.total_songs_learned,
            "perfectScores": self.perfect_scores,
        }


class Achievement(db.Model):
    """Achievement definitions."""

    __tablename__ = "achievements"

    id = db.Column(db.String(50), primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    icon = db.Column(db.String(10), default="🏆")
    category = db.Column(db.String(50), default="general")
    gem_reward = db.Column(db.Integer, default=10)
    xp_reward = db.Column(db.Integer, default=50)
    requirement_type = db.Column(db.String(50))  # streak, songs, lessons, score, etc.
    requirement_value = db.Column(db.Integer)
    is_hidden = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "icon": self.icon,
            "category": self.category,
            "gemReward": self.gem_reward,
            "xpReward": self.xp_reward,
        }


class UserAchievement(db.Model):
    """User's unlocked achievements."""

    __tablename__ = "user_achievements"

    id = db.Column(db.Integer, primary_key=True)
    user_gamification_id = db.Column(db.Integer, db.ForeignKey("user_gamification.id"), nullable=False)
    achievement_id = db.Column(db.String(50), db.ForeignKey("achievements.id"), nullable=False)
    unlocked_at = db.Column(db.DateTime, default=datetime.utcnow)

    user_gamification = db.relationship("UserGamification", back_populates="achievements")
    achievement = db.relationship("Achievement")

    __table_args__ = (
        db.UniqueConstraint("user_gamification_id", "achievement_id", name="unique_user_achievement"),
    )

    def to_dict(self):
        return {
            **self.achievement.to_dict(),
            "unlockedAt": self.unlocked_at.isoformat(),
        }


class RewardChest(db.Model):
    """Reward chests earned by users."""

    __tablename__ = "reward_chests"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    chest_type = db.Column(db.String(20), default="bronze")  # bronze, silver, gold
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)
    opened_at = db.Column(db.DateTime)
    contents_json = db.Column(db.Text)  # JSON of rewards

    @staticmethod
    def generate_contents(chest_type: str) -> dict:
        """Generate random chest contents."""
        import random

        rewards = {"xp": 0, "gems": 0}

        if chest_type == "bronze":
            rewards["xp"] = random.randint(10, 30)
            rewards["gems"] = random.randint(2, 8)
        elif chest_type == "silver":
            rewards["xp"] = random.randint(30, 75)
            rewards["gems"] = random.randint(8, 20)
        elif chest_type == "gold":
            rewards["xp"] = random.randint(75, 150)
            rewards["gems"] = random.randint(20, 50)

        return rewards

    def open(self) -> dict:
        """Open the chest and return contents."""
        if self.opened_at:
            return json.loads(self.contents_json)

        contents = self.generate_contents(self.chest_type)
        self.contents_json = json.dumps(contents)
        self.opened_at = datetime.utcnow()

        return contents

    def to_dict(self):
        return {
            "id": self.id,
            "chestType": self.chest_type,
            "earnedAt": self.earned_at.isoformat(),
            "opened": self.opened_at is not None,
            "contents": json.loads(self.contents_json) if self.contents_json else None,
        }


def seed_achievements():
    """Seed default achievements."""
    achievements = [
        # Beginner
        {"id": "first_note", "title": "First Steps", "description": "Play your first note", "icon": "🎵", "category": "beginner", "gem_reward": 10, "xp_reward": 25, "requirement_type": "notes_played", "requirement_value": 1},
        {"id": "first_lesson", "title": "Student", "description": "Complete your first lesson", "icon": "📚", "category": "beginner", "gem_reward": 15, "xp_reward": 50, "requirement_type": "lessons", "requirement_value": 1},
        {"id": "first_song", "title": "Melody Maker", "description": "Learn your first song", "icon": "🎶", "category": "beginner", "gem_reward": 25, "xp_reward": 100, "requirement_type": "songs", "requirement_value": 1},

        # Streaks
        {"id": "streak_7", "title": "Week Warrior", "description": "7-day practice streak", "icon": "🔥", "category": "streak", "gem_reward": 50, "xp_reward": 100, "requirement_type": "streak", "requirement_value": 7},
        {"id": "streak_30", "title": "Dedicated", "description": "30-day practice streak", "icon": "💪", "category": "streak", "gem_reward": 200, "xp_reward": 500, "requirement_type": "streak", "requirement_value": 30},
        {"id": "streak_100", "title": "Unstoppable", "description": "100-day practice streak", "icon": "⚡", "category": "streak", "gem_reward": 750, "xp_reward": 2000, "requirement_type": "streak", "requirement_value": 100},

        # Progress
        {"id": "songs_5", "title": "Rising Star", "description": "Learn 5 songs", "icon": "⭐", "category": "progress", "gem_reward": 50, "xp_reward": 200, "requirement_type": "songs", "requirement_value": 5},
        {"id": "songs_25", "title": "Bollywood Fan", "description": "Learn 25 songs", "icon": "🌟", "category": "progress", "gem_reward": 200, "xp_reward": 1000, "requirement_type": "songs", "requirement_value": 25},
        {"id": "perfect_score", "title": "Perfectionist", "description": "Get 100% on any song", "icon": "💯", "category": "skill", "gem_reward": 30, "xp_reward": 150, "requirement_type": "perfect_scores", "requirement_value": 1},
        {"id": "perfect_10", "title": "Flawless", "description": "Get 10 perfect scores", "icon": "🏅", "category": "skill", "gem_reward": 150, "xp_reward": 500, "requirement_type": "perfect_scores", "requirement_value": 10},

        # Levels
        {"id": "level_5", "title": "Getting Serious", "description": "Reach level 5", "icon": "📈", "category": "level", "gem_reward": 50, "xp_reward": 0, "requirement_type": "level", "requirement_value": 5},
        {"id": "level_10", "title": "Committed", "description": "Reach level 10", "icon": "🎯", "category": "level", "gem_reward": 150, "xp_reward": 0, "requirement_type": "level", "requirement_value": 10},

        # Time-based
        {"id": "night_owl", "title": "Night Owl", "description": "Practice after 10 PM", "icon": "🦉", "category": "special", "gem_reward": 15, "xp_reward": 50, "requirement_type": "special", "requirement_value": 0, "is_hidden": True},
        {"id": "early_bird", "title": "Early Bird", "description": "Practice before 7 AM", "icon": "🐦", "category": "special", "gem_reward": 15, "xp_reward": 50, "requirement_type": "special", "requirement_value": 0, "is_hidden": True},
    ]

    for ach_data in achievements:
        ach = Achievement.query.get(ach_data["id"])
        if not ach:
            ach = Achievement(**ach_data)
            db.session.add(ach)

    db.session.commit()
