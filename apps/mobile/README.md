# Sargam AI — Mobile App

> React Native app coming in V2!

## Architecture Ready

The monorepo is already set up for mobile:

1. **Shared packages** — `@sargam/core`, `@sargam/api`, `@sargam/types` work on React Native
2. **Zustand stores** — Same state management
3. **React Query hooks** — Same data fetching

## V2 Setup (Future)

```bash
# Create Expo app
npx create-expo-app@latest mobile --template expo-template-blank-typescript

# Install shared packages
pnpm add @sargam/core @sargam/api @sargam/types

# Install NativeWind for styling
pnpm add nativewind tailwindcss
```

## What to Build

- [ ] Navigation (React Navigation)
- [ ] Piano keyboard component (native performance)
- [ ] Audio playback (expo-av)
- [ ] MIDI support (react-native-midi)
- [ ] Push notifications
- [ ] Offline mode

## Code Reuse Estimate

| Component | Reusable? |
|-----------|-----------|
| Business logic (hooks, stores) | ✅ 100% |
| API client | ✅ 100% |
| Types | ✅ 100% |
| UI components | ❌ Rebuild |
| Navigation | ❌ Rebuild |
| Audio/MIDI | ❌ Rebuild |

**Expected: 60-70% code reuse**
