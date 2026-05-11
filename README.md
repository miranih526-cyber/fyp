# FYP Management System (MERN)

Full-stack MERN app for managing FYP projects with role-based JWT authentication.

Backend: Node.js + Express + MongoDB (Mongoose)  
Frontend: React (Vite) + Tailwind CSS

## Features (Backend)

- JWT auth with roles: `admin`, `student`, `supervisor`
- Project lifecycle management (pending/approved/rejected/in_progress/completed)
- Document submissions (upload/download) with versioning
- Supervisor feedback + project evaluation with marks and grade calculation
- Admin user management + reporting exports (CSV)

## Prerequisites

- Node.js 18+
- MongoDB (local or remote)

## Environment Variables

Create/edit `server/.env` with the following variables:

- `MONGO_URI` (required): MongoDB connection string
- `JWT_SECRET` (required): secret used to sign JWT tokens
- `PORT` (optional): server port (default: `5000`)

## Run the Application

### Backend (Express API)

```bash
cd server
npm install
npm run dev
```

API base URL: `http://localhost:5000` (or `http://localhost:$PORT`)  
Health check: `GET /api/health`

### Frontend (React)

```bash
cd client
npm install
npm run dev
```

Open the URL shown by Vite (typically `http://localhost:5173`).  
The frontend calls the backend at `http://localhost:5000/api`.

## Authentication (JWT)

### How to authenticate

1. Register:
   - `POST /api/auth/register` (creates `student` or `supervisor`)
2. Login:
   - `POST /api/auth/login`
3. For protected endpoints, send:
   - `Authorization: Bearer <token>`

### Role behavior (high level)

- `student`
  - can create projects
  - can view their own project(s)
  - can upload submission documents
- `supervisor`
  - can view their assigned projects/evaluations
  - can give submission feedback
  - can evaluate and finalize evaluations
- `admin`
  - can manage users/roles
  - can approve/reject/update projects and assign supervisors
  - can view all evaluations and reporting exports

## Backend API Reference (All Routes)

All API routes are mounted under `server/index.js` at `/api/...`.

### Conventions

- `:id` means a MongoDB ObjectId.
- Most protected routes require JWT via `Authorization: Bearer <token>`.
- Project status values:
  - `pending`, `approved`, `rejected`, `in_progress`, `completed`

---

## Health

### `GET /api/health` (public)

Response example:

```json
{ "ok": true, "service": "fyp-management-system-api" }
```

---

## Auth

### `POST /api/auth/register`

Creates a new user. Students and supervisors can register; role is restricted.

Body:

```json
{
  "name": "Jane",
  "email": "jane@example.com",
  "password": "password123",
  "role": "student|supervisor",
  "rollNo": "20BCS001",
  "department": "Software Engineering"
}
```

Validation rules from code:

- `name`, `email`, `password` are required
- Allowed roles on registration: `student`, `supervisor` (invalid role falls back to `student`)
- For `student`, `rollNo` is required

Success response (`201`):

```json
{
  "token": "<jwt>",
  "user": {
    "id": "userId",
    "name": "Jane",
    "email": "jane@example.com",
    "role": "student",
    "rollNo": "20BCS001",
    "department": "Software Engineering"
  }
}
```

### `POST /api/auth/login`

Body:

```json
{ "email": "jane@example.com", "password": "password123" }
```

Success response:

```json
{
  "token": "<jwt>",
  "user": { "id": "...", "name": "...", "email": "...", "role": "...", "rollNo": "...", "department": "..." }
}
```

### `GET /api/auth/me`

Protected. Requires:

- `Authorization: Bearer <token>`

Response:

```json
{ "user": { "id": "...", "name": "...", "email": "...", "role": "...", "rollNo": "...", "department": "..." } }
```

---

## Projects

Base path: `/<api>/projects` i.e. `GET /api/projects...`

All endpoints in `server/routes/projects.js` require JWT (`router.use(verifyToken)`), except they will enforce access/roles per route.

