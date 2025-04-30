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
  - AI-powered opponent teams

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
  - Firebase Firestore for data storage
  - Firebase Authentication for user management
  - Fast API

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase account and project setup

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/footb-ai.git
   cd footb-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up Firebase:
   - Create a Firebase project
   - Enable Authentication and Firestore
   - Add your Firebase configuration to `client/src/firebaseConfig.ts`

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Project Structure

```
footb-ai/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments
