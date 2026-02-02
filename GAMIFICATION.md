# 🎮 Sargam AI — Gamification System

> Duolingo-inspired Hook Model for music learning

## The Hook Model

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   TRIGGER ──────► ACTION ──────► REWARD ──────► INVESTMENT │
│      │                              │               │       │
│      │                              ▼               │       │
│      │                        (Variable!)           │       │
│      │                              │               │       │
│      └──────────────────────────────┴───────────────┘       │
│                         (Loop)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ TRIGGERS

### External Triggers (Push user back)
| Trigger | When | Message Example |
|---------|------|-----------------|
| Streak reminder | 8 PM if not practiced | "🔥 Don't lose your 7-day streak!" |
| Daily goal | Morning | "Your piano misses you! 5 min today?" |
| New song | When added | "🎵 Kesariya just dropped! Learn it now" |
| Friend activity | When friend practices | "Rahul just learned Tum Hi Ho!" |
| Streak freeze warning | 10 PM | "⚠️ 2 hours left to keep your streak!" |

### Internal Triggers (User feels)
- Bored → "Let me learn a song"
- Heard a song → "I want to play that!"
- Competitive → "Beat my friend's XP"
- Guilt → "I'll lose my streak"

---

## 2️⃣ ACTION (Core Loop)

### Primary Actions
```
Pick Song/Lesson → Practice → Get Scored → Earn Rewards
```

### Friction Reducers
- One-tap to continue last session
- "5 min quick practice" option
- Offline mode for practiced songs

---

## 3️⃣ VARIABLE REWARDS (The Magic)

### 3.1 XP (Experience Points)
| Action | XP Earned |
|--------|-----------|
| Complete lesson section | 10 XP |
| Finish full lesson | 50 XP |
| Perfect score (90%+) | +20 XP bonus |
| First try success | +10 XP bonus |
| Daily goal complete | 25 XP |
| Song mastered (80%+) | 100 XP |

### 3.2 Gems 💎 (Premium Currency)
| How to Earn | Gems |
|-------------|------|
| Complete daily goal | 5 💎 |
| 7-day streak | 50 💎 |
| 30-day streak | 200 💎 |
| Perfect lesson | 10 💎 |
| Watch ad (optional) | 5 💎 |
| Refer friend | 100 💎 |
| Achievement unlocked | 10-50 💎 |

| How to Spend | Cost |
|--------------|------|
| Unlock premium song | 100 💎 |
| Streak freeze (1 day) | 50 💎 |
| Heart refill (5 hearts) | 30 💎 |
| Skip lesson | 20 💎 |

### 3.3 Hearts ❤️ (Lives System)
- Start with **5 hearts**
- Lose 1 heart per failed attempt (score < 50%)
- Hearts regenerate: **1 heart per 30 minutes**
- Max hearts: 5
- Premium users: **Unlimited hearts**

### 3.4 Streaks 🔥
```
Day 1: 🔥
Day 3: 🔥🔥🔥 + 10 gems
Day 7: 🔥 Weekly chest (50 gems)
Day 14: 🔥 + Badge
Day 30: 🔥 Monthly chest (200 gems) + Special badge
Day 100: 🔥 Legendary badge
Day 365: 🔥 Ultimate badge + Free month premium
```

### 3.5 Levels & Leagues
```
Level 1-10: Bronze League
Level 11-25: Silver League  
Level 26-50: Gold League
Level 51-100: Platinum League
Level 100+: Diamond League
```

Weekly leaderboard within league. Top 10 promote, bottom 10 demote.

### 3.6 Achievements 🏆
| Achievement | Requirement | Reward |
|-------------|-------------|--------|
| First Notes | Complete first lesson | 10 💎 |
| Melody Maker | Learn first song | 25 💎 |
| Week Warrior | 7-day streak | 50 💎 |
| Perfectionist | 5 perfect scores | 30 💎 |
| Song Collector | Learn 10 songs | 100 💎 |
| Speed Demon | Finish lesson in <3 min | 20 💎 |
| Night Owl | Practice after 10 PM | 10 💎 |
| Early Bird | Practice before 7 AM | 10 💎 |
| Social Star | Refer 3 friends | 150 💎 |

