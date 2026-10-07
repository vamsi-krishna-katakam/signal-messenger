# Signal Messenger — Real-Time Messaging Platform

A production-grade, real-time clone of the Signal Messaging application.

This platform replicates Signal's signature dark aesthetic (`#121212`, `#1E1E22`, `#2C6BED`), core messaging workflows, direct 1-on-1 chats, group creation, member administration, live typing indicators, delivery/read checkmarks, and online presence indicators over WebSockets.

---

## 🚂 5-Minute Railway Deployment Guide

This application is built to deploy seamlessly on **Railway** (or Render/Vercel) with built-in support for both **PostgreSQL** and **SQLite**.

### Step 1: Deploy Backend on Railway
1. Push this repository to your **GitHub** account.
2. Go to [railway.app](https://railway.app/) and sign in with GitHub.
3. Click **"New Project"** -> Select **"Deploy from GitHub repo"**.
4. Select your repository.
5. In your Service settings:
   - **Root Directory**: `backend` (or leave default if deploying root)
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. *(Optional Database)*: Click **"+ New"** -> **"Database"** -> **"Add PostgreSQL"**. Railway will automatically add the `DATABASE_URL` variable to your backend service!
7. Railway will generate a public URL (e.g. `https://signal-backend-production.up.railway.app`).

---

### Step 2: Deploy Frontend on Vercel / Railway
1. Go to [vercel.com](https://vercel.com/) or Railway.
2. Import the GitHub repository.
3. Set the **Root Directory** to `frontend`.
4. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL` = `https://your-railway-backend-url.up.railway.app/api`
5. Click **Deploy**. Done!

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- **Python 3.10+**
- **Node.js v18+**

---

### 2. Backend Setup (FastAPI)

```bash
cd backend

# 1. Create and activate virtual environment
python -m venv venv

# On Windows:
.\venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start FastAPI server
uvicorn main:app --reload --port 8000
```
> The backend server runs at `http://localhost:8000` with interactive API docs at `http://localhost:8000/docs`.

---

### 3. Frontend Setup (Next.js & Tailwind CSS)

Open a second terminal window:

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start Next.js development server
npm run dev
```
> Open `http://localhost:3000` in your web browser.

---

## 🔐 Authentication Specifications

### 1. Registration Workflow
- **First Name** & **Last Name** (Generates display name)
- **Mobile Number** (Unique constraint)
- **Username** (Unique constraint)
- **Verification OTP** (Fixed OTP: `123456`)

### 2. Login Workflow
- **Phone Number OR Username**
- **Verification OTP** (Fixed OTP: `123456`)

---

## 🛠️ Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | **Next.js (App Router, TypeScript)** | Modern React server components, type-safety, fast UI rendering. |
| **Styling** | **Tailwind CSS + Lucide Icons** | Signal dark mode palette (`#121212`, `#1E1E22`, `#2C6BED`). |
| **Backend** | **Python (FastAPI)** | High-performance asynchronous API & native WebSocket support. |
| **Database** | **PostgreSQL (Railway) / SQLite + SQLAlchemy** | Auto-detects `DATABASE_URL` env variable for PostgreSQL or SQLite. |
| **Real-time** | **FastAPI WebSockets** | Bi-directional socket communication for messages, receipts, and typing. |