### `POST /api/projects` (student only)

Protected.

Body:

```json
{
  "title": "FYP Title",
  "description": "Project description",
  "technologies": ["React", "Node"] /* or "React,Node" */,
  "expectedEndDate": "2026-12-31"
}
```

Rules:

- `title` and `description` are required
- `technologies` can be an array or a comma-separated string
- A student cannot create another project while they have one in `pending` or `approved`

Response (`201`):

```json
{ "project": { "id": "...", "student": { "name": "...", "rollNo": "...", "email": "..." }, "supervisor": { "name": "...", "email": "..." }, "status": "pending", "...": "..." } }
```

### `GET /api/projects`

Protected.

Returns projects depending on role:

- student: projects where `student = req.user.id`
- supervisor: projects where `supervisor = req.user.id`
- admin: all projects

Response:

```json
{ "projects": [/* populated project docs */] }
```

### `GET /api/projects/notifications`

Protected.

Returns role-specific notifications:

- admin: pending approvals + unassigned supervisor projects
- supervisor: pending submission reviews + missing final evaluation for active projects
- student: status notifications for latest project + grade if finalized

Response:

```json
{ "notifications": [ { "id": "string", "type": "warning|info|error|success", "message": "string", "createdAt": "ISO-8601" } ] }
```

### `GET /api/projects/:id`

Protected.

Response:

```json
{ "project": { /* populated project */ } }
```

Access control:

- admin: can access any project
- student: can access project where `project.student = req.user.id`
- supervisor: can access project where `project.supervisor = req.user.id`

### `PATCH /api/projects/:id/status` (admin or supervisor)

Protected.

Body:

```json
{
  "status": "approved|rejected|in_progress|completed|pending",
  "rejectionReason": "Optional reason if rejected",
  "supervisorId": "ObjectId (used when approving)"
}
```

Behavior:

- only admin can patch any project
- supervisor can patch only projects assigned to them
- when `status === "rejected"` sets/clears `rejectionReason`
- when `status === "approved"` and `supervisorId` is provided, assigns the supervisor

Response:

```json
{ "project": { /* updated populated project */ } }
```

### `PATCH /api/projects/:id/assign` (admin only)

Protected.

Body:

```json
{ "supervisorId": "ObjectId" }
```

Response:

```json
{ "project": { /* updated populated project */ } }
```

### `DELETE /api/projects/:id` (admin only)

Protected.

Deletes:

- the project
- all related submissions
- all related evaluations

Response:

```json
{ "message": "Project deleted.", "id": "projectId" }
```

---

## Submissions (Uploads + Feedback)

Base path: `GET /api/submissions...`

All routes use JWT auth (`router.use(verifyToken)`).

### `POST /api/submissions` (student only) - multipart upload

Protected.

Request type: `multipart/form-data`

Form-data fields:

- `file` (required): allowed extensions: `.pdf`, `.doc`, `.docx`, `.zip`, max size `10MB`
- `projectId` (required): ObjectId of a project that belongs to the student
- `title` (required): submission title (used to version)
- `description` (optional): string

Response (`201`):

```json
{
  "submission": {
    "id": "...",
    "project": "...",
    "student": { "name": "...", "rollNo": "..." },
    "title": "string",
    "description": "string",
    "fileUrl": "uploads/<stored-filename>",
    "fileName": "original filename",
    "fileSize": 12345,
    "version": 1
  }
}
```

### `GET /api/submissions/project/:projectId`

Protected.

Response:

```json
{ "submissions": [/* list sorted desc by createdAt */] }
```

Access control (from code):

- admin can access all
- student can access if they own the project
- supervisor can access if assigned to the project

### `PATCH /api/submissions/:id/feedback` (supervisor only)

Protected.

Body:

```json
{ "feedback": "Your feedback text" }
```

Response:

```json
{ "submission": { /* updated submission */ } }
```

### `GET /api/submissions/download/:id`

Protected.

Downloads the submission file as an attachment if the user can access the underlying project.

