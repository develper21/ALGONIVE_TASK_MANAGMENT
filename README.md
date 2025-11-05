# Algonive – Team Management

A full‑stack team and task management application featuring role‑based access (Admin, Member), JWT authentication, dashboards, task analytics, Excel exports, and a clean React UI.

**Backend:** Node.js, Express, MongoDB (Mongoose), JWT, Multer, ExcelJS  
**Frontend:** React (Vite), React Router, Axios, Tailwind CSS, custom toast notifications  

---

## Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Environment Variables](#environment-variables)
- [Quick Start](#quick-start)
- [Scripts](#scripts)
- [API Reference](#api-reference)
- [Frontend Overview](#frontend-overview)
- [File Uploads](#file-uploads)
- [Reports & Exports](#reports--exports)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Overview

Algonive is a MERN‑stack project that enables:

- **Admins** to create, assign, and manage tasks, generate reports, and view global analytics.  
- **Members** to view assigned tasks, update progress via checklists, and track their status.  

Security is enforced via JWTs and role guards. The UI is responsive and includes top‑right in‑app notifications for user actions (login, signup, errors, etc.).

---

## Features

### Authentication
- Register, Login, Get/Update Profile  
- JWT auth with token stored client‑side  
- Role‑based access: admin vs member  

### Task Management
- CRUD tasks (admin creates/deletes)  
- Assign to multiple members  
- Todo checklist with auto progress and status (Pending/In Progress/Completed)  

### Dashboards
- **Admin overview:** counts, distribution by status/priority, recent tasks  
- **User overview:** personal counts, status/priority distributions, recent tasks  

### Reporting
- Export all tasks (Excel)  
- Export user-task summary (Excel)  

### File Uploads
- Profile image upload (Multer → `/uploads`)  

### UI/UX
- React Router based routes for Admin and User  
- Top‑right toast notifications for important actions  
- Tailwind utility classes  

---

## Tech Stack

**Backend:** Node.js, Express, Mongoose, JWT, Multer, ExcelJS, CORS, dotenv  
**Frontend:** React (Vite), React Router, Axios, Tailwind CSS  
**DB:** MongoDB  

---

## Monorepo Structure

```

Algonive/
├─ server/                     # Express API
│  ├─ config/db.js             # Mongoose connection
│  ├─ controllers/             # auth, task, user, report controllers
│  ├─ middlewares/             # authMiddleware, uploadMiddleware
│  ├─ models/                  # User, Task
│  ├─ routes/                  # /auth, /users, /tasks, /reports
│  ├─ uploads/                 # Uploaded images (static)
│  ├─ server.js                # App entry (CORS, routes, static)
│  ├─ .env.example
│  └─ package.json
│
└─ ui/                         # React frontend (Vite)
├─ src/
│  ├─ pages/                # Auth, Admin, User
│  ├─ components/           # Layouts + UI
│  ├─ context/              # userContext, NotificationContext
│  ├─ routes/               # PrivateRoute (guard placeholder)
│  ├─ utils/                # axiosInstance, apiPaths, helpers
│  ├─ App.jsx, main.jsx, index.css
├─ index.html
└─ package.json

```

---

## Environment Variables

### Backend (`server/.env`)
```

PORT=5000 (or 8000)
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
ADMIN_INVITE_TOKEN=7-digit-code (for admin registration)
EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM (reserved for future)
CLOUDINARY_* (reserved for future)

```
A template is provided at `server/.env.example`.

### Frontend
`ui/src/utils/apiPaths.js` uses:  
```

BASE_URL = "[http://localhost:8000](http://localhost:8000)" (default)

````
**IMPORTANT:** Ensure server PORT matches BASE_URL.  
- **Option A:** Set server `PORT=8000` in server/.env  
- **Option B:** Change `BASE_URL` to `http://localhost:5000`  

---

## Quick Start

### Clone
```bash
git clone
cd Algonive
````

### Backend setup

```bash
cd server
cp .env.example .env
# Fill MONGO_URI, JWT_SECRET, ADMIN_INVITE_TOKEN, and set PORT to match frontend BASE_URL (e.g., 8000)
npm install
npm run dev   # nodemon
npm start     # production
```

### Frontend setup

```bash
cd ../ui
npm install
npm run dev
# Open http://localhost:5173
```

**First admin:**
Register with the `ADMIN_INVITE_TOKEN` to get role=admin

---

## Scripts

### Backend (`server/package.json`)

* `npm run dev` → nodemon server.js
* `npm start` → node server.js

### Frontend (`ui/package.json`)

* `npm run dev` → start Vite dev server
* `npm run build` → build production
* `npm run preview` → preview production build
* `npm run lint` → run ESLint

---

## API Reference (Backend)

**Base URL:** `http://localhost:<PORT>`

### Auth

* `POST /api/auth/register`
  body: `{ name, email, password, profileImageUrl?, adminInviteToken? }`
  returns: user fields + token (7d expiry)

* `POST /api/auth/login`
  body: `{ email, password }`
  returns: user fields + token

* `GET /api/auth/profile`
  headers: Authorization: Bearer
  returns: current user (no password)

* `PUT /api/auth/profile`
  headers: Authorization: Bearer
  body: `{ name?, email?, password? }`
  returns: updated user + fresh token

* `POST /api/auth/upload-image`
  formData: image (file)
  returns: `{ imageUrl }`

**Static serving:** `GET /uploads/`

### Users

* `GET /api/users` → admin only, all members with task counts
* `GET /api/users/:id` → auth required, single user (no password)

### Tasks

* `GET /api/tasks?status=Pending|In%20Progress|Completed` → auth required

  * admin: all tasks
  * member: assigned tasks

* `GET /api/tasks/:id` → auth required

* `POST /api/tasks` → admin only, body: `{ title, description?, priority, dueDate, assignedTo: [userId], attachments?: [url], todoChecklist?: [{text,completed}] }`

* `PUT /api/tasks/:id` → auth required, updates fields; validates assignedTo is array when present

* `DELETE /api/tasks/:id` → admin only

* `PUT /api/tasks/:id/status` → auth required, body: `{ status }`, only assigned members or admin can change, auto updates checklist when Completed

* `PUT /api/tasks/:id/todo` → auth required, body: `{ todoChecklist: [{text,completed}] }`, auto calculates progress and status

### Dashboards

* `GET /api/tasks/dashboard-data` → auth required (admin overview)
* `GET /api/tasks/user-dashboard-data` → auth required (current user only)

### Reports (Excel)

* `GET /api/reports/export/tasks` → admin only, returns Excel
* `GET /api/reports/export/users` → admin only, returns Excel

### Auth & Middleware

* JWT in Authorization header: Bearer
* `protect`: verifies token, loads `req.user`
* `adminOnly`: `req.user.role === "admin"`

---

## Frontend Overview

**Entry:** `ui/src/main.jsx` wraps in NotificationProvider
`ui/src/App.jsx` contains React Router routes for Auth, Admin, User

### Routing

**Public:**

* `/login` → Login.jsx
* `/signup` → SignUp.jsx

**Admin:**

* `/admin/dashboard` → Dashboard.jsx
* `/admin/tasks` → ManageTasks.jsx
* `/admin/create-task` → CreateTask.jsx
* `/admin/users` → ManageUsers.jsx

**User:**

* `/user/dashboard` → UserDashboard.jsx
* `/user/tasks` → MyTasks.jsx
* `/user/task-details/:id` → ViewTaskDetails.jsx

**Auth flow:**

* On login/signup, token is saved to localStorage
* axiosInstance adds Authorization header automatically
* 401 responses redirect to `/login`

### Notifications

Custom NotificationContext with top‑right toasts

```js
const { addNotification } = useNotification();
addNotification({ message: "Action completed", type: "success" });
```

### API client

* `BASE_URL` in `ui/src/utils/apiPaths.js` (default [http://localhost:8000](http://localhost:8000))
* axios interceptors attach token and handle 401/500

---

## File Uploads

**Endpoint:** `POST /api/auth/upload-image`
**Client:** `ui/src/utils/uploadImage.js`

* Sends FormData with image under key `"image"`
* Server: Multer saves into `server/uploads`
* Served statically at `GET /uploads/`
* Response: `{ "imageUrl": "http://localhost:/uploads/" }`

---

## Reports & Exports

* ExcelJS used to generate:

  * Tasks Report: `/api/reports/export/tasks`
  * User Tasks Report: `/api/reports/export/users`
* Response has Excel MIME type; browser triggers file download

---

## Deployment

### Backend

* Set environment variables on your host (`MONGO_URI`, `JWT_SECRET`, `PORT`, etc.)
* Serve `/uploads` statically (already handled in server.js)
* Ensure CORS origin is your frontend URL
* `server.js` uses `origin: process.env.CLIENT_URL || "*"`

### Frontend

* Set `BASE_URL` in `ui/src/utils/apiPaths.js` to your deployed backend URL
* Build: `npm run build`
* Serve via your hosting provider (static hosting supports Vite build)

---

## Troubleshooting

* **401 Unauthorized:** Missing/expired token → login; ensure axios attaches Authorization
* **403 Access Denied:** Non‑admin calling admin routes
* **500 Server Error:** Check server logs; verify `MONGO_URI` and `JWT_SECRET`
* **CORS errors:** Set `CLIENT_URL` in server env to your frontend URL
* **Port mismatch:** If server runs on 5000 and UI BASE_URL is 8000, update one of them
* **Image upload fails:** Ensure form field name is `"image"`, verify `/uploads` is writable; check server logs

---
