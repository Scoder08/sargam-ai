"""
Lessons API

Endpoints for lesson content and progress.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import Lesson, LessonModule, LessonProgress
from ..extensions import db

lessons_bp = Blueprint("lessons", __name__)


# ─────────────────────────────────────────────────────────────────────────────
# Modules
# ─────────────────────────────────────────────────────────────────────────────

@lessons_bp.route("/modules", methods=["GET"])
def get_modules():
    """Get all lesson modules with their lessons, optionally filtered by instrument."""
    instrument = request.args.get("instrument")

    query = LessonModule.query.order_by(LessonModule.order)

    if instrument:
        query = query.filter_by(instrument=instrument)

    modules = query.all()

    # Include lessons with each module for the lessons page
    return jsonify([m.to_dict(include_lessons=True) for m in modules])


@lessons_bp.route("/modules/<int:module_id>", methods=["GET"])
def get_module(module_id):
    """Get a single module with its lessons."""
    module = LessonModule.query.get_or_404(module_id)
    return jsonify(module.to_dict(include_lessons=True))


# ─────────────────────────────────────────────────────────────────────────────
# Lessons
# ─────────────────────────────────────────────────────────────────────────────

@lessons_bp.route("", methods=["GET"])
def get_lessons():
    """Get paginated lessons with filters."""
    page = request.args.get("page", 1, type=int)
    page_size = request.args.get("pageSize", 10, type=int)
    instrument = request.args.get("instrument")
    skill_level = request.args.get("skillLevel")
    module_id = request.args.get("moduleId", type=int)
    
    query = Lesson.query.order_by(Lesson.order)
    
    if instrument:
        query = query.filter_by(instrument=instrument)
    if skill_level:
        query = query.filter_by(skill_level=skill_level)
    if module_id:
        query = query.filter_by(module_id=module_id)
    
    pagination = query.paginate(page=page, per_page=page_size, error_out=False)
    
    return jsonify({
        "data": [l.to_dict() for l in pagination.items],
        "pagination": {
            "page": pagination.page,
            "pageSize": pagination.per_page,
            "total": pagination.total,
            "totalPages": pagination.pages
        }
    })


@lessons_bp.route("/<int:lesson_id>", methods=["GET"])
def get_lesson(lesson_id):
    """Get a single lesson with full content."""
    lesson = Lesson.query.get_or_404(lesson_id)
    return jsonify(lesson.to_dict(include_sections=True))


# ─────────────────────────────────────────────────────────────────────────────
# Progress
# ─────────────────────────────────────────────────────────────────────────────

@lessons_bp.route("/<int:lesson_id>/progress", methods=["GET"])
@jwt_required()
def get_progress(lesson_id):
    """Get user's progress for a lesson."""
    user_id = int(get_jwt_identity())

    progress = LessonProgress.query.filter_by(
        user_id=user_id,
        lesson_id=lesson_id
    ).first()
    
    if not progress:
        # Return empty progress
        return jsonify({
            "lessonId": lesson_id,
            "sectionsCompleted": [],
            "overallProgress": 0,
            "practiceTimeSeconds": 0
        })
    
    return jsonify(progress.to_dict())


@lessons_bp.route("/<int:lesson_id>/progress", methods=["PATCH"])
@jwt_required()
def update_progress(lesson_id):
    """Update lesson progress."""
    user_id = int(get_jwt_identity())
    data = request.get_json()

    # Get or create progress
    progress = LessonProgress.query.filter_by(
        user_id=user_id,
        lesson_id=lesson_id
    ).first()

    if not progress:
        progress = LessonProgress(user_id=user_id, lesson_id=lesson_id)
        db.session.add(progress)
    
    # Update fields
    if "currentSectionId" in data:
        progress.current_section_id = data["currentSectionId"]
    if "practiceTimeSeconds" in data:
        progress.add_practice_time(data["practiceTimeSeconds"])
    if "bestScore" in data and (progress.best_score is None or data["bestScore"] > progress.best_score):
        progress.best_score = data["bestScore"]
    
    db.session.commit()
    
    return jsonify(progress.to_dict())


@lessons_bp.route("/<int:lesson_id>/sections/<section_id>/complete", methods=["POST"])
@jwt_required()
def complete_section(lesson_id, section_id):
    """Mark a section as complete."""
    user_id = int(get_jwt_identity())

    # Get the lesson to know total sections
    lesson = Lesson.query.get_or_404(lesson_id)
    total_sections = len(lesson.sections)

    # Get or create progress
    progress = LessonProgress.query.filter_by(
        user_id=user_id,
        lesson_id=lesson_id
    ).first()

    if not progress:
        progress = LessonProgress(user_id=user_id, lesson_id=lesson_id)
        db.session.add(progress)
    
    # Mark section complete
    progress.mark_section_complete(section_id)
    progress.update_progress(total_sections)
    
    db.session.commit()
    
    return jsonify(progress.to_dict())


# ─────────────────────────────────────────────────────────────────────────────
# Recommendations
# ─────────────────────────────────────────────────────────────────────────────

@lessons_bp.route("/recommended", methods=["GET"])
@jwt_required()
def get_recommended():
    """Get recommended lessons for user."""
    user_id = int(get_jwt_identity())
    limit = request.args.get("limit", 5, type=int)
    
    # Simple recommendation: lessons user hasn't completed, ordered by difficulty
    # In production, this would be more sophisticated
    
    completed_lesson_ids = db.session.query(LessonProgress.lesson_id).filter(
        LessonProgress.user_id == user_id,
        LessonProgress.overall_progress >= 100
    ).subquery()
    
    lessons = Lesson.query.filter(
        ~Lesson.id.in_(completed_lesson_ids)
    ).order_by(
        Lesson.skill_level,
        Lesson.order
    ).limit(limit).all()
    
    return jsonify([l.to_dict() for l in lessons])


@lessons_bp.route("/recent", methods=["GET"])
@jwt_required()
def get_recent():
    """Get user's recently practiced lessons."""
    user_id = int(get_jwt_identity())
    limit = request.args.get("limit", 5, type=int)
    
    recent_progress = LessonProgress.query.filter_by(
        user_id=user_id
    ).filter(
        LessonProgress.last_attempt_at.isnot(None)
    ).order_by(
        LessonProgress.last_attempt_at.desc()
    ).limit(limit).all()
    
    lesson_ids = [p.lesson_id for p in recent_progress]
    lessons = Lesson.query.filter(Lesson.id.in_(lesson_ids)).all()
    
    # Maintain order
    lessons_dict = {l.id: l for l in lessons}
    ordered_lessons = [lessons_dict[lid] for lid in lesson_ids if lid in lessons_dict]
    
    return jsonify([l.to_dict() for l in ordered_lessons])
