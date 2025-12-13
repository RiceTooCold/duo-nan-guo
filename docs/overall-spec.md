# Duo-Nan-Guo Product Specification

**Version:** 0.2.0  
**Type:** Overall Product Specification  
**Last Updated:** 2025-12-13

---

## 1. Product Overview

### 1.1 Concept

**Duo-Nan-Guo** is a language proficiency exam battle application inspired by Duolingo's brand recognition. The core gameplay combines quiz mechanics from trivia apps (e.g., Kahoot, QuizUp) with official language certification content.

| Aspect | Description |
|--------|-------------|
| Target Exams | JLPT, TOEIC, TOPIK, HSK |
| Core Mode | Real-time 1v1 and multiplayer quiz battles |
| Content Strategy | T2T (Target-to-Target) immersion, no native language hints |
| Platform | Mobile-first Progressive Web App (PWA) |

### 1.2 Target Users

Candidates preparing for language proficiency exams who prefer gamified practice over traditional study methods.

---

## 2. MVP Scope

### 2.1 Priority Matrix

| Priority | Feature | Owner |
|----------|---------|-------|
| P0 | Question generation & admin dashboard | Factory |
| P0 | 1v1 real-time battles | Game Engine |
| P0 | Rule-based bot opponent | Game Engine |
| P0 | Game UI & result screens | UI/UX |
| P0 | Social login (Google/Discord) | UI/UX |
| P1 | LLM-powered bot opponent | Game Engine |
| P1 | Multiplayer mode (2-8 players) | Game Engine |
| P2 | Leaderboards, achievements, friends | All |

### 2.2 Out of MVP Scope

- Leaderboards and achievement systems
- Friend system and social features
- Streak tracking

---

## 3. Game Mechanics

### 3.1 Scoring System

| Event | Points |
|-------|--------|
| Correct answer (base) | +100 |
| Speed bonus (max) | +50 |
| Combo multiplier | x1.5 / x2.0 / x2.5... |
| Incorrect answer | 0, combo reset |

### 3.2 Match Modes

| Mode | Description |
|------|-------------|
| Duel | 1v1 head-to-head |
| Multiplayer | 2-8 simultaneous players |

### 3.3 Bot Types

| Type | Behavior | Tracking |
|------|----------|----------|
| Rule Bot | Knows answer, configurable error rate (50-95%) | Not tracked |
| LLM Bot | Calls AI API to answer, may err naturally | Tracked as User |

---

## 4. Technical Architecture

### 4.1 Technology Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15+ (App Router) |
| Package Manager | pnpm workspaces |
| Database | MongoDB Atlas + Prisma |
| AI | Gemini 2.5 Flash / Pro |
| Realtime | Socket.io |
| Auth | NextAuth.js (Google, Discord) |
| Platform | Mobile-first PWA |

### 4.2 Project Structure

```
duo-nan-guo/
├── app/                       # Next.js App Router
│   ├── admin/                # Admin dashboard (Factory)
│   ├── (game)/               # Game pages (Game Engine + UI)
│   └── api/                  # API routes
├── lib/
│   ├── factory/              # Question generation logic
│   │   ├── ai/              # Gemini, prompts, critic
│   │   └── services/        # Generator, question service
│   ├── game/                 # Battle logic (future)
│   ├── config/               # Shared configuration
│   ├── utils/                # Rate limiter, helpers
│   └── prisma.ts             # Database client
├── contexts/                  # React contexts
├── prisma/                    # Database schema
└── docs/                      # Specifications
```

### 4.3 Code Ownership

Team ownership is defined in `.github/CODEOWNERS`:

| Area | Owner | Paths |
|------|-------|-------|
| Question Factory | Factory Engineer | `/lib/factory/`, `/app/admin/` |
| Game Engine | Game Engineer | `/lib/game/`, `/app/(game)/` |
| UI/UX | UI Designer | `/lib/ui/`, `/app/globals.css` |
| Shared | All | `/prisma/`, `/docs/` |

---

## 5. Data Models

### 5.1 Core Entities

| Model | Purpose |
|-------|---------|
| User | Players and LLM bots with OAuth identity |
| Question | Exam questions with AI quality metrics |
| Match | Battle sessions with embedded players |
| AnswerRecord | Per-answer analytics for question difficulty tuning |

