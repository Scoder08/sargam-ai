"""
Authentication Service

Handles user authentication logic.
"""

from typing import Optional, Tuple
from flask_jwt_extended import create_access_token, create_refresh_token
from ..models import User
from ..extensions import db


class AuthService:
    """Authentication operations."""

    def register(
        self,
        email: str,
        password: str,
        name: str
    ) -> Tuple[Optional[User], Optional[str]]:
        """
        Register a new user.
        
        Args:
            email: User email
            password: User password
            name: User display name
            
        Returns:
            Tuple of (user, error_message)
        """
        # Check if email already exists
        existing = User.query.filter_by(email=email.lower()).first()
        if existing:
            return None, "Email already registered"
        
        # Create user
        user = User(
            email=email.lower(),
            password=password,
            name=name
        )
        
        db.session.add(user)
        db.session.commit()
        
        return user, None

    def login(
        self,
        email: str,
        password: str
    ) -> Tuple[Optional[User], Optional[str]]:
        """
        Authenticate a user.
        
        Args:
            email: User email
            password: User password
            
        Returns:
            Tuple of (user, error_message)
        """
        user = User.query.filter_by(email=email.lower()).first()
        
        if not user:
            return None, "Invalid email or password"
        
        if not user.check_password(password):
            return None, "Invalid email or password"
        
        # Update last login
        user.update_last_login()
        
        return user, None

    def generate_tokens(self, user: User) -> dict:
        """
        Generate JWT tokens for a user.
        
        Args:
            user: User instance
            
        Returns:
            Dictionary with access_token and refresh_token
        """
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={
                "email": user.email,
                "name": user.name,
                "isPremium": user.is_active_premium
            }
        )

        refresh_token = create_refresh_token(identity=str(user.id))
        
        return {
            "accessToken": access_token,
            "refreshToken": refresh_token,
            "user": user.to_dict()
        }

    def get_user_by_id(self, user_id) -> Optional[User]:
        """Get user by ID (accepts string or int)."""
        return User.query.get(int(user_id))

    def update_profile(
        self,
        user: User,
        updates: dict
    ) -> User:
        """
        Update user profile.
        
        Args:
            user: User instance
            updates: Dictionary of fields to update
            
        Returns:
            Updated user
        """
        allowed_fields = [
            "name",
            "avatar_url",
            "preferred_instrument",
            "skill_level",
            "preferred_language",
            "timezone",
            "daily_goal_minutes",
            "notifications_enabled",
            "metronome_enabled",
            "default_tempo"
        ]
        
        for field in allowed_fields:
            if field in updates:
                setattr(user, field, updates[field])
        
        db.session.commit()
        return user


# Singleton instance
auth_service = AuthService()
