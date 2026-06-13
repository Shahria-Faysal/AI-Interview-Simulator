/**
 * services/questionBank.service.js
 * Hardcoded question banks for Phase 1.
 * Phase 2 will replace/augment these with AI-generated questions.
 *
 * Questions are keyed by Role enum value, then filtered by difficulty
 * (EASY = first 3, MEDIUM = first 5, HARD = all 7).
 */

const QUESTION_BANK = {
  FRONTEND_DEVELOPER: [
    // EASY (index 0-2)
    {
      question: "What is React?",
      orderIndex: 1,
    },
    {
      question: "What is the Virtual DOM and how does it differ from the real DOM?",
      orderIndex: 2,
    },
    {
      question: "What is JSX? Why do we use it in React?",
      orderIndex: 3,
    },
    // MEDIUM (index 3-4)
    {
      question: "Explain the useEffect hook. When does it run and what are its common use cases?",
      orderIndex: 4,
    },
    {
      question: "What is the difference between controlled and uncontrolled components in React?",
      orderIndex: 5,
    },
    // HARD (index 5-6)
    {
      question: "Explain React's reconciliation algorithm and how keys help the diffing process.",
      orderIndex: 6,
    },
    {
      question: "What are React custom hooks? Create a simple useFetch hook and explain how it works.",
      orderIndex: 7,
    },
  ],

  BACKEND_DEVELOPER: [
    // EASY
    {
      question: "What is a REST API? Explain its core principles.",
      orderIndex: 1,
    },
    {
      question: "What is middleware in Express.js? Give an example.",
      orderIndex: 2,
    },
    {
      question: "What is JWT (JSON Web Token)? How does authentication with JWT work?",
      orderIndex: 3,
    },
    // MEDIUM
    {
      question: "What is the difference between SQL and NoSQL databases? When would you choose one over the other?",
      orderIndex: 4,
    },
    {
      question: "Explain database indexing. What problem does it solve and what are its trade-offs?",
      orderIndex: 5,
    },
    // HARD
    {
      question: "What is an N+1 query problem in ORMs? How would you detect and fix it?",
      orderIndex: 6,
    },
    {
      question: "Explain event-driven architecture and how Node.js's event loop works under the hood.",
      orderIndex: 7,
    },
  ],

  FULL_STACK_DEVELOPER: [
    // EASY (mix of FE + BE basics)
    {
      question: "What is React? How does it differ from plain JavaScript for building UIs?",
      orderIndex: 1,
    },
    {
      question: "What is a REST API? How does a React frontend typically communicate with a backend API?",
      orderIndex: 2,
    },
    {
      question: "What is JWT authentication? Describe the full request lifecycle from login to accessing a protected route.",
      orderIndex: 3,
    },
    // MEDIUM
    {
      question: "Explain the useEffect hook. How would you use it to fetch data from an API?",
      orderIndex: 4,
    },
    {
      question: "What is CORS? Why does it exist and how do you configure it on an Express server?",
      orderIndex: 5,
    },
    // HARD
    {
      question: "Describe your approach to state management in a full-stack app. When would you use server state (React Query) vs client state (useState/Redux)?",
      orderIndex: 6,
    },
    {
      question: "Walk through deploying a full-stack React + Node.js app to production. What are the key considerations?",
      orderIndex: 7,
    },
  ],

  DATA_ANALYST: [
    // EASY
    {
      question: "What is the difference between GROUP BY and ORDER BY in SQL?",
      orderIndex: 1,
    },
    {
      question: "Explain the difference between INNER JOIN, LEFT JOIN, and RIGHT JOIN with examples.",
      orderIndex: 2,
    },
    {
      question: "What is a primary key? What is a foreign key? How do they relate?",
      orderIndex: 3,
    },
    // MEDIUM
    {
      question: "What is a window function in SQL? Give an example using ROW_NUMBER() or RANK().",
      orderIndex: 4,
    },
    {
      question: "Explain the difference between OLTP and OLAP systems. Which would you use for reporting dashboards and why?",
      orderIndex: 5,
    },
    // HARD
    {
      question: "How would you detect and handle outliers in a dataset? Describe at least two statistical methods.",
      orderIndex: 6,
    },
    {
      question: "Explain database normalization. What are 1NF, 2NF, and 3NF? When would you intentionally denormalize?",
      orderIndex: 7,
    },
  ],
};

/**
 * Returns questions for a given role filtered by difficulty level.
 * EASY   → 3 questions
 * MEDIUM → 5 questions
 * HARD   → 7 questions
 *
 * @param {string} role - e.g. "FRONTEND_DEVELOPER"
 * @param {string} difficulty - "EASY" | "MEDIUM" | "HARD"
 * @returns {Array<{ question: string, orderIndex: number }>}
 */
const getQuestionsForSession = (role, difficulty) => {
  const bank = QUESTION_BANK[role];
  if (!bank) throw new Error(`Unknown role: ${role}`);

  const countMap = { EASY: 3, MEDIUM: 5, HARD: 7 };
  const count = countMap[difficulty] ?? 5;

  return bank.slice(0, count);
};

module.exports = { getQuestionsForSession };