### 5.2 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| LLM bots stored as Users | Enables stat tracking and profile display |
| Rule bots have no User record | No analytical value (behavior is deterministic) |
| UserStats embedded in User | Fast profile reads, updated after each match |
| MatchPlayer embedded in Match | Small array (2-8), avoids joins |
| AnswerRecord as separate collection | High volume, needs independent queries |

---

## 6. Module Responsibilities

### 6.1 Question Factory

| Responsibility | Output |
|----------------|--------|
| AI question generation | Generator-Critic pipeline |
| Admin dashboard | Bank management UI |
| Question API | `GET /api/questions/random` |

Reference: [Factory Specification](./Duo-Nan-Guo%20Factory%20Specification.md)

### 6.2 Game Engine

| Responsibility | Output |
|----------------|--------|
| Game state machine | GameState, scoring logic |
| Bot implementation | RuleBot, LLMBot |
| Realtime connection | Socket.io adapter |
| Room management | Matchmaking, reconnection |

### 6.3 UI/UX

| Responsibility | Output |
|----------------|--------|
| Design system | Tokens, components |
| Game interface | Lobby, Battle, Result screens |
| Admin UI | Styling for admin dashboard |

---

## 7. Integration Interfaces

### 7.1 Interface Ownership

| Interface | Provider | Consumer | Status |
|-----------|----------|----------|--------|
| Question API | Factory | Game Engine | Draft |
| GameState | Game Engine | UI | Draft |
| Socket Events | Game Engine | UI | Draft |
| User Session | NextAuth | All | Draft |
| AnswerRecord Write | Game Engine | Factory (DB) | Draft |

---

### 7.2 Question API

**Provider:** Factory  
**Consumer:** Game Engine

```typescript
// GET /api/questions/random
interface QuestionRequest {
  targetLanguage: 'JP' | 'EN' | 'KR' | 'CN';
  rank: 1 | 2 | 3 | 4 | 5 | 6;
  count: number;
  excludeIds?: string[];  // Avoid recently used questions
}

interface QuestionResponse {
  id: string;
  targetLanguage: TargetLanguage;
  rank: number;
  examQuestionType: string;
  stimulus: string;
  interaction: { a: string; b: string; c: string; d: string };
  correctAnswer: 'a' | 'b' | 'c' | 'd';
  // Note: explanation excluded during battle, shown in review
}
```

**Discussion Points:**
- Should `excludeIds` be handled by Factory or Game Engine?
- Maximum `count` per request?

---

### 7.3 Game State

**Provider:** Game Engine  
**Consumer:** UI

```typescript
interface GameState {
  roomId: string;
  mode: 'duel' | 'multiplayer';
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  
  players: Player[];
  currentQuestion: Question | null;
  questionIndex: number;
  totalQuestions: number;
  
  scores: Record<string, number>;  // playerId -> score
  timeRemaining: number;           // seconds
}

interface Player {
  playerId: string;
  userId: string | null;  // null for rule bots
  name: string;
  avatar: string | null;
  isBot: boolean;
  botType: 'rule' | 'llm' | null;
  score: number;
  combo: number;
}
```

---

### 7.4 Socket Events

**Provider:** Game Engine  
**Consumer:** UI

| Event | Direction | Payload |
|-------|-----------|---------|
| `room:join` | Client to Server | `{ roomId, userId }` |
| `room:leave` | Client to Server | `{ roomId }` |
| `game:ready` | Client to Server | `{ roomId }` |
| `answer:submit` | Client to Server | `{ questionId, answer, responseTimeMs }` |
| `game:state` | Server to Client | `GameState` |
| `question:reveal` | Server to Client | `{ question, index, timeLimit }` |
| `answer:result` | Server to Client | `{ playerId, answer, isCorrect, scoreEarned, combo }` |
| `game:end` | Server to Client | `{ finalScores, winnerId }` |

---

### 7.5 User Session

**Provider:** NextAuth  
**Consumer:** All modules

```typescript
interface Session {
  user: {
    id: string;
    name: string;
    email: string | null;
    image: string | null;
    isBot: boolean;
    botModel: string | null;  // e.g., "gemini-2.5-flash"
  };
}
```

---

## 8. Pending Decisions

### Delegated to Game Engine

- Questions per match (recommended: 10-15)
- Time per question (recommended: 10-15 seconds)
- Exact scoring formula for speed bonus and combo multipliers
- Reconnection handling strategy

### Requires Cross-Team Discussion

- Question exclusion logic (avoid repeat questions)
- Error handling for Socket disconnections
- Bot response time simulation parameters

