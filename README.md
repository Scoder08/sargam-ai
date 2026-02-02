# 🎹 Sargam AI

> AI-powered music tutor for Indian learners. Learn piano with Bollywood songs.
> **Gamified like Duolingo — using the Hook Model for retention.**

---

## 🎯 Product Overview

### Hook Model Implementation

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    TRIGGER ──────► ACTION ──────► VARIABLE ──────► INVESTMENT
│       │              │            REWARD            │
│       │              │              │               │
│   Daily push      Practice        XP, Gems,       Streak,
│   notifications   a lesson        Chests,         Level,
│                                   Surprises       Purchases
│       │                                            │
│       └────────────────────────────────────────────┘
│                    (Loop continues)
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

| Feature | Description |
|---------|-------------|
| 🎹 **Piano Practice** | Interactive keyboard with real-time feedback |
| 🎵 **Bollywood Songs** | Learn your favorite songs (Tum Hi Ho, Pehla Nasha, etc.) |
| ⭐ **XP System** | Earn experience points for every practice |
| 💎 **Gems** | Virtual currency to unlock songs |
| 🔥 **Streaks** | Daily practice tracking with rewards |
| 🏆 **Achievements** | 14+ badges to unlock |
| 📊 **Leaderboard** | Compete with other learners |
| 🎁 **Reward Chests** | Variable rewards after sessions |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 (`npm install -g pnpm`)
- **Python** >= 3.11

### 1. Clone & Install Frontend

```bash
# Install dependencies
pnpm install

# Start web app
pnpm dev:web
```

### 2. Setup Backend

```bash
cd apps/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env

# Initialize database
flask init-db

# Seed with sample data
flask seed-db

# Start server
python run.py
```

### 3. Open in Browser

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api/v1
- **Health Check**: http://localhost:8000/health

---

## 📁 Project Structure

```
sargam-ai/
├── apps/
│   ├── web/                    # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/     # UI components
│   │   │   │   ├── Piano/      # Interactive piano
│   │   │   │   ├── StatsBar.tsx
│   │   │   │   └── RewardPopup.tsx
│   │   │   ├── pages/          # App pages
│   │   │   │   ├── HomePage.tsx      # Daily goal, continue, streak
│   │   │   │   ├── SongsPage.tsx     # Song library (locked/unlocked)
│   │   │   │   ├── LessonsPage.tsx   # Structured lessons
│   │   │   │   ├── PracticePage.tsx  # Real-time practice
│   │   │   │   ├── ProfilePage.tsx   # Stats & achievements
│   │   │   │   └── ShopPage.tsx      # Buy gems/premium
│   │   │   ├── hooks/          # Custom hooks
│   │   │   │   ├── useMIDI.ts        # Web MIDI API
│   │   │   │   └── usePracticeSocket.ts
│   │   │   └── layouts/
│   │   └── package.json
│   │
│   ├── backend/                # Flask API
│   │   ├── app/
│   │   │   ├── api/           # REST endpoints
│   │   │   │   ├── auth.py
│   │   │   │   ├── lessons.py
│   │   │   │   ├── songs.py
│   │   │   │   ├── gamification.py   # XP, gems, streaks
│   │   │   │   └── progress.py
│   │   │   ├── sockets/       # WebSocket handlers
│   │   │   │   └── practice.py       # Real-time feedback
│   │   │   ├── services/      # Business logic
│   │   │   │   ├── scoring_service.py  # ⭐ CORE IP
│   │   │   │   └── practice_service.py
│   │   │   └── models/        # Database models
│   │   │       ├── user.py
│   │   │       ├── gamification.py   # XP, gems, achievements
│   │   │       └── lesson.py
│   │   └── run.py
│   │
│   └── mobile/                 # React Native (V2)
│
├── packages/
│   ├── core/                   # Shared business logic
│   ├── api/                    # API client + hooks
│   └── types/                  # TypeScript types
│
└── docs/
    └── GAMIFICATION.md         # Full gamification design
```

---

## 🎮 Gamification System

### XP & Levels

```
XP Rewards:
├── Correct note: +1 XP
├── Section complete: +10 XP
├── Lesson complete: +25 XP
├── Song mastered: +100 XP
├── Perfect score bonus: +50 XP
└── Daily goal reached: +20 XP
```

| Level | XP Required | Unlock |
|-------|-------------|--------|
| 1 | 0 | - |
| 2 | 100 | - |
| 3 | 300 | - |
| 5 | 1,000 | Achievement |
| 10 | 5,500 | Achievement |

### Gem Economy

**Earning Gems:**
- 7-day streak: +50 gems
- Achievement unlock: +10-100 gems
- Daily goal: +5 gems
- Open chest: +2-50 gems (random)

**Spending Gems:**
- Unlock premium song: 200 gems
- Streak freeze: 100 gems

### Achievements (14 total)

| Badge | Name | How to Unlock | Reward |
|-------|------|---------------|--------|
| 🎵 | First Steps | Play first note | 10 💎 |
| 📚 | Student | Complete first lesson | 15 💎 |
| 🎶 | Melody Maker | Learn first song | 25 💎 |
| 🔥 | Week Warrior | 7-day streak | 50 💎 |
| 💪 | Dedicated | 30-day streak | 200 💎 |
| ⚡ | Unstoppable | 100-day streak | 750 💎 |
| ⭐ | Rising Star | Learn 5 songs | 50 💎 |
| 🌟 | Bollywood Fan | Learn 25 songs | 200 💎 |
| 💯 | Perfectionist | 100% on any song | 30 💎 |
| 🏅 | Flawless | 10 perfect scores | 150 💎 |

