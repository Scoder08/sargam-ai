"""
Flask Extensions

Initialize Flask extensions without app context.
They will be bound to the app in create_app().
"""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_marshmallow import Marshmallow
from flask_cors import CORS
from flask_socketio import SocketIO

# Database ORM
db = SQLAlchemy()

# Database migrations
migrate = Migrate()

# JWT Authentication
jwt = JWTManager()

# Serialization
ma = Marshmallow()

# Cross-Origin Resource Sharing
cors = CORS()

# WebSocket for real-time practice sessions
socketio = SocketIO()
