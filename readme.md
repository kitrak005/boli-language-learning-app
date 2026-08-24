# Vākya (वाक्य)

**A classical language learning platform for Sanskrit, Pali, and Classical Tamil.**

Vākya blends Duolingo-style gamified lessons with a dedicated AI dictionary assistant, letting learners study foundational vocabulary, grammar, and sacred texts across three classical Indian language traditions — with XP, streaks, and progressive skill trees to keep the habit going.

---

## Features

- **Multi-tradition learning paths** — separate skill trees for Sanskrit (संस्कृतम्), Pali (पालि), and Classical Tamil (செந்தமிழ்), each with multiple levels of increasing difficulty
- **Interactive lesson exercises** — word-tile sentence construction exercises with shuffled word banks, audio pronunciation, hearts-based mistake tracking, and instant grammatical explanations
- **Ask Guru** — an AI-powered dictionary chatbot (Google Gemini) for looking up the meaning, pronunciation, etymology, and usage of any classical word or phrase, with an offline fallback dictionary for common terms when the API is unavailable
- **Progress tracking** — daily XP goals, streak tracking, a 7-day consistency chart (D3.js), language mastery percentages, and unlockable achievements
- **Tradition switching** — swap between Sanskrit, Pali, and Tamil at any time via the tradition selector modal
- **Celebration & feedback** — level-up confetti celebrations, daily goal completion modals, and an animated teacher mascot that reacts to correct/incorrect answers
- **Sound design** — chime feedback, tile-click sounds, and text-to-speech pronunciation for classical scripts

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript, Vite |
| Styling | Tailwind CSS |
| Icons | lucide-react |
| Charts | D3.js |
| Markdown rendering | react-markdown |
| Backend | Express (Node.js) |
| AI / Dictionary | Google Gemini API (`@google/genai`) |
| Dev server | Vite middleware (dev) / static build serving (production) |

---

## Architecture

The app is a single Express server that runs Vite in middleware mode during development and serves the built static bundle in production, with one API route (`/api/ask-guru`) bridging the frontend to the Gemini API.

```
Vite React Client
├── main.tsx            → React bootstrap, mounts App
└── App.tsx              → App shell / UI coordinator
    ├── TopAppBar.tsx     → Header nav, tradition switcher, streak badge
    ├── BottomNavBar.tsx  → Mobile bottom navigation
    ├── HomeView.tsx      → Dashboard / continue lesson
    ├── LearnView.tsx     → Skill tree pathway (per tradition, per level)
    ├── ExploreView.tsx   → Word of the day, classical verses
    ├── PracticeView.tsx  → Flashcard review, XP practice
    ├── ProfileView.tsx   → Stats, XP chart, mastery, achievements
    ├── AskGuruChat.tsx   → AI dictionary chatbot UI
    ├── LessonModal.tsx   → Interactive lesson exercise overlay
    ├── TraditionSelectModal.tsx
    └── LevelUpCelebrationModal.tsx → Confetti celebration overlay

data/mockData.ts          → Skill trees, profile, flashcards, verses (local content source)
types.ts                  → Shared TypeScript contracts

server.ts                 → Express server
└── /api/ask-guru          → Gemini API integration + offline fallback dictionary
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/) (optional — Ask Guru falls back to an offline dictionary without one)

### Installation

```bash
git clone https://github.com/kitrak005/boli-language-learning-app.git
cd boli-language-learning-app
npm install
```

### Environment Variables

Create a `.env` file in the project root (see `.env.example`):

```
GEMINI_API_KEY=your_gemini_api_key_here
```

If `GEMINI_API_KEY` is not set, Ask Guru automatically uses its built-in offline dictionary for common classical terms (Dharma, Satya, Ahimsa, Karma, and more).

### Running Locally

```bash
npm run dev
```

This starts the Express server with Vite in middleware mode. The app will be available at `http://localhost:3000`.

### Building for Production

```bash
npm run build
npm start
```

---

## Project Structure

```
├── src/
│   ├── components/       # React components
│   ├── data/
│   │   └── mockData.ts   # Skill trees, profile, flashcards, verses
│   ├── types.ts           # Shared TypeScript interfaces
│   ├── utils/
│   │   └── audio.ts       # Sound effects & text-to-speech
│   └── App.tsx
├── server.ts               # Express server + Ask Guru API route
├── index.html
├── package.json
└── .env.example
```

---

## Deployment

This project deploys cleanly to platforms like **Render** or **Vercel**:

1. Set the `GEMINI_API_KEY` environment variable in your hosting provider's dashboard
2. Set the build command to `npm run build` and the start command to `npm start`
3. Ensure the production branch matches your deployment platform's configured branch (this repo uses `master` as the default branch)

---

## Contributing

This is currently a personal / hackathon project. Issues and pull requests are welcome if you'd like to suggest improvements or report bugs.

---

## License

*(Add a license — e.g. MIT — if you intend for others to use or contribute to this code.)*
