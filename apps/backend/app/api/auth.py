"""
Authentication API

Endpoints for user authentication including OTP-based phone auth.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
    create_access_token
)
from marshmallow import Schema, fields, validate, ValidationError
from ..services import auth_service
from ..models import User, OTP, UserGamification
from ..extensions import db
from datetime import datetime, timedelta
import random

auth_bp = Blueprint("auth", __name__)


# ─────────────────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────────────────

class SignupSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=6))
    name = fields.Str(required=True, validate=validate.Length(min=2, max=100))


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)


class SendOTPSchema(Schema):
    phone = fields.Str(required=True, validate=validate.Regexp(r'^\+?[1-9]\d{9,14}$'))


class VerifyOTPSchema(Schema):
    phone = fields.Str(required=True, validate=validate.Regexp(r'^\+?[1-9]\d{9,14}$'))
    code = fields.Str(required=True, validate=validate.Length(equal=6))
    name = fields.Str(validate=validate.Length(min=2, max=100))


class UpdateProfileSchema(Schema):
    name = fields.Str(validate=validate.Length(min=2, max=100))
    avatarUrl = fields.Str()
    preferredInstrument = fields.Str(validate=validate.OneOf(["piano", "guitar", "harmonium"]))
    skillLevel = fields.Str(validate=validate.OneOf(["beginner", "intermediate", "advanced"]))
    preferredLanguage = fields.Str(validate=validate.OneOf(["en", "hi", "ta", "te", "bn", "mr"]))
    dailyGoalMinutes = fields.Int(validate=validate.Range(min=5, max=120))
    notificationsEnabled = fields.Bool()
    metronomeEnabled = fields.Bool()
    defaultTempo = fields.Int(validate=validate.Range(min=40, max=200))


signup_schema = SignupSchema()
login_schema = LoginSchema()
send_otp_schema = SendOTPSchema()
verify_otp_schema = VerifyOTPSchema()
update_profile_schema = UpdateProfileSchema()


# ─────────────────────────────────────────────────────────────────────────────
# OTP Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@auth_bp.route("/otp/send", methods=["POST"])
def send_otp():
    """Send OTP to phone number."""
    try:
        data = send_otp_schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({"error": "Validation error", "details": err.messages}), 400

    phone = data["phone"]

    # Invalidate any existing OTPs for this phone
    OTP.query.filter_by(phone=phone, verified=False).delete()

    # Generate 6-digit OTP
    code = str(random.randint(100000, 999999))

    # Create OTP record (expires in 10 minutes)
    otp = OTP(
        phone=phone,
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.session.add(otp)
    db.session.commit()

    # Check if user exists
    user_exists = User.query.filter_by(phone=phone).first() is not None

    # In dev mode, return the OTP (in production, send via SMS)
    return jsonify({
        "success": True,
        "message": "OTP sent successfully",
        "userExists": user_exists,
        "otp": code  # Remove this in production!
    })


@auth_bp.route("/otp/verify", methods=["POST"])
def verify_otp():
    """Verify OTP and login/register user."""
    try:
        data = verify_otp_schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({"error": "Validation error", "details": err.messages}), 400

    phone = data["phone"]
    code = data["code"]
    name = data.get("name")

    # Find the most recent valid OTP for this phone
    otp = OTP.query.filter_by(
        phone=phone,
        verified=False
    ).order_by(OTP.created_at.desc()).first()

    if not otp:
        return jsonify({"error": "No OTP found. Please request a new one."}), 400

    if otp.is_expired:
        return jsonify({"error": "OTP expired. Please request a new one."}), 400

    # Increment attempts
    otp.attempts += 1

    if otp.code != code:
        db.session.commit()
        remaining = 5 - otp.attempts
        if remaining <= 0:
            return jsonify({"error": "Too many attempts. Please request a new OTP."}), 400
        return jsonify({"error": f"Invalid OTP. {remaining} attempts remaining."}), 400

    # OTP verified
    otp.verified = True

    # Find or create user
    user = User.query.filter_by(phone=phone).first()
    is_new_user = False

    if not user:
        # New user - create account
        if not name:
            name = f"User{phone[-4:]}"  # Default name from phone digits

        user = User(name=name, phone=phone)
        db.session.add(user)
        db.session.flush()  # Get user.id

        # Create gamification record for new user
        gamification = UserGamification(user_id=user.id, gems=100)  # 100 gems welcome bonus
        db.session.add(gamification)
        is_new_user = True

    user.update_last_login()
    db.session.commit()

    # Generate tokens
    tokens = auth_service.generate_tokens(user)
    tokens["isNewUser"] = is_new_user

    return jsonify(tokens)


# ─────────────────────────────────────────────────────────────────────────────
# Email/Password Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@auth_bp.route("/signup", methods=["POST"])
def signup():
    """Register a new user with email/password."""
    try:
        data = signup_schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({"error": "Validation error", "details": err.messages}), 400

    user, error = auth_service.register(
        email=data["email"],
        password=data["password"],
        name=data["name"]
    )

    if error:
        return jsonify({"error": error}), 400

    # Create gamification record
    gamification = UserGamification(user_id=user.id, gems=100)
    db.session.add(gamification)
    db.session.commit()

    # Generate tokens
    tokens = auth_service.generate_tokens(user)

    return jsonify(tokens), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate user with email/password."""
    try:
        data = login_schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({"error": "Validation error", "details": err.messages}), 400

    user, error = auth_service.login(
        email=data["email"],
        password=data["password"]
    )

    if error:
        return jsonify({"error": error}), 401

    # Generate tokens
    tokens = auth_service.generate_tokens(user)

    return jsonify(tokens)


# ─────────────────────────────────────────────────────────────────────────────
# Profile Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    """Get current user profile with gamification stats."""
    user_id = int(get_jwt_identity())
    user = auth_service.get_user_by_id(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Get gamification data
    gamification = UserGamification.query.filter_by(user_id=user_id).first()

    response = user.to_dict()
    if gamification:
        response["gamification"] = gamification.to_dict()

    return jsonify(response)


@auth_bp.route("/profile", methods=["PATCH"])
@jwt_required()
def update_profile():
    """Update user profile."""
    user_id = int(get_jwt_identity())
    user = auth_service.get_user_by_id(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    try:
        data = update_profile_schema.load(request.get_json())
    except ValidationError as err:
        return jsonify({"error": "Validation error", "details": err.messages}), 400

    # Convert camelCase to snake_case
    updates = {}
    field_mapping = {
        "avatarUrl": "avatar_url",
        "preferredInstrument": "preferred_instrument",
        "skillLevel": "skill_level",
        "preferredLanguage": "preferred_language",
        "dailyGoalMinutes": "daily_goal_minutes",
        "notificationsEnabled": "notifications_enabled",
        "metronomeEnabled": "metronome_enabled",
        "defaultTempo": "default_tempo"
    }

    for camel, snake in field_mapping.items():
        if camel in data:
            updates[snake] = data[camel]
    if "name" in data:
        updates["name"] = data["name"]

    user = auth_service.update_profile(user, updates)

    return jsonify(user.to_dict())


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token."""
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=user_id)

    return jsonify({"accessToken": access_token})


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    """Logout user (client should discard tokens)."""
    return jsonify({"message": "Logged out successfully"})
