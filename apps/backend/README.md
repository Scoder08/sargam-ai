# Sargam AI — Backend

Flask-based backend for the AI music tutor platform.

## Quick Start

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up environment
cp .env.example .env
# Edit .env with your settings

# 4. Initialize database
flask init-db

# 5. Seed with sample data (optional)
flask seed-db

# 6. Run the server
python run.py
```

## API Overview

Base URL: `http://localhost:8000/api/v1`

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/login` | Login user |
| GET | `/auth/me` | Get current user |
| PATCH | `/auth/profile` | Update profile |
| POST | `/auth/refresh` | Refresh access token |

### Lessons
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/lessons/modules` | Get all modules |
| GET | `/lessons/modules/:id` | Get module with lessons |
| GET | `/lessons` | Get paginated lessons |
| GET | `/lessons/:id` | Get lesson details |
| GET | `/lessons/:id/progress` | Get lesson progress |
| PATCH | `/lessons/:id/progress` | Update progress |

### Songs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/songs` | Get paginated songs |
| GET | `/songs/:id` | Get song details |
| GET | `/songs/:id/tutorial` | Get song tutorial |
| GET | `/songs/search` | Search songs |
| GET | `/songs/popular` | Get popular songs |

### Progress
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/progress/stats` | Get user statistics |
| GET | `/progress/sessions` | Get practice history |
| GET | `/progress/streak` | Get streak info |

## WebSocket Events

Connect to: `ws://localhost:8000/socket.io`

### Client → Server

```javascript
// 1. Authenticate
socket.emit('authenticate', { token: 'jwt_token' });

// 2. Start practice session
socket.emit('start_session', {
  sessionType: 'song',
  songId: 1,
  expectedNotes: [
    { midiNote: 60, startTime: 0, duration: 500 },
    { midiNote: 64, startTime: 500, duration: 500 },
  ],
  tempo: 80
});

// 3. Send played notes
socket.emit('note_played', {
  midiNote: 60,
  velocity: 100,
  timestamp: 123.45  // ms since session start
});

// 4. End session
socket.emit('end_session');
```

### Server → Client

```javascript
// Authentication result
socket.on('authenticated', { userId: 1 });
socket.on('auth_error', { message: 'Invalid token' });

// Session events
socket.on('session_started', { sessionId: 'uuid', totalNotes: 10 });

// Real-time feedback
socket.on('feedback', {
  result: 'correct' | 'wrong_note' | 'early' | 'late',
  expectedNote: 60,
  playedNote: 60,
  timingDiff: 50,
  scoreDelta: 10,
  message: 'Perfect!'
});

// Stats updates
socket.on('stats_update', {
  notesPlayed: 5,
  notesCorrect: 4,
  currentScore: 40,
  progress: 50
});

// Session end
socket.on('session_ended', {
  overallScore: 85,
  accuracy: 90,
  grade: 'A',
  message: 'Excellent work!'
});
```

## Development

```bash
# Run in debug mode
FLASK_DEBUG=1 python run.py

# Run tests
pytest

# Format code
black app/

# Lint
flake8 app/
```

## Production Deployment

```bash
# Use gunicorn with eventlet
gunicorn -k eventlet -w 1 -b 0.0.0.0:8000 run:app

# Or with gevent
gunicorn -k gevent -w 1 -b 0.0.0.0:8000 run:app
```

For production, also:
1. Set `FLASK_ENV=production`
2. Use PostgreSQL instead of SQLite
3. Set up Redis for WebSocket scaling
4. Configure proper `SECRET_KEY` and `JWT_SECRET_KEY`
