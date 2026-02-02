# Sargam AI — Gamification System

> Duolingo-style Hook Model for music learning

## 🎯 The Hook Model Applied

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    TRIGGER ──────► ACTION ──────► VARIABLE ──────► INVESTMENT
│       │              │            REWARD            │
│       │              │              │               │
│   "Time to         Play a        XP, Gems,       Progress,
│    practice!"      lesson        Unlocks,        Streaks,
│                                  Surprises       Purchases
│       │                                            │
│       └────────────────────────────────────────────┘
│                    (Loop continues)
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ TRIGGERS (What brings users back)

### External Triggers
| Trigger | When | Message Example |
|---------|------|-----------------|
| **Streak reminder** | 8 PM if not practiced | "🔥 Don't lose your 7-day streak!" |
| **Friend activity** | When friend completes song | "Priya just learned Tum Hi Ho!" |
| **New content** | New song added | "🎵 Kesariya is now available!" |
| **Streak freeze expiring** | 24h before expiry | "Your streak freeze expires tomorrow" |
| **Weekly recap** | Sunday evening | "You practiced 45 mins this week! 🎹" |
| **Milestone approaching** | Near achievement | "2 more songs to unlock Gold Badge!" |

### Internal Triggers
- Boredom → "Let me practice a quick song"
- Hearing a song → "I want to learn that!"
- Guilt → "I should practice today"
- Pride → "Let me show my streak"

---

## 2️⃣ ACTION (Make it easy)

### Friction Reducers
| Feature | How it reduces friction |
|---------|------------------------|
| **Quick Play** | One-tap to continue last song |
| **2-minute lessons** | "I have time for this" |
| **Offline mode** | No excuses |
| **Smart defaults** | Auto-select next lesson |
| **Skip intro** | Jump to practice |

### Action Hierarchy (Daily)
```
1. Open app (1 tap)
2. See "Continue" button (1 tap)
3. Practice 1 section (2 min)
4. Get reward (dopamine)
```

**Target: 3 taps to reward**

---

## 3️⃣ VARIABLE REWARDS (The magic)

### Reward Types (Duolingo Style)

#### 🌟 XP (Experience Points)
- **Earn**: Every correct note, completed lesson, perfect score
- **Use**: Level up, unlock features, leaderboard ranking
- **Visibility**: Always shown, animated on earn

```
XP Rewards:
- Correct note: +1 XP
- Section complete: +10 XP
- Lesson complete: +25 XP
- Song mastered: +100 XP
- Perfect score bonus: +50 XP
- Daily goal reached: +20 XP
- Streak bonus: +5 XP per day (compounds)
```

#### 💎 Gems (Premium Currency)
- **Earn**: Achievements, streaks, challenges, watching ads
- **Buy**: Real money (₹79 = 500 gems, ₹199 = 1500 gems)
- **Spend**: Unlock songs, streak freeze, power-ups

```
Gem Economy:
Earning:
- 7-day streak: 50 gems
- Achievement unlocked: 10-100 gems
- Daily challenge: 5-20 gems
- Refer friend: 100 gems
- Watch ad: 5 gems

Spending:
- Unlock premium song: 200 gems
- Streak freeze (1): 100 gems
- Hint during practice: 10 gems
- Skip section: 50 gems
```

#### 🔥 Streaks
- **Visual**: Fire icon with day count
- **Freeze**: Protect streak (costs gems)
- **Milestones**: 7, 30, 100, 365 days
- **Social**: Share streak achievements

#### 🏆 Achievements (Badges)
```
Beginner Badges:
- First Note: Play your first note
- First Song: Complete a song tutorial
- Week One: Practice for 7 days
- Night Owl: Practice after 10 PM
- Early Bird: Practice before 8 AM

Progress Badges:
- Melody Maker: Learn 5 songs
- Chord Master: Learn 10 chord progressions
- Speed Demon: Pass a song at 1.5x speed
- Perfectionist: Get 100% on any song
- Dedicated: 30-day streak

Mastery Badges:
- Piano Pro: Complete all piano lessons
- Bollywood Star: Learn 25 Bollywood songs
- Century: 100-day streak
- Virtuoso: Master 50 songs
```

#### 🎁 Surprise Rewards (Variable!)
- **Treasure chests**: Random gems/XP after sessions
- **Double XP events**: Random 30-min windows
- **Mystery songs**: Unlock random premium song
- **Bonus challenges**: Appear randomly

### Reward Variability Matrix
| Reward | Fixed/Variable | Frequency |
|--------|---------------|-----------|
| XP per note | Fixed | Every note |
| Lesson completion XP | Fixed | Every lesson |
| Chest contents | **Variable** | After sessions |
| Daily challenge reward | **Variable** | Daily |
| Achievement gems | Fixed | On unlock |
| Streak milestone | Fixed | At milestone |

