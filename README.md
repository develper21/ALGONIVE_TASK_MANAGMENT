<div align="center">

# ALGONIVE · TEAM & TASK MANAGEMENT

Modern task orchestration for hybrid teams with dashboards, Kanban flows, realtime notifications, encrypted messaging, and automated reminders.

### ⚙️ Core Stack
<p align="center">
  <img src="https://img.shields.io/badge/React-149ECA?style=for-the-badge&logo=react&logoColor=white" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Tailwind%20CSS-0EA5E9?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"/>
  <img src="https://img.shields.io/badge/React%20Router-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white" alt="React Router"/>
  <img src="https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white" alt="Axios"/>
  <img src="https://img.shields.io/badge/Context%20API-9333EA?style=for-the-badge&logo=react&logoColor=white" alt="Context API"/>
  <img src="https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.IO"/>
  <img src="https://img.shields.io/badge/Node.js-5FA04E?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express"/>
  <img src="https://img.shields.io/badge/MongoDB%20Atlas-13AA52?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB Atlas"/>
  <img src="https://img.shields.io/badge/Mongoose-880000?style=for-the-badge&logo=mongoose&logoColor=white" alt="Mongoose"/>
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT"/>
  <img src="https://img.shields.io/badge/Multer-FFB400?style=for-the-badge&logo=files&logoColor=black" alt="Multer"/>
  <img src="https://img.shields.io/badge/Nodemailer-2088FF?style=for-the-badge&logo=gmail&logoColor=white" alt="Nodemailer"/>
  <img src="https://img.shields.io/badge/Node--cron-FF6A3D?style=for-the-badge&logo=clockify&logoColor=white" alt="Node-cron"/>
  <img src="https://img.shields.io/badge/ExcelJS-217346?style=for-the-badge&logo=microsoft-excel&logoColor=white" alt="ExcelJS"/>
  <img src="https://img.shields.io/badge/dotenv-6366F1?style=for-the-badge&logo=.env&logoColor=white" alt="dotenv"/>
</p>