Response: `Content-Disposition: attachment; filename="<original file name>"`

---

## Evaluations (Supervisor Grading)

Base path: `GET /api/evaluations...`

All routes require JWT (`router.use(verifyToken)`).

Marks keys expected:

- `proposal`, `implementation`, `documentation`, `presentation`
- Each mark is validated to be a number between `0` and `25`

### `GET /api/evaluations/supervisor/all` (supervisor only)

Response:

```json
{ "evaluations": [/* populated evaluations */] }
```

### `GET /api/evaluations/admin/all` (admin only)

Query:

- `page` (default `1`)

Response:

```json
{
  "evaluations": [/* */],
  "page": 1,
  "pages": 3,
  "total": 25,
  "limit": 10
}
```

### `GET /api/evaluations/project/:projectId`

Protected.

Response:

```json
{ "evaluation": null }
```

or

```json
{ "evaluation": { /* populated evaluation */ } }
```

### `POST /api/evaluations` (supervisor only)

Protected.

Body:

```json
{
  "projectId": "ObjectId",
  "overallFeedback": "text",
  "strengths": "text",
  "improvements": "text",
  "marks": {
    "proposal": 10,
    "implementation": 20,
    "documentation": 15,
    "presentation": 18
  }
}
```

Behavior:

- If evaluation already exists and is finalized: `409`
- If evaluation exists but not finalized: updates existing evaluation
- If not exists: creates new evaluation

Response:

```json
{ "evaluation": { /* populated */ } }
```

### `PATCH /api/evaluations/:id/finalize` (supervisor only)

Protected.

Finalizes an evaluation and updates the related project status to `completed`.

Response:

```json
{ "evaluation": { /* populated */ } }
```

---

## Users (Admin only)

Base path: `GET /api/users...`

All endpoints require admin (`router.use(verifyToken, requireRole("admin"))`).

### `GET /api/users/stats` (admin only)

Response:

```json
{
  "totalStudents": 0,
  "totalSupervisors": 0,
  "totalProjects": 0,
  "pendingProjects": 0,
  "approvedProjects": 0,
  "completedProjects": 0,
  "totalSubmissions": 0,
  "evaluatedProjects": 0
}
```

### `GET /api/users`

Query params:

- `page` (default `1`)
- `limit` (default `10`, max `50`)
- `role` (optional: `student`, `supervisor`, `admin`)
- `q` (optional search in `name` or `email`, regex case-insensitive)

Response:

```json
{ "users": [/* */], "page": 1, "pages": 4, "total": 32, "limit": 10 }
```

### `PATCH /api/users/:id/role` (admin only)

Body:

```json
{ "role": "student|supervisor|admin" }
```

Rules:

- prevents demoting the only admin user

Response:

```json
{ "user": { /* updated user without password */ } }
```

### `DELETE /api/users/:id` (admin only)

Rules:

- cannot delete the currently authenticated admin user
- if deleting an admin, prevents deleting the only admin user
- deletes related projects/submissions/evaluations for that user

Response:

```json
{ "message": "User and related data deleted.", "id": "userId" }
```

---

## Admin Reports (Admin only)

Base path: `/api/admin/...`

All endpoints require admin (`router.use(verifyToken, requireRole("admin"))`).

### `GET /api/admin/ping`

Response:

```json
{ "message": "Admin access granted." }
```

### `GET /api/admin/reports`

Response:

```json
{
  "gradeDistribution": [{ "grade": "A+", "count": 0 }, { "grade": "F", "count": 1 }],
  "projectsByStatus": [{ "status": "pending", "count": 2 }],
  "submissionsByMonth": [{ "month": "2026-05", "count": 10 }]
}
```

### `GET /api/admin/reports/projects-csv`

Exports `projects-export.csv` as a download (`text/csv`).

---

## Example cURL (Login)

```bash
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"jane@example.com\",\"password\":\"password123\"}"
```

Then use:

```bash
Authorization: Bearer <token>
```
