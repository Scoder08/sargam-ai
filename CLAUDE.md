# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install all dependencies
pnpm install

# Start frontend dev server (port 5173)
pnpm dev:web

# Start backend (port 8000) - run in separate terminal
cd apps/backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
flask init-db && flask seed-db
python run.py

# Build all packages
pnpm build

# Run tests
pnpm test                                    # Frontend (Vitest)
cd apps/backend && pytest                    # Backend (pytest)

# Lint and format
pnpm lint
pnpm format
cd apps/backend && black app/ && flake8 app/
```

## Architecture Overview

Turborepo monorepo with a React/Vite frontend and Flask/Python backend.

### Package Structure
- **`apps/web`** — React + Vite + Tailwind frontend
- **`apps/backend`** — Flask REST API + SocketIO for real-time practice
- **`packages/core`** — Shared Zustand stores, hooks, utilities (platform-agnostic)
- **`packages/api`** — API client (ky wrapper) + React Query hooks
- **`packages/types`** — Shared TypeScript interfaces

### Backend Layers (Flask)
```
API Routes (app/api/*.py)
  → Services (app/services/*.py)
    → Models (app/models/*.py) + SQLAlchemy
```

Key services:
- `scoring_service.py` — Real-time note evaluation with ±150ms timing tolerance
- `practice_service.py` — Session management
- Flask blueprints registered with `/api/v1` prefix

### Frontend State
- **Zustand stores** in `packages/core/src/store/` — userStore, gamificationStore, lessonStore
- **React Query** for server state caching via `@sargam/api` hooks
- **WebSocket** via `usePracticeSocket` hook for real-time practice feedback

### Real-time Practice Flow
1. Piano component captures MIDI/keyboard input (A-K keys → notes)
2. `usePracticeSocket` sends `note_played` events to Flask SocketIO
3. Backend `ScoringService` evaluates note against expected timing/pitch
4. Server returns `feedback` event with score and message
5. UI updates via Zustand store

## Code Conventions

### Backend (Python)
- One model per file in `app/models/`
- Blueprints use `@bp.route()`, registered in `_register_blueprints()`
- Marshmallow schemas in `app/schemas/` for serialization

### Frontend (TypeScript)
- Components use `export default`, hooks use `export function`
- Type imports: `import type { Lesson, User } from '@sargam/types'`
- No barrel exports in component folders — use full paths
- Hooks prefixed with `use` (e.g., `usePracticeSession`)

## Gamification System

Hook Model implementation (XP, gems, hearts, streaks, achievements):
- **Backend**: `app/models/gamification.py`, `app/api/gamification.py`
- **Frontend**: `packages/core/src/store/gamificationStore.ts`
- Level thresholds in `UserGamification.LEVEL_THRESHOLDS` (backend) and `calculateLevel()` (shared)

## Key Files by Task

| Task | Files |
|------|-------|
| Scoring logic | `apps/backend/app/services/scoring_service.py`, `apps/web/src/hooks/usePracticeSocket.ts` |
| Add lesson field | `app/models/lesson.py`, `app/schemas/lesson.py`, `packages/types/src/lesson.ts` |
| Gamification | `app/models/gamification.py`, `gamificationStore.ts` |
| Piano UI | `apps/web/src/components/Piano/` |
