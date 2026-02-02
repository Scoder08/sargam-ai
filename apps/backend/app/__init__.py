"""
Flask Application Factory

Creates and configures the Flask application.
"""

from flask import Flask, jsonify
import click
from .config import get_config
from .extensions import db, migrate, jwt, ma, cors, socketio


def create_app(config_class=None):
    """
    Application factory pattern.

    Args:
        config_class: Configuration class to use. If None, uses environment-based config.

    Returns:
        Configured Flask application.
    """
    app = Flask(__name__)

    # Load configuration
    if config_class is None:
        config_class = get_config()
    app.config.from_object(config_class)

    # Initialize extensions
    _init_extensions(app)

    # Register blueprints
    _register_blueprints(app)

    # Register WebSocket handlers
    _register_sockets(app)

    # Register error handlers
    _register_error_handlers(app)

    # Register CLI commands
    _register_cli_commands(app)

    return app


def _init_extensions(app):
    """Initialize Flask extensions."""
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    ma.init_app(app)

    # CORS configuration
    cors.init_app(
        app,
        origins=app.config["CORS_ORIGINS"],
        supports_credentials=True,
    )

    # SocketIO configuration
    socketio.init_app(
        app,
        cors_allowed_origins=app.config["CORS_ORIGINS"],
        message_queue=app.config.get("SOCKETIO_MESSAGE_QUEUE"),
        async_mode="eventlet",  # Use eventlet for production
    )


def _register_blueprints(app):
    """Register API blueprints."""
    from .api import auth_bp, lessons_bp, songs_bp, progress_bp, users_bp, gamification_bp, admin_bp

    api_prefix = f"/api/{app.config['API_VERSION']}"

    app.register_blueprint(auth_bp, url_prefix=f"{api_prefix}/auth")
    app.register_blueprint(lessons_bp, url_prefix=f"{api_prefix}/lessons")
    app.register_blueprint(songs_bp, url_prefix=f"{api_prefix}/songs")
    app.register_blueprint(progress_bp, url_prefix=f"{api_prefix}/progress")
    app.register_blueprint(users_bp, url_prefix=f"{api_prefix}/users")
    app.register_blueprint(gamification_bp, url_prefix=f"{api_prefix}/gamification")
    app.register_blueprint(admin_bp, url_prefix=f"{api_prefix}/admin")

    # Health check endpoint
    @app.route("/health")
    def health():
        return jsonify({"status": "healthy", "app": app.config["APP_NAME"]})


def _register_sockets(app):
    """Register WebSocket event handlers."""
    from .sockets import practice  # noqa: F401 - Registers handlers on import


def _register_error_handlers(app):
    """Register error handlers."""

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "Bad request", "message": str(error)}), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({"error": "Unauthorized", "message": "Authentication required"}), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({"error": "Forbidden", "message": "Access denied"}), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Not found", "message": "Resource not found"}), 404

    @app.errorhandler(422)
    def unprocessable(error):
        return jsonify({"error": "Unprocessable entity", "message": str(error)}), 422

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Internal server error", "message": "Something went wrong"}), 500


def _register_cli_commands(app):
    """Register custom CLI commands."""

    @app.cli.command("init-db")
    def init_db():
        """Initialize the database with tables."""
        db.create_all()
        print("Database initialized.")

    @app.cli.command("seed-db")
    def seed_db():
        """Seed database with sample data."""
        from .utils.seed import seed_database
        seed_database()
        print("Database seeded.")

    @app.cli.command("add-gems")
    @click.argument("user_id", type=int)
    @click.argument("amount", type=int)
    def add_gems(user_id, amount):
        """Add gems to a user. Usage: flask add-gems <user_id> <amount>"""
        from .models import User, UserGamification

        # First check if user exists
        user = User.query.get(user_id)
        if not user:
            print(f"Error: User {user_id} does not exist. Please login first to create your account.")
            return

        gamification = UserGamification.query.filter_by(user_id=user_id).first()
        if not gamification:
            gamification = UserGamification(user_id=user_id)
            db.session.add(gamification)
        old_gems = gamification.gems if gamification.gems else 0
        gamification.add_gems(amount)
        db.session.commit()
        print(f"Added {amount} gems to user {user_id} ({user.name}). Total: {old_gems} -> {gamification.gems}")

    @app.cli.command("make-admin")
    @click.argument("user_id", type=int)
    def make_admin(user_id):
        """Make a user an admin. Usage: flask make-admin <user_id>"""
        from .models import User

        user = User.query.get(user_id)
        if not user:
            print(f"Error: User {user_id} does not exist.")
            return

        user.is_admin = True
        db.session.commit()
        print(f"User {user_id} ({user.name}) is now an admin.")

    @app.cli.command("revoke-admin")
    @click.argument("user_id", type=int)
    def revoke_admin(user_id):
        """Revoke admin status from a user. Usage: flask revoke-admin <user_id>"""
        from .models import User

        user = User.query.get(user_id)
        if not user:
            print(f"Error: User {user_id} does not exist.")
            return

        user.is_admin = False
        db.session.commit()
        print(f"Admin status revoked from user {user_id} ({user.name}).")

    @app.cli.command("list-admins")
    def list_admins():
        """List all admin users."""
        from .models import User

        admins = User.query.filter_by(is_admin=True).all()
        if not admins:
            print("No admin users found.")
            return

        print("Admin users:")
        for admin in admins:
            print(f"  - {admin.id}: {admin.name} ({admin.email or admin.phone})")
