"""
Database Models

Export all SQLAlchemy models for easy importing.
"""

from .user import User, OTP
from .lesson import Lesson, LessonModule, Song, SongTutorial, UserUnlockedSong
from .progress import LessonProgress, SongProgress, PracticeSession
from .gamification import UserGamification, Achievement, UserAchievement, RewardChest, seed_achievements

__all__ = [
    "User",
    "OTP",
    "Lesson",
    "LessonModule",
    "Song",
    "SongTutorial",
    "UserUnlockedSong",
    "LessonProgress",
    "SongProgress",
    "PracticeSession",
    "UserGamification",
    "Achievement",
    "UserAchievement",
    "RewardChest",
    "seed_achievements",
]
