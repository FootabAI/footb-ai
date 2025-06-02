# Footb-AI

A modern football management game where you can create and manage your own team, compete against AI opponents, and experience dynamic match simulations.

## Features

- 🎮 **Team Management**
  - Create and customize your team
  - Upgrade team attributes (passing, shooting, pace, etc.)
  - Choose team tactics and formations
  - Design custom team logos

- ⚽ **Match Simulation**
  - Realistic match engine
  - Dynamic match events
  - Live match statistics
  - Live match commentating

- 🏆 **Progression System**
  - Earn points from matches
  - Upgrade team attributes
  - Track team performance
  - Persistent game state

## Tech Stack

- **Frontend**
  - React with TypeScript
  - Tailwind CSS for styling
  - Firebase for authentication and database
  - Vite for build tooling

- **Backend**
  - Python with FastAPI
  - OpenAI API for AI-powered features
  - Firebase Firestore for data storage
  - Firebase Authentication for user management

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Python 3.8 or higher
- npm or yarn
- Firebase account and project setup
- OpenAI API key
- ElevenLab API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/FootabAI/footb-ai.git
   cd footb-ai
   ```

2. Install frontend dependencies:
   ```bash
   cd client
   npm install
   # or
   yarn install
   ```

3. Install backend dependencies:
   ```bash
   cd server
   pip install -r requirements.txt
   pip install --no-cache-dir -r requirements.txt
   ```

4. Set up Firebase:
   - Create a Firebase project
   - Enable Authentication and Firestore
   - Add your Firebase configuration to `client/src/firebaseConfig.ts`

5. Set up environment variables:
   - Create a `.env` file in the server directory
   - Add your OpenAI API key: `OPENAI_API_KEY=your_api_key`
   - Add your ElevenLabs API key: `ELEVENLABS_API_KEY=your_api_key`

6. Start the development servers:
   ```bash
   # Terminal 1 - Start the backend server
   cd server
   uvicorn app:app --reload

   # Terminal 2 - Start the frontend development server
   cd client
   npm run dev
   ```

## Project Structure

```
footb-ai/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── stores/         # React stores
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── Screen REC/             # Screen recording of the App 
├── server/                 # Backend FastAPI application
│   ├── models/            # Data models and schemas
│   ├── services/          # Business logic and services
│   ├── app.py            # Main application file
│   └── requirements.txt   # Python dependencies
└── README.md
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

