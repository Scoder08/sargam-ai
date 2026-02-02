# Sargam AI — Project Architecture

> AI-powered music tutor for Indian learners. Web-first, mobile-ready.

## 🎯 Design Philosophy

1. **Monorepo with maximum code sharing** — Same business logic runs on web & mobile
2. **Simple over clever** — Easy to understand, easy to onboard new devs
3. **Feature-based organization** — Code grouped by what it does, not what it is
4. **Progressive complexity** — Start simple, add abstractions only when needed

---

## 📁 Project Structure

```
sargam-ai/
├── apps/
│   ├── web/                    # React web app (Vite + React)
│   │   ├── src/
│   │   │   ├── pages/          # Route-based pages
│   │   │   ├── components/     # Web-specific components
│   │   │   ├── layouts/        # Page layouts
│   │   │   └── main.tsx
│   │   ├── public/
│   │   └── package.json
│   │
│   └── mobile/                 # React Native (V2 - placeholder for now)
│       └── README.md
│
├── packages/
│   ├── core/                   # 🧠 Business logic (MOST IMPORTANT)
│   │   ├── src/
│   │   │   ├── hooks/          # Shared React hooks
│   │   │   ├── store/          # Zustand stores (state management)
│   │   │   ├── services/       # Business logic services
│   │   │   ├── utils/          # Helper functions
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── api/                    # API client layer
│   │   ├── src/
│   │   │   ├── client.ts       # Base API client (fetch wrapper)
│   │   │   ├── endpoints/      # Endpoint definitions
│   │   │   ├── hooks/          # React Query hooks
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── ui/                     # Shared UI primitives
│   │   ├── src/
│   │   │   ├── components/     # Button, Input, Card, etc.
│   │   │   ├── icons/          # Icon components
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── types/                  # TypeScript types/interfaces
│       ├── src/
│       │   ├── user.ts
│       │   ├── lesson.ts
│       │   ├── song.ts
│       │   ├── instrument.ts
│       │   └── index.ts
│       └── package.json
│
├── turbo.json                  # Turborepo config
├── package.json                # Root package.json
├── tsconfig.base.json          # Shared TypeScript config
├── .env.example
└── README.md
```

---

## 🔧 Technology Stack

### Core Technologies
| Layer | Technology | Why |
|-------|------------|-----|
| **Monorepo** | Turborepo | Simple, fast, great DX |
| **Language** | TypeScript | Type safety across all packages |
| **Web Framework** | React + Vite | Fast builds, modern tooling |
| **Mobile (V2)** | React Native + Expo | Easy RN setup, same React mental model |
| **Styling** | Tailwind CSS (web) / NativeWind (mobile) | Utility-first, works on both |

### State & Data
| Concern | Technology | Why |
|---------|------------|-----|
| **Client State** | Zustand | Simpler than Redux, works on web + RN |
| **Server State** | TanStack Query (React Query) | Caching, refetching, loading states |
| **Forms** | React Hook Form + Zod | Validation that works everywhere |

### Audio & ML (Future)
| Concern | Technology | Why |
|---------|------------|-----|
| **Audio Playback** | Tone.js (web) / expo-av (mobile) | Industry standard |
| **Pitch Detection** | Web Audio API + ML model | Real-time feedback |
| **MIDI** | WebMIDI / react-native-midi | Piano input |

---

## 🧠 Core Package — The Heart of Code Sharing

The `packages/core` is where 80% of your business logic lives. This code is **100% platform-agnostic**.

### What goes in `core/`?

```typescript
// ✅ YES — Put in core
- useLesson() hook — lesson state & progress logic
- usePracticeSession() — tracking practice time
- calculateAccuracy() — compare user input to expected notes
- formatDuration() — time formatting
- scorePerformance() — grading logic
- Zustand stores — user preferences, lesson state

// ❌ NO — Keep platform-specific
- <PianoKeyboard /> — different UI for web vs mobile
- Audio playback setup — different APIs
- Navigation — React Router vs React Navigation
- Styling — Tailwind vs NativeWind classes
```

### Example: Shared Hook

```typescript
// packages/core/src/hooks/useLesson.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { lessonApi } from '@sargam/api';
import { useLessonStore } from '../store/lessonStore';

export function useLesson(lessonId: string) {
  const { currentProgress, setProgress } = useLessonStore();
  
  const lessonQuery = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => lessonApi.getLesson(lessonId),
  });

  const completeSection = useMutation({
    mutationFn: (sectionId: string) => 
      lessonApi.completeSection(lessonId, sectionId),
    onSuccess: (data) => {
      setProgress(data.progress);
    },
  });

  return {
    lesson: lessonQuery.data,
    isLoading: lessonQuery.isLoading,
    currentProgress,
    completeSection: completeSection.mutate,
  };
}
```

This hook works **identically** on web and mobile. The UI layer just consumes it.

---

## 📱 Web → Mobile Transition Strategy