---

## 4️⃣ INVESTMENT (Lock-in)

### What users invest:
1. **Time** — Streaks they don't want to lose
2. **Progress** — XP, levels, unlocked songs
3. **Money** — Gems purchased
4. **Social** — Friends, league position
5. **Identity** — "I'm learning piano" self-image

### Investment Mechanics:
- Streaks create daily habit
- Unlocked songs feel "owned"
- League position creates competition
- Progress bar on songs shows investment
- "X days until next achievement" creates anticipation

---

## 💰 Monetization Tiers

### Free Tier
- 2 free songs (rotate monthly)
- 5 hearts (regenerate)
- Basic lessons
- Ads between sessions
- Earn gems slowly

### Premium (₹199/month)
- All songs unlocked
- Unlimited hearts
- No ads
- Streak freezes included
- Priority new songs
- Exclusive badges

### Gem Packs (IAP)
| Pack | Gems | Price | Bonus |
|------|------|-------|-------|
| Starter | 100 💎 | ₹79 | — |
| Popular | 500 💎 | ₹299 | +50 bonus |
| Best Value | 1500 💎 | ₹799 | +300 bonus |
| Ultimate | 5000 💎 | ₹1999 | +1500 bonus |

---

## 🎨 UI Components Needed

### Global (Always Visible)
```
┌─────────────────────────────────────────┐
│ 🔥 7   💎 250   ❤️ 4/5   ⭐ Level 12   │
└─────────────────────────────────────────┘
```

### Home Screen
- Daily goal progress ring
- Continue learning card
- Streak calendar
- Quick actions

### Practice Complete Screen
```
┌─────────────────────────────────────┐
│                                     │
│         ⭐ Great Job! ⭐            │
│                                     │
│            Score: 87%               │
│                                     │
│     +50 XP     +10 💎     🔥+1     │
│                                     │
│   [Continue]    [Share]             │
│                                     │
└─────────────────────────────────────┘
```

### Reward Animations
- XP counter flying up
- Gems sparkling
- Streak fire growing
- Level up celebration
- Achievement unlock popup

---

## 📱 User Journey (First 7 Days)

### Day 1: Onboarding
1. Pick instrument (piano)
2. Skill level quiz
3. Play first notes (tutorial)
4. Unlock: First song free!
5. Set daily goal (5/10/15 min)
6. Push notification permission

### Day 2: First Streak
1. Reminder notification
2. Continue yesterday's song
3. Complete it → 🔥 2-day streak!
4. Unlock: Second free song

### Day 3: Competition
1. Show friend's activity
2. Introduce leagues
3. "Beat Rahul's score!"

### Day 4: Variable Reward
1. Mystery chest appears
2. Random reward (gems/XP/song)
3. "Come back tomorrow for another!"

### Day 5: Investment
1. Show progress stats
2. "You've practiced 45 minutes!"
3. Almost unlock achievement

### Day 6: Near Miss
1. Almost perfect score
2. "One more try for perfect!"
3. Hearts running low → gem offer

### Day 7: Weekly Reward
1. 🎉 Weekly chest unlocks!
2. 50 gems + XP boost
3. "Keep going for 30-day reward!"

---

## 🔧 Technical Implementation

### New Database Models
- `UserGamification` (xp, gems, hearts, streak, level)
- `Achievement` (definition)
- `UserAchievement` (unlocked)
- `DailyChallenge`
- `LeagueStanding`

### New API Endpoints
- `POST /gamification/claim-daily`
- `GET /gamification/stats`
- `POST /gamification/spend-gems`
- `GET /achievements`
- `GET /leaderboard`

### Real-time Events
- XP earned
- Gem earned
- Achievement unlocked
- Streak updated
- Heart lost/gained

---

*This system creates addiction through variable rewards, social pressure, and loss aversion (streaks). Ethical? Debatable. Effective? Absolutely.*
