# StaffSync – MERN HR Management

Roles: **HR**, **Manager**, **Employee** (JWT auth).

## Run
1. Start MongoDB locally (or use Atlas URI in `server/.env`).
2. Backend: `cd server && cp .env.example .env && npm install && npm run seed && npm start` (port 5000)
3. Frontend: `cd client && npm install && npm run dev` (port 5173)

Seed logins (password `password123`): hr@staffsync.com, manager@staffsync.com, employee@staffsync.com

## Features
- HR: employees CRUD, announcements, attendance overview, leave approval
- Manager: leave approval, training programs, team list
- Employee: apply leave, mark attendance, profile, announcements, enroll in training
