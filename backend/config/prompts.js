/**
 * config/prompts.js
 * All Gemini prompt templates live here.
 * Keeping prompts separate from service logic makes them easy to tune
 * without touching business logic.
 */

// ─── Role labels ─────────────────────────────────────────────────────────────

const ROLE_LABELS = {
  FRONTEND_DEVELOPER:   "Frontend Developer",
  BACKEND_DEVELOPER:    "Backend Developer",
  FULL_STACK_DEVELOPER: "Full Stack Developer",
  DATA_ANALYST:         "Data Analyst",
};

// ─── Difficulty settings ─────────────────────────────────────────────────────

const DIFFICULTY_CONFIG = {
  EASY:   { label: "Easy",   count: 5,  description: "fundamental concepts, definitions, and basic practical knowledge" },
  MEDIUM: { label: "Medium", count: 7,  description: "intermediate concepts, real-world application, and problem-solving" },
  HARD:   { label: "Hard",   count: 10, description: "advanced architecture, deep system knowledge, edge cases, and trade-offs" },
};

// ─── Role-specific focus areas (injected into prompt) ────────────────────────

const ROLE_FOCUS = {
  FRONTEND_DEVELOPER: `
Focus areas:
- HTML, CSS, and JavaScript fundamentals
- React concepts (hooks, lifecycle, state, props, context)
- Browser rendering, Virtual DOM, reconciliation
- Performance optimisation (memoisation, lazy loading, code splitting)
- Accessibility (a11y) and responsive design
- Frontend build tools (Vite, Webpack, Babel)
- API integration patterns (fetch, Axios, TanStack Query)`,

  BACKEND_DEVELOPER: `
Focus areas:
- REST API design principles and HTTP semantics
- Node.js event loop and asynchronous patterns (callbacks, Promises, async/await)
- Express.js middleware, routing, and error handling
- Authentication and authorisation (JWT, sessions, OAuth)
- Database design, SQL, and ORM usage (Prisma, Sequelize)
- Data validation and security (injection, CORS, rate limiting)
- Caching strategies and message queues`,

  FULL_STACK_DEVELOPER: `
Focus areas:
- End-to-end request lifecycle (browser → API → database → response)
- React and Node.js integration patterns
- Full-stack authentication flows (JWT, cookie sessions)
- State management strategy (server state vs client state)
- CORS, security headers, and environment configuration
- Deployment, CI/CD pipelines, and environment parity
- Database schema design and API contract design`,

  DATA_ANALYST: `
Focus areas:
- SQL (JOINs, GROUP BY, window functions, CTEs, subqueries)
- Data modelling and normalisation (1NF, 2NF, 3NF)
- OLTP vs OLAP and when to use each
- Data cleaning, outlier detection, and missing value handling
- Aggregation, pivoting, and reporting techniques
- Indexing strategies and query optimisation
- Basic statistics (mean, median, variance, distributions)`,
};

// ─── Main prompt builder ─────────────────────────────────────────────────────

/**
 * Builds the complete prompt string for generating interview questions.
 *
 * @param {string} role        - Prisma Role enum value (e.g. "FRONTEND_DEVELOPER")
 * @param {string} difficulty  - Prisma Difficulty enum value (e.g. "MEDIUM")
 * @returns {string}           - Full prompt to send to Gemini
 */
const buildQuestionPrompt = (role, difficulty) => {
  const roleLabel  = ROLE_LABELS[role]  ?? role;
  const diffConfig = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.MEDIUM;
  const focusAreas = ROLE_FOCUS[role] ?? "";

  return `You are a senior technical interviewer with 10+ years of experience hiring software engineers.

Your task is to generate exactly ${diffConfig.count} interview questions for the following context:

Role: ${roleLabel}
Difficulty: ${diffConfig.label} — questions should test ${diffConfig.description}
${focusAreas}

Requirements:
- Generate exactly ${diffConfig.count} questions. No more, no less.
- Every question must be distinct — no duplicates or near-duplicates.
- Mix conceptual questions ("What is X?", "How does Y work?") with practical ones ("How would you implement X?", "What would you do if Y?").
- Questions must be realistic and representative of actual technical interviews at mid-to-senior level companies.
- Do NOT include answers, hints, or explanations — questions only.
- Do NOT number the questions.
- Do NOT add preamble, commentary, or markdown outside the JSON.

Return ONLY a valid JSON array in this exact format:
[
  { "question": "Your first question here?" },
  { "question": "Your second question here?" }
]

The response must start with [ and end with ] with no other text.`;
};

// ─── Evaluation prompt builder ───────────────────────────────────────────────

/**
 * Builds the prompt for evaluating a single candidate answer.
 *
 * Design decisions:
 *  - Temperature is set low (0.2) on the model side for consistency.
 *  - We explicitly ask for arrays of strings to match the DB schema.
 *  - The ideal answer is requested so the user can learn, not just be judged.
 *  - Score 0 is reserved for no-answer / gibberish — normal answers start at 1.
 *
 * @param {object} params
 * @param {string} params.question   - The interview question text
 * @param {string} params.answer     - The candidate's answer
 * @param {string} params.role       - Prisma Role enum (e.g. "FRONTEND_DEVELOPER")
 * @param {string} params.difficulty - Prisma Difficulty enum (e.g. "MEDIUM")
 * @returns {string}
 */
const buildEvaluationPrompt = ({ question, answer, role, difficulty }) => {
  const roleLabel  = ROLE_LABELS[role]  ?? role;
  const diffConfig = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.MEDIUM;

  return `You are a senior technical interviewer with 10+ years of experience evaluating ${roleLabel} candidates.

Evaluate the following candidate answer objectively and professionally.

Context:
- Role: ${roleLabel}
- Difficulty: ${diffConfig.label} (${diffConfig.description})
- Question: ${question}

Candidate Answer:
"""
${answer}
"""

Evaluation requirements:
- Score the answer from 1 to 10, where:
    1–3 = Poor (major gaps, misunderstandings, or largely incorrect)
    4–5 = Below average (partial understanding, significant gaps)
    6–7 = Average (correct fundamentals, lacks depth or precision)
    8–9 = Good (solid understanding, minor gaps)
    10  = Excellent (thorough, accurate, professional-level)
- If the answer is completely blank, off-topic, or gibberish, assign score 0.
- Identify 1–3 specific strengths (things the candidate got right or explained well).
- Identify 1–3 specific weaknesses (concrete gaps, inaccuracies, or missing concepts).
- Provide 1–3 actionable improvement suggestions (what to study or add).
- Write an ideal answer that a senior engineer would give (2–4 sentences, concise but complete).
- Be specific — reference actual concepts from the answer when possible.
- Do NOT repeat the question or restate what you are doing.
- Do NOT add preamble or commentary outside the JSON.

Return ONLY a valid JSON object in this exact format:
{
  "score": <number 0-10>,
  "strengths": ["<specific strength>", "..."],
  "weaknesses": ["<specific weakness>", "..."],
  "suggestions": ["<actionable suggestion>", "..."],
  "idealAnswer": "<concise ideal answer>"
}`;
};

module.exports = { buildQuestionPrompt, buildEvaluationPrompt, DIFFICULTY_CONFIG, ROLE_LABELS };