[
  <img src="./Frontend/assets/algonive_dashboard.png" alt="dashboard preview" width="100%" />
](https://algonive-task-managment.vercel.app/)

</div>

---

## 🔗 Live Services

- **Frontend UI:** https://algonive-task-managment.vercel.app/
- **Backend API root:** https://algonive-backend-q35u.onrender.com/api

---

## 🧠 Project Snapshot

Algonive is a production-ready MERN platform where admins orchestrate teams, automate notifications, and export reports while members collaborate via dashboards, Kanban boards, secure chat, and email reminders.

---

## 🛠 Backend Superpowers (Node.js + Express)

### 🔐 Security & Identity
- JWT-authenticated REST API with refresh-safe 7-day tokens.
- Role-based guards (`admin`, `member`) and granular middleware.
- Password hashing (bcrypt) + invite-token gate for admin onboarding.

### 📋 Tasks, Teams & Assets
- Full CRUD for tasks, teams, and assignments with audit activity logs.
- Kanban-ready statuses, rich metadata (priority, tags, due dates, attachments).
- Multer-powered file uploads with type detection & per-task storage isolation.

### 📣 Messaging & Notifications
- Encrypted conversation service enforcing end-to-end key handling.
- Socket-ready notification model (deadline, assignment, status, team-invite, overdue).
- Email templates (assignment, reminders, status change) delivered via Nodemailer.

### 🤖 Automation & Reporting
- Node-cron jobs for upcoming/overdue reminders + duplicate suppression.
- ExcelJS exports (all tasks, user-task rollups) for leadership reporting.
- Presence and notification stores for realtime awareness.

### ⚙️ DevOps & Config
- CORS hardened via `CLIENT_URL`, environment-driven secrets, and health logging.
- Modular services (auth, tasks, teams, messaging, notifications) for scaling.

---

## 🎨 Frontend Experience (React + Vite)

### 📊 Dashboards & Visualization
- Personalized admin & member dashboards with KPI cards, workload charts, and activity feed.
- Kanban board view with responsive drag-ready columns.
- Status, priority, team, and assignee filters plus instant keyword search.

### 🧑‍💻 Productivity Toolkit
- Rich task composer (multi-tag, due date, attachments, checklist workflow).
- Team management UI with color branding, member badges, and quick actions.
- Messaging center + notification panel (mark-one/mark-all) synced with backend events.

### 💎 UX & Platform Details
- Tailwind-powered design system, gradient cards, skeleton loaders, and toasts.
- React Context for auth + notifications, Axios interceptor for tokens, guarded routes.
- Mobile-first layouts (nav collapse, cards stack) with crisp typography.

---

## 🧱 System Architecture

```
Algonive/
├─ server/
│  ├─ models/            # User, Team, Task, Conversation, Message, Notification…
│  ├─ routes/            # auth, tasks, teams, messaging, notifications, reports
│  ├─ services/          # messagingService, emailService, presence store
│  ├─ utils/             # auth middleware, attachment storage, cron jobs
│  └─ server.js          # Express app, CORS, sockets, schedulers
└─ Frontend/
   ├─ src/
   │  ├─ pages/          # Dashboards, TaskBoard, Messaging, Auth, Settings
   │  ├─ components/     # Sidebar, analytics cards, forms, modals
   │  ├─ context/        # Auth, Notification, Theme
   │  ├─ utils/          # apiPaths, axios instance, crypto helpers
   │  └─ assets/         # icons, favicon
   └─ vite.config.js
```

---

## ⚙️ Environment Variables

### Backend (`server/.env`)
```
PORT=8000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=super_secret_key
ADMIN_INVITE_TOKEN=7digitcode
CLIENT_URL=https://algonive-task-managment.vercel.app
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=hello@example.com
EMAIL_PASSWORD=app-password
```

### Frontend (`Frontend/.env`)
```
VITE_API_URL=https://algonive-backend-q35u.onrender.com/api
```

---

## 🚀 Quick Start

```bash
git clone <repo>
cd Algonive

# Backend
cd server
cp .env.example .env   # fill values above
npm install
npm run dev            # http://localhost:8000

# Frontend
cd ../Frontend
cp .env.example .env
npm install
npm run dev            # http://localhost:5173
```

First admin registers with `ADMIN_INVITE_TOKEN`; other members join teams via invites.

---

## 📡 API & Routes at a Glance

### Highlighted REST Endpoints
- `POST /api/auth/register` · create user / admin with invite.
- `POST /api/auth/login`, `GET/PUT /api/auth/profile`, `POST /api/auth/upload-image`.
- `GET/POST /api/tasks` + filters (`status`, `team`, `assignee`, `priority`, `search`).
- `PUT /api/tasks/:id`, `/status`, `/todo`, `/attachments`, `/activity/feed`.
- `GET /api/reports/export/tasks`, `/users` (Excel streams).
- `GET /api/notifications`, `PUT /:id/read`, `PUT /read-all`.
- Conversation & messaging routes secured via `messagingService` (E2EE retention policies).

### Frontend Route Map
- Public: `/login`, `/signup`.
- Admin: `/admin/dashboard`, `/admin/tasks`, `/admin/create-task`, `/admin/users`, `/admin/reports`.
- Member: `/user/dashboard`, `/user/tasks`, `/user/task-details/:id`, `/teams`, `/messaging`.

---

## 🧪 Quality & Tooling

- Vite + React Fast Refresh for DX.
- ESLint (`npm run lint`) keeps code style consistent.
- Nodemon auto-restarts backend during development.
- Indexed Mongo queries + selective population for performance.

---

## 📚 Documentation Hub

- [`Docs/SETUP_GUIDE.md`](./Docs/SETUP_GUIDE.md) – step-by-step environment setup.
- [`Docs/PROJECT_SUMMARY.md`](./Docs/PROJECT_SUMMARY.md) – delivery checklist & metrics.
- [`Docs/FEATURES_LIST.md`](./Docs/FEATURES_LIST.md) – exhaustive capability matrix.
- [`Docs/EMAIL_TESTING_GUIDE.md`](./Docs/EMAIL_TESTING_GUIDE.md) – SMTP testing tips.

---

## 🙌 Credits

Crafted by Algonive with a focus on polished UX, secure collaboration, and automation-first ops. Deploy-ready for Render (API) + Vercel (UI) with MongoDB Atlas at the core.
