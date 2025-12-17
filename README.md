# Log (Retro Study OS)

> **🚀 LIVE DEMO:** [https://study-app-lemon.vercel.app/](https://study-app-lemon.vercel.app/)

**Log** is a retro-themed study companion application designed to gamify focus and discipline. With a distinct CRT terminal aesthetic, it combines productivity tools with social accountability features to help you track your study sessions, complete quests, and compete on leaderboards.

![System Boot](https://i.ibb.co/5WrL7bn4/Screenshot-2025-12-18-at-12-34-58-AM.png" alt="Screenshot-2025-12-18-at-12-34-58-AM) <!-- Placeholder for a screenshot if available, otherwise just text -->

## Features

### ⏱️ Focus Timer
- **Session Intents**: Define your goal before starting (Revision, Problem Solving, Reading, Mock Test).
- **Study Timer**: Distraction-free timer with strict "Pause" and "End" controls.
- **Reflection**: Rate your session effectiveness (Good, Okay, Wasted) upon completion.

### 📜 Quest System
- View and join active study quests.
- Track progress towards specific hour targets.
- Claim XP rewards upon completion.

### 🏆 Leaderboard & Stats
- **Global Leaderboard**: Compete with others based on XP, Hours, and Streaks.
- **Profile Stats**: Track your daily/total study hours, current streak, and rank.
- **Visual Progression**: Upload custom avatars and see your rank evolve.

### 📡 Social Log
- **Activity Feed**: A real-time log of study sessions from the community.
- **Proof of Work**: Upload image evidence of your study achievements.
- **Interaction**: Comment on others' logs to encourage them.

### 💾 Retro System Architecture
- **Aesthetic**: Green-on-black terminal design, CRT scanlines, and boot sequences.
- **Sound/Discrete UX**: Minimalist interactions focused on "System Online" vibes.

## Tech Stack

### Frontend
- **HTML5 & CSS3**: Custom grid layouts, CRT effects, and responsive design.
- **Vanilla JavaScript**: State management, API integration, and DOM manipulation without heavy frameworks.

### Backend
- **Node.js & Express**: RESTful API architecture.
- **Prisma & PostgreSQL**: Database ORM and relational data storage.
- **JWT**: Secure authentication (stateless).
- **Multer**: Image upload handling.

## Getting Started

### Frontend (User Interface)
The frontend is pre-configured to connect to the production server.

1.  Simply open `index.html` in your web browser.
2.  The system will boot up. Click `>> CONTINUE_` to initialize.
3.  Login or Register to start tracking your progress.

### Backend (Local Development)
If you wish to run the server locally:

1.  Navigate to the server directory:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up your `.env` file with `DATABASE_URL`, `JWT_SECRET`, etc.
4.  Run migrations:
    ```bash
    npx prisma migrate dev
    ```
5.  Start the server:
    ```bash
    npm run dev
    ```
6.  *Note: You will need to update the `API_URL` in `app.js` to point to `http://localhost:port`.*

## License
Restricted - Internal Use Only.