---

## 4️⃣ INVESTMENT (Lock them in)

### Progress Investment
- **Levels**: 1-100 (visible progression)
- **Songs learned**: Permanent collection
- **Streak days**: Painful to lose
- **Achievements**: Can't un-earn

### Social Investment
- **Friends list**: See their progress
- **Leaderboards**: Weekly competition
- **Shared playlists**: Collaborative learning

### Financial Investment
- **Gems purchased**: Sunk cost
- **Premium subscription**: Monthly commitment
- **Unlocked songs**: Feels like ownership

### Customization Investment
- **Avatar/profile**: Personalized
- **Favorite songs**: Curated list
- **Practice schedule**: Configured

---

## 💰 Monetization Tiers

### Free Tier
- 3 songs (rotating weekly)
- Basic lessons
- Ads between sessions
- 5 gems/day limit
- Basic achievements

### Premium (₹199/month)
- All songs unlocked
- No ads
- Unlimited gems earning
- Exclusive achievements
- Streak freeze included
- Early access to new songs

### Gem Packs (One-time)
| Pack | Gems | Price | Best Value |
|------|------|-------|------------|
| Starter | 500 | ₹79 | |
| Popular | 1500 | ₹199 | ✓ |
| Pro | 5000 | ₹499 | |
| Ultimate | 15000 | ₹999 | Best ₹/gem |

---

## 📱 UI Components Needed

### Always Visible
```
┌─────────────────────────────────────────┐
│  🔥 12    💎 450    ⭐ 1,250 XP   Lv.7  │
│  streak   gems      experience   level  │
└─────────────────────────────────────────┘
```

### Home Screen
```
┌─────────────────────────────────────────┐
│                                         │
│  Good evening, Rahul! 👋                │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🎯 Daily Goal: 15 min           │   │
│  │ ████████░░░░░░░░  8/15 min      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ▶️  CONTINUE                     │   │
│  │    Tum Hi Ho • Verse 2          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  🔥 Streak: 12 days                     │
│  ⏰ Practice today to keep it!          │
│                                         │
└─────────────────────────────────────────┘
```

### Reward Animation (After Lesson)
```
┌─────────────────────────────────────────┐
│                                         │
│           ⭐ +25 XP ⭐                   │
│                                         │
│         🎉 Lesson Complete!             │
│                                         │
│    ┌─────────────────────────────┐     │
│    │     🎁 OPEN CHEST 🎁        │     │
│    └─────────────────────────────┘     │
│                                         │
│    Streak: 🔥 12 → 🔥 13 days!         │
│                                         │
└─────────────────────────────────────────┘
```

### Song Lock/Unlock
```
┌──────────────┐  ┌──────────────┐
│  🎵          │  │  🔒          │
│  Tum Hi Ho   │  │  Kesariya    │
│  ✅ Learned  │  │  💎 200      │
│              │  │  [UNLOCK]    │
└──────────────┘  └──────────────┘
```

---

## 🔄 Daily Loop (Ideal User Journey)

```
Morning:
  📱 Push: "Good morning! Quick 5-min practice?"
  → Open app
  → See streak at risk
  → Quick practice (5 min)
  → Earn XP + keep streak
  → Close app (satisfied)

Evening:
  📱 Push: "New challenge available! 2x XP for 30 min"
  → Open app
  → Do challenge
  → Open reward chest
  → See leaderboard position
  → Try to beat friend
  → 30+ min session
  → Level up!
  → Share achievement
```

---

## 📊 Key Metrics to Track

| Metric | Target | Why |
|--------|--------|-----|
| D1 Retention | >40% | First hook worked |
| D7 Retention | >20% | Habit forming |
| D30 Retention | >10% | Hooked users |
| Avg session/day | 2+ | Multiple triggers work |
| Avg session length | 8+ min | Good engagement |
| Streak 7+ days | >30% of DAU | Investment building |
| Conversion to paid | >5% | Monetization |

---

## 🚀 MVP Gamification (Phase 1)

**Must have for launch:**
- [x] XP system
- [x] Gems (earn only, buy later)
- [x] Streaks with visual
- [x] Daily goal
- [x] 5 basic achievements
- [x] Progress levels (1-10)
- [x] Lesson completion rewards
- [x] Simple leaderboard

**Phase 2 (Week 4-6):**
- [ ] Gem purchases
- [ ] Premium subscription
- [ ] Treasure chests
- [ ] More achievements
- [ ] Friend challenges
- [ ] Push notifications

**Phase 3 (Month 2-3):**
- [ ] Social features
- [ ] Leagues/competitions
- [ ] Custom challenges
- [ ] Seasonal events
