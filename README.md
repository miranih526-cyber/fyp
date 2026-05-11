# FYP Management System

Full-stack MERN scaffold: Express + MongoDB API and React (Vite) client with JWT auth, role middleware, and Tailwind CSS.

## Prerequisites

- Node.js 18+
- MongoDB running locally (or update `MONGO_URI` in `server/.env`)

## Environment (`server/.env`)

| Variable     | Description                          |
| ------------ | ------------------------------------ |
| `MONGO_URI`  | MongoDB connection string            |
| `JWT_SECRET` | Secret for signing JWTs              |
| `PORT`       | API port (default `5000`)            |

## Run the server

```bash
cd server
npm install
npm run dev
```

API listens on **http://localhost:5000** (or `PORT` from `.env`). Health check: `GET http://localhost:5000/api/health`.

## Run the client

```bash
cd client
npm install
npm run dev
```

Open the URL Vite prints (typically **http://localhost:5173**). The client calls the API at `http://localhost:5000/api`.

## Project layout

- **`server/`** — Express app, MongoDB via Mongoose, JWT auth routes (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`), `authMiddleware` for protected routes.
- **`client/`** — Vite + React Router v6, `AuthContext`, axios instance with Bearer token, Tailwind.

Empty folders (`server/models`, `server/routes`, `client/src/pages`, `client/src/components`) are reserved for future modules; a `.gitkeep` keeps them in version control.

## Multer

`server/uploads/` is ready for file uploads; wire `multer` in `server/index.js` or future route files when you add upload endpoints.
