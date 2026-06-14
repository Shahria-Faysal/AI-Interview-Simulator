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

module.exports = { buildQuestionPrompt, DIFFICULTY_CONFIG, ROLE_LABELS };
