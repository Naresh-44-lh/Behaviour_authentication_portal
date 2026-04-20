# Deployment Guide

This project is designed to be deployed with the **Frontend on Vercel** and the **Backend on Render**.

## 1. Backend Deployment (Render)

1.  **Create a new Web Service** on Render.
2.  **Connect your repository**.
3.  **Root Directory**: `backend` (or leave as root and use the scripts below).
4.  **Build Command**: `npm install`
5.  **Start Command**: `npm start`
6.  **Environment Variables**:
    *   `NODE_ENV`: `production`
    *   `PORT`: `4000` (or leave default, Render will provide one)
    *   `JWT_SECRET`: A long random string (REQUIRED for security)
    *   `FRONTEND_URL`: `https://your-app-name.vercel.app` (Your Vercel URL)
    *   `DB_HOST`: Your MySQL host
    *   `DB_USER`: Your MySQL user
    *   `DB_PASSWORD`: Your MySQL password
    *   `DB_NAME`: Your MySQL database name

## 2. Frontend Deployment (Vercel)

1.  **Import your repository** into Vercel.
2.  **Framework Preset**: Vite (should be auto-detected).
3.  **Root Directory**: Leave as root (Vercel will use `vercel.json`).
4.  **Build Command**: `cd frontend && npm run build` (Should be handled by `vercel.json`).
5.  **Output Directory**: `frontend/dist`.
6.  **Environment Variables**:
    *   `VITE_API_BASE_URL`: (Optional) If you want to use direct Render calls. If left empty, the app will use the Vercel proxy defined in `vercel.json`.

## 3. Database Setup (MySQL)

Ensure you have a MySQL instance running. You can use:
- **Aiven** (Free tier MySQL)
- **Railway** (MySQL addon)
- **Tidb Cloud** (Serverless MySQL)

Run the schema in `backend/create_mysql.sql` if the automated initialization doesn't create everything you need, although the backend is designed to self-initialize.

## 4. Troubleshooting CORS

If you see CORS errors in the browser console:
1.  Check that `FRONTEND_URL` in Render matches your Vercel URL exactly (including `https://`).
2.  Check that `vercel.json` rewrite points to the correct Render URL.
