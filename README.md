# Full Stack Project

A simple full-stack application with React frontend and Express backend.

## Project Structure

```
.
├── frontend/          # React application (Vite)
│   ├── src/
│   ├── package.json
│   └── vite.config.js
└── backend/           # Express server
    ├── server.js
    └── package.json
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

## Backend Setup

```bash
cd backend
npm install
npm run dev
```

Backend runs on: `http://localhost:5000`

## Features

- React 18 with Vite
- Express.js backend
- CORS enabled for frontend-backend communication
- Axios for API calls
- Hot Module Replacement (HMR) in development

## API Endpoints

- `GET /health` - Health check
- `GET /data` - Fetch sample data
- `POST /data` - Send data to backend

## Development

Run both frontend and backend in separate terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Then open your browser to `http://localhost:5173`
