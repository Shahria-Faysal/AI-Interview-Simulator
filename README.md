# AI Interview Simulator

A full-stack AI-powered mock interview platform designed to help software engineers practice and improve their technical interviewing skills. Built with **Node.js/Express**, **PostgreSQL/Prisma**, **React/Vite**, **Tailwind CSS**, and **Google Gemini**.

![AI Interview Simulator](https://img.shields.io/badge/Status-Active-success)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 🌟 Features

- **User Authentication**: Secure JWT-based registration and login system.
- **Resume-Aware Interviews**: Upload your PDF resume and the AI will extract your skills, projects, and experience level to tailor the interview questions specifically to your background.
- **Dynamic AI Question Generation**: Generates role-specific (Frontend, Backend, Full Stack, Data Analyst) and difficulty-adjusted (Easy, Medium, Hard) technical questions using Google Gemini.
- **AI Answer Evaluation**: Submit your answers and receive immediate, actionable feedback including a score (1-10), specific strengths, weaknesses, actionable suggestions, and an "Ideal Answer" written by a senior engineer.
- **Interview Analytics & History**: Track your progress over time with a comprehensive dashboard showing your past sessions, average scores, and detailed breakdowns of your performance per question.
- **Resilient Fallback System**: The app guarantees 100% uptime. If the Gemini API fails, times out, or the API key is missing, the system automatically falls back to a locally hardcoded technical question bank.

---

## 💻 Tech Stack

**Frontend**:
- React (Vite)
- Tailwind CSS
- React Router
- TanStack Query
- Axios

**Backend**:
- Node.js & Express.js
- PostgreSQL
- Prisma ORM
- Google Gemini API (`@google/generative-ai`)
- `pdf-parse` (for resume text extraction)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (running locally or a cloud instance like Neon/Supabase)
- A Google Gemini API Key

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   Create a `.env` file in the backend directory:
   ```env
   # Database connection string
   DATABASE_URL="postgresql://user:password@localhost:5432/interview_simulator?schema=public"
   
   # JWT Secret for authentication
   JWT_SECRET="your_super_secret_jwt_key"
   
   # Google Gemini API Key
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```
4. Push the Prisma schema to the database:
   ```bash
   npm run db:push
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```

---

## 🧠 Architecture & AI Flows

### Resume Analysis Pipeline
When a user uploads a resume, a non-blocking asynchronous pipeline processes the file:
1. The PDF is parsed and text is extracted using `pdf-parse`.
2. The raw text is sanitized and sent to Gemini (`gemini-2.5-flash`).
3. Gemini extracts structured JSON data: `skills`, `projects`, `experienceLevel`, and `domains`.
4. This data is saved to the database and used to personalize future interviews.

### Answer Evaluation Pipeline
When a user submits an answer:
1. The answer is immediately saved to the database to prevent data loss.
2. A strict prompt is sent to `gemini-2.5-pro` with a low temperature (`0.2`) to ensure consistent, objective scoring.
3. The response is parsed to extract the `score`, `strengths`, `weaknesses`, `suggestions`, and `idealAnswer`.
4. The evaluation is returned to the frontend for inline feedback.

### Fallback Guarantee
Neither question generation nor answer evaluation will ever crash the app:
- **No `GEMINI_API_KEY`**: Questions are drawn from the fallback bank; evaluation returns null fields.
- **Gemini timeout (>20s)**: Handled gracefully with fallback.
- **Gemini returns malformed JSON**: Parser recovery mechanisms trigger the fallback.
