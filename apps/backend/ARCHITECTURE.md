# Sargam AI — Backend Architecture

> Flask-based backend for the AI music tutor platform.

## 🏗️ Architecture Overview

```
backend/
├── app/
│   ├── __init__.py              # Flask app factory
│   ├── config.py                # Configuration management
│   ├── extensions.py            # Flask extensions (db, socketio, etc.)
│   │
│   ├── api/                     # REST API blueprints
│   │   ├── __init__.py
│   │   ├── auth.py              # Authentication endpoints
│   │   ├── lessons.py           # Lesson CRUD
│   │   ├── songs.py             # Song library
│   │   ├── progress.py          # User progress
│   │   └── users.py             # User management
│   │
│   ├── sockets/                 # WebSocket handlers
│   │   ├── __init__.py
│   │   └── practice.py          # Real-time practice session
│   │
│   ├── services/                # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py      # Authentication logic
│   │   ├── lesson_service.py    # Lesson operations
│   │   ├── scoring_service.py   # 🎯 Core scoring engine
│   │   └── progress_service.py  # Progress tracking
│   │
│   ├── models/                  # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── lesson.py
│   │   ├── song.py
│   │   └── progress.py
│   │
│   ├── schemas/                 # Pydantic/Marshmallow schemas
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── lesson.py
│   │   └── song.py
│   │
│   └── utils/                   # Utilities
│       ├── __init__.py
│       ├── decorators.py        # Auth decorators
│       └── helpers.py           # Common helpers
│
├── migrations/                  # Alembic migrations
├── tests/                       # Test suite
├── requirements.txt
├── .env.example
└── run.py                       # Entry point
```

---

## 🎯 Design Principles

### 1. **Layered Architecture**
```
Routes (API/Sockets) → Services → Models/DB
         ↑                ↑
      Schemas         Business Logic
```

### 2. **Single Responsibility**
- Routes: HTTP handling only
- Services: Business logic only
- Models: Data representation only

### 3. **Dependency Injection**
- Services receive dependencies via constructor
- Easy to test and mock

---

## 🔌 Key Components

### Flask Extensions
| Extension | Purpose |
|-----------|---------|
| Flask-SQLAlchemy | Database ORM |
| Flask-SocketIO | WebSocket support |
| Flask-JWT-Extended | JWT authentication |
| Flask-Migrate | Database migrations |
| Flask-CORS | Cross-origin requests |
| Flask-Marshmallow | Serialization |

### WebSocket Events (Practice Session)
| Event | Direction | Payload |
|-------|-----------|---------|
| `join_session` | Client → Server | `{ session_id }` |
| `note_played` | Client → Server | `{ note, velocity, timestamp }` |
| `feedback` | Server → Client | `{ result, score, message }` |
| `session_end` | Server → Client | `{ final_score, stats }` |

---

## 🚀 Why This Architecture?

1. **Testable**: Each layer can be unit tested independently
2. **Scalable**: Easy to add new features without touching existing code
3. **Maintainable**: Clear separation makes debugging easier
4. **Claude-friendly**: Small, focused files that AI can understand and modify

---

## 📊 MVP Async Needs

**For MVP v1 with MIDI-only: NO complex async pipeline needed.**

Reasons:
- MIDI = structured data (no audio processing)
- Scoring = simple math (< 1ms)
- WebSocket handles real-time communication
- SQLite is fast enough for MVP scale

**What Flask-SocketIO gives you:**
- Automatic async handling for WebSocket events
- Room-based sessions for multiple users
- Fallback to long-polling if WebSocket fails

**When you'd need async (V2+):**
- Audio transcription (microphone input)
- AI model inference
- Large file processing
- High concurrent user load (>1000 simultaneous)
