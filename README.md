# InterviewAI — Phase 4: AI Answer Evaluation

A full-stack AI Interview Simulator built with **Node.js/Express**, **PostgreSQL/Prisma**, **React/Vite**, **Tailwind CSS**, and **Google Gemini**.

---

## What's implemented

| Phase | Feature |
|-------|---------|
| 1 | Authentication, resume upload, sessions, question storage |
| 3 | AI question generation via Gemini (fallback to question bank) |
| **4** | **AI answer evaluation — score, strengths, weaknesses, suggestions, ideal answer** |

---

## Project structure

```
interview-simulator/
├── backend/
│   ├── config/
│   │   ├── gemini.js           # Two model factories: generation (temp 0.7) + evaluation (temp 0.2)
│   │   └── prompts.js          # buildQuestionPrompt() + buildEvaluationPrompt()
│   ├── controllers/
│   │   ├── question.controller.js  # submitAnswer → save → evaluate → persist → return
│   │   └── session.controller.js   # completeSession uses AI scores for final score
│   ├── services/
│   │   ├── aiService.js            # generateInterviewQuestions() with fallback
│   │   ├── evaluationService.js    # evaluateAnswer() with 20s timeout + fallback
│   │   └── questionBank.service.js # hardcoded fallback bank
│   ├── utils/
│   │   ├── aiResponseParser.js     # parseGeminiQuestions() + parseEvaluationResponse()
│   │   └── logger.js
│   └── prisma/schema.prisma        # Question: score, strengths[], weaknesses[], suggestions[], idealAnswer
│
└── frontend/src/
    ├── pages/
    │   ├── InterviewPage.jsx        # Inline AI feedback panel after each answer
    │   ├── InterviewResultsPage.jsx # Full results: score ring, distribution chart, Q&A breakdown
    │   ├── HistoryPage.jsx          # Per-question scores, Results button
    │   └── DashboardPage.jsx        # AI score display, links to results
    ├── hooks/useApi.js              # useSubmitAnswer returns evaluation data
    └── utils/format.js             # formatScore, scoreColorClass, scoreLabel
```

---

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, GEMINI_API_KEY

npm run db:generate
npm run db:push     # or: npm run db:migrate for migration history
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Phase 4: Answer evaluation flow

```
PATCH /api/questions/:id/answer
        │
        ├─ 1. Validate ownership + session not completed
        ├─ 2. Save answer to DB immediately (never lost)
        ├─ 3. evaluateAnswer({ question, answer, role, difficulty })
        │         │
        │         ├─ tryGeminiEvaluation()  ← temp 0.2, 20s timeout
        │         │     ├─ build prompt     (config/prompts.js)
        │         │     ├─ call Gemini      (gemini-1.5-flash)
        │         │     ├─ parse + validate (utils/aiResponseParser.js)
        │         │     └─ return evaluation
        │         │
        │         └─ on failure → FALLBACK_EVALUATION (null fields)
        │
        ├─ 4. Persist: score, strengths[], weaknesses[], suggestions[], idealAnswer
        └─ 5. Return evaluation to frontend → inline feedback panel
```

### Evaluation prompt design

- **Temperature 0.2** — low temperature for consistent, reproducible scoring
- **responseSchema** — API-enforced JSON contract (score, strengths[], weaknesses[], suggestions[], idealAnswer)
- **Score 0** reserved for blank/gibberish answers
- Asks for *specific* strengths/weaknesses, not generic feedback
- Includes an ideal answer so the user can learn, not just be judged

### Session score calculation (Phase 4)

When `PATCH /api/sessions/:id/complete` is called:
1. If any questions have AI scores → average them (1–10 scale) → multiply by 10 → session score (0–100)
2. Fallback (no AI scores) → % of questions answered (Phase 1 logic)

---

## API reference

### Questions (updated Phase 4)

**`PATCH /api/questions/:id/answer`** — Submit and evaluate an answer

Request:
```json
{ "answer": "React uses a Virtual DOM to efficiently update..." }
```

Response:
```json
{
  "success": true,
  "message": "Answer saved and evaluated.",
  "data": {
    "question": {
      "id": "...",
      "question": "What is the Virtual DOM?",
      "answer": "React uses a Virtual DOM...",
      "score": 7.5,
      "strengths": ["Correctly explained in-memory diffing"],
      "weaknesses": ["Did not mention reconciliation algorithm"],
      "suggestions": ["Study React's reconciliation and Fiber"],
      "idealAnswer": "The Virtual DOM is an in-memory representation..."
    },
    "evaluation": {
      "score": 7.5,
      "strengths": ["..."],
      "weaknesses": ["..."],
      "suggestions": ["..."],
      "idealAnswer": "...",
      "source": "ai"
    }
  }
}
```

### Sessions

**`PATCH /api/sessions/:id/complete`** — Finish session, compute final score

Response includes `score` (0–100) derived from AI question scores where available.

### New frontend route

| Route | Page |
|-------|------|
| `/interview/:id/results` | `InterviewResultsPage` — full breakdown |

---

## Database schema (Phase 4 additions)

```prisma
model Question {
  id          String   @id @default(cuid())
  sessionId   String
  question    String
  answer      String?
  orderIndex  Int

  // Phase 4 evaluation fields (null until answer is submitted + evaluated)
  score       Float?
  strengths   String[]
  weaknesses  String[]
  suggestions String[]
  idealAnswer String?
}
```

**Migration for existing Phase 3 databases:**
```bash
npm run db:push   # safe — adds new columns, keeps existing data
```

---

## Fallback guarantee

Neither question generation nor answer evaluation will ever crash the app:

| Scenario | Behaviour |
|----------|-----------|
| No `GEMINI_API_KEY` | Questions from bank; evaluation returns `null` fields |
| Gemini timeout (>20s) | Same fallback |
| Gemini returns bad JSON | Parser recovery → fallback |
| Answer is empty | Evaluation skipped; answer still saved |

---

## Phase 5 roadmap

- [ ] Resume-aware questions (parse CV, tailor questions to candidate)
- [ ] Job description matching
- [ ] Streak tracking and gamification
- [ ] Refresh token rotation
- [ ] Cloud file storage (Cloudinary / S3)
- [ ] Integration tests