### Reward Chests

| Chest | When | XP | Gems |
|-------|------|-----|------|
| 🥉 Bronze | Score 50-79% | 10-30 | 2-8 |
| 🥈 Silver | Score 80-94% | 30-75 | 8-20 |
| 🥇 Gold | Score 95%+ | 75-150 | 20-50 |

---

## 🔌 API Reference

### REST Endpoints

```
Auth:
POST   /api/v1/auth/signup          # Register
POST   /api/v1/auth/login           # Login
GET    /api/v1/auth/me              # Current user

Songs:
GET    /api/v1/songs                # List songs
GET    /api/v1/songs/:id            # Get song
GET    /api/v1/songs/:id/tutorial   # Get tutorial

Lessons:
GET    /api/v1/lessons/modules      # List modules
GET    /api/v1/lessons/:id          # Get lesson

Gamification:
GET    /api/v1/gamification/stats       # XP, gems, level
POST   /api/v1/gamification/add-xp      # Add XP
GET    /api/v1/gamification/streak      # Streak info
POST   /api/v1/gamification/streak/update
GET    /api/v1/gamification/achievements
POST   /api/v1/gamification/gems/spend
GET    /api/v1/gamification/chests      # Unopened chests
POST   /api/v1/gamification/chests/:id/open
GET    /api/v1/gamification/leaderboard
```

### WebSocket (Real-time Practice)

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8000');

// 1. Authenticate
socket.emit('authenticate', { token: 'jwt_token' });
socket.on('authenticated', () => console.log('Ready!'));

// 2. Start session
socket.emit('start_session', {
  sessionType: 'song',
  songId: 1,
  expectedNotes: [
    { midiNote: 64, startTime: 0, duration: 500 },
    { midiNote: 67, startTime: 600, duration: 500 },
  ],
  tempo: 85
});

// 3. Send played notes (from MIDI input)
socket.emit('note_played', {
  midiNote: 64,       // Middle C = 60
  velocity: 100,      // 0-127
  timestamp: 1234.5   // ms since session start
});

// 4. Receive real-time feedback
socket.on('feedback', (data) => {
  // { result: 'correct'|'wrong_note'|'early'|'late',
  //   expectedNote: 64, playedNote: 64,
  //   timingDiff: 50, message: 'Perfect! 🎉' }
});

// 5. Stats updates
socket.on('stats_update', (data) => {
  // { notesPlayed: 10, notesCorrect: 8, progress: 50 }
});

// 6. End session
socket.emit('end_session');
socket.on('session_ended', (data) => {
  // { overallScore: 85, grade: 'A', chestType: 'gold' }
});
```

---

## 🎹 MIDI & Keyboard Input

### With MIDI Keyboard

Plug in USB MIDI keyboard → Browser asks for permission → Play!

### Without MIDI (Testing)

Use computer keyboard:

| Key | Note | Key | Note |
|-----|------|-----|------|
| A | C4 | W | C#4 |
| S | D4 | E | D#4 |
| D | E4 | | |
| F | F4 | T | F#4 |
| G | G4 | Y | G#4 |
| H | A4 | U | A#4 |
| J | B4 | | |
| K | C5 | | |

---

## 💰 Monetization

### Free Tier
- 2 free songs (rotating)
- Basic lessons
- Ads between sessions
- 5 gems/day limit

### Premium (₹199/month)
- All 50+ songs
- No ads
- Unlimited gem earning
- Streak freeze included
- Early access to new songs

### Gem Packs
| Pack | Gems | Price |
|------|------|-------|
| Starter | 500 | ₹79 |
| Popular | 1,500 (+200 bonus) | ₹199 |
| Pro | 5,000 (+1,000 bonus) | ₹499 |
| Ultimate | 15,000 (+5,000 bonus) | ₹999 |

---

## 🛠 Development

### Frontend Commands

```bash
pnpm install      # Install all deps
pnpm dev:web      # Start dev server (port 5173)
pnpm build:web    # Production build
pnpm lint         # Lint code
```

### Backend Commands

```bash
cd apps/backend
source venv/bin/activate

flask init-db     # Create database tables
flask seed-db     # Seed sample data
python run.py     # Start server (port 8000)
```

### Environment Variables

```env
# Backend (.env)
FLASK_ENV=development
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
DATABASE_URL=sqlite:///sargam.db
CORS_ORIGINS=http://localhost:5173
```

---

## 📊 MVP Metrics to Track

| Metric | Target | Why |
|--------|--------|-----|
| D1 Retention | >40% | First hook worked |
| D7 Retention | >20% | Habit forming |
| Avg session | >8 min | Good engagement |
| 7+ day streak | >30% DAU | Investment building |
| Conversion | >5% | Monetization |

---

## 🚢 Deployment

### Frontend → Vercel

```bash
vercel --prod
```

### Backend → Railway/Render

Set environment variables:
```
FLASK_ENV=production
DATABASE_URL=postgresql://...
SECRET_KEY=<strong-random-key>
JWT_SECRET_KEY=<strong-random-key>
CORS_ORIGINS=https://your-frontend.vercel.app
```

---

## 📱 V2 Roadmap

- [ ] React Native mobile app (reuse packages/core)
- [ ] Microphone input with pitch detection
- [ ] AI coaching feedback (Claude API)
- [ ] Guitar support
- [ ] "Request a Song" feature
- [ ] Friends & challenges
- [ ] Auto song-to-tutorial conversion

---

## 📄 License

Proprietary — All rights reserved.

---

Built with ❤️ for Indian music learners.
# sargam-ai