### Phase 1: Web Launch (Now)
- Build full web app with React + Vite
- All business logic in `packages/core`
- API layer in `packages/api`
- Web-specific UI in `apps/web`

### Phase 2: Mobile Prep (Before V2)
- Audit `packages/core` — ensure nothing web-specific leaked in
- Create `packages/ui` primitives using react-native-web compatible patterns
- Set up Expo project in `apps/mobile`

### Phase 3: Mobile Launch (V2)
- Import all hooks/stores from `packages/core` (works immediately)
- Build mobile-specific UI components
- Reuse `packages/api` completely
- Only rebuild: navigation, platform UI, audio playback

**Expected code reuse: 60-70%** (all business logic, API, types, utils)

---

## 🎵 Feature Modules (Recommended Structure)

For a music tutor, organize features like this:

```
apps/web/src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── SignupForm.tsx
│   │   ├── pages/
│   │   │   └── LoginPage.tsx
│   │   └── index.ts
│   │
│   ├── lessons/
│   │   ├── components/
│   │   │   ├── LessonCard.tsx
│   │   │   ├── LessonPlayer.tsx
│   │   │   └── ProgressBar.tsx
│   │   ├── pages/
│   │   │   ├── LessonListPage.tsx
│   │   │   └── LessonPage.tsx
│   │   └── index.ts
│   │
│   ├── practice/
│   │   ├── components/
│   │   │   ├── PianoKeyboard.tsx
│   │   │   ├── NoteDisplay.tsx
│   │   │   └── FeedbackOverlay.tsx
│   │   ├── pages/
│   │   │   └── PracticePage.tsx
│   │   └── index.ts
│   │
│   ├── songs/
│   │   ├── components/
│   │   │   ├── SongCard.tsx
│   │   │   ├── SongTutorial.tsx
│   │   │   └── ChordDisplay.tsx
│   │   ├── pages/
│   │   │   ├── SongLibraryPage.tsx
│   │   │   └── SongTutorialPage.tsx
│   │   └── index.ts
│   │
│   └── profile/
│       ├── components/
│       │   └── ProgressStats.tsx
│       └── pages/
│           └── ProfilePage.tsx
```

---

## 🔒 Environment Variables

```bash
# .env.example

# API
VITE_API_URL=http://localhost:8000
VITE_API_VERSION=v1

# Auth (Supabase recommended for MVP)
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# Analytics
VITE_POSTHOG_KEY=your-posthog-key

# Feature Flags
VITE_ENABLE_SONG_TUTORIALS=true
VITE_ENABLE_AI_FEEDBACK=false
```

---

## 📦 Package Dependencies (Recommended)

### Root package.json
```json
{
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

### apps/web dependencies
```
react, react-dom
react-router-dom
@tanstack/react-query
tailwindcss
tone (audio)
```

### packages/core dependencies
```
zustand
zod
date-fns
```

### packages/api dependencies
```
@tanstack/react-query
ky (or axios)
```

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
pnpm install

# Run web dev server
pnpm dev --filter=web

# Build all packages
pnpm build

# Add dependency to specific package
pnpm add lodash --filter=@sargam/core

# Run tests
pnpm test
```

---

## 🎯 MVP Feature Checklist

### V1.0 — Web Launch
- [ ] User auth (signup, login, profile)
- [ ] Instrument selection (Piano only for MVP)
- [ ] Lesson library (beginner → intermediate)
- [ ] Lesson player with progress tracking
- [ ] Basic piano keyboard UI
- [ ] 5-10 Bollywood song tutorials
- [ ] Subscription/payment (Razorpay)

### V1.5 — AI Features
- [ ] Real-time pitch detection
- [ ] Accuracy scoring
- [ ] AI feedback on timing/rhythm
- [ ] Personalized lesson recommendations

### V2.0 — Mobile App
- [ ] React Native app (iOS + Android)
- [ ] Offline lesson downloads
- [ ] Push notifications
- [ ] Guitar support

---

## 💡 Key Architectural Decisions

### Why Turborepo over Nx?
- Simpler setup, less config
- Faster for small teams
- Easy to eject if needed

### Why Zustand over Redux?
- 70% less boilerplate
- Works identically on web and React Native
- Easier to learn for new devs

### Why Feature-based folders?
- Scales better than type-based (components/, hooks/, etc.)
- Easier to find related code
- Easier to delete features

### Why not Next.js?
- For a music tutor, you need heavy client-side interactivity
- SSR adds complexity without benefit for this use case
- Vite is faster for development
- Easier transition to React Native later

---

## 📚 Resources

- [Turborepo Docs](https://turbo.build/repo/docs)
- [Zustand Guide](https://docs.pmnd.rs/zustand)
- [TanStack Query](https://tanstack.com/query)
- [Tone.js](https://tonejs.github.io/)
- [React Native Web](https://necolas.github.io/react-native-web/)

---

*Last updated: January 2026*
