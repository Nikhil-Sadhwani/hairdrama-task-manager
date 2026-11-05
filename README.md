
# Hairdrama Task Manager

A simple task management web application that allows users to create, assign, manage, and track tasks. Users can sign in using Google OAuth and receive email notifications for task-related activities.

## Features

- Google OAuth Authentication
- User Profile Management
- Create and View Tasks
- Assign Tasks to Other Users
- Reassign and Unassign Tasks
- Task Priority (Low, Medium, High)
- Task Due Date and Deadline
- Update Task Priority
- Mark Tasks as Completed
- Delete Tasks
- Loading Indicators
- Gmail Email Notifications
- Task Assignment Email Notifications
- Task Completion Email Notifications

## Technology Stack

| Part | Technology |
|---|---|
| Frontend | Next.js |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Backend | Python Flask |
| Database | Supabase PostgreSQL |
| Authentication | Google OAuth 2.0 |
| Email | Gmail SMTP |
| Frontend Deployment | Vercel |
| Backend Deployment | Render |

## Project Architecture

```text
User
 |
 v
Next.js Frontend
 |
 | REST API Requests
 | Access Token
 v
Flask Backend
 |
 | Token Verification
 v
Supabase Authentication
 |
 v
Supabase Database
 |
 +---- Profiles Table
 |
 +---- Tasks Table

Flask Backend
 |
 v
Gmail SMTP
 |
 v
Email Notifications
```

## Project Structure

```text
hairdrama-task-manager/
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   └── lib/
│   ├── public/
│   ├── .env.example
│   └── package.json
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── .env.example
│
├── migrations/
│   └── 001_initial_schema.sql
│
├── .gitignore
└── README.md
```

## Database Structure

### Profiles Table

Stores registered user information.

| Column | Description |
|---|---|
| id | Unique User ID |
| full_name | User Name |
| email | User Email |
| avatar_url | Profile Image |
| created_at | Account Creation Date |

### Tasks Table

Stores task-related information.

| Column | Description |
|---|---|
| id | Unique Task ID |
| title | Task Title |
| description | Task Description |
| created_by | Task Creator |
| assigned_to | Assigned User |
| status | Pending / Completed |
| priority | Low / Medium / High |
| due_date | Task Deadline |
| created_at | Task Creation Date |

## Installation and Setup

### 1. Clone Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd hairdrama-task-manager
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
```

Activate virtual environment:

Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create `.env` file using `.env.example`.

Add the required environment variables:

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
GMAIL_USER=
GMAIL_APP_PASSWORD=
```

Start Flask server:

```bash
python app.py
```

Backend runs on:

```text
http://127.0.0.1:5000
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create `.env.local` using `.env.example`.

Add the environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Start Next.js:

```bash
npm run dev
```

Frontend runs on:

```text
http://localhost:3000
```

## Supabase Configuration

1. Create a Supabase project.
2. Configure Google OAuth authentication.
3. Add the Google OAuth credentials.
4. Execute the database migration SQL.
5. Configure the authentication redirect URLs.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/health | Backend Health Check |
| GET | /api/supabase-test | Database Connection Test |
| POST | /api/profile | Save User Profile |
| GET | /api/users | Get Registered Users |
| POST | /api/tasks | Create Task |
| GET | /api/tasks | Get Tasks |
| POST | /api/tasks/:id/complete | Complete Task |
| PATCH | /api/tasks/:id/assign | Assign or Unassign Task |
| PATCH | /api/tasks/:id/priority | Update Task Priority |
| DELETE | /api/tasks/:id | Delete Task |

## Email Notifications

The application uses Gmail SMTP for sending email notifications.

Notifications are sent when:

- A new unassigned task is created.
- A task is assigned to another user.
- An existing task is reassigned.
- A task is completed.

## Security

- Google OAuth authentication.
- Supabase Row Level Security (RLS).
- Environment variables for credentials.
- Backend token verification.
- User-based task permissions.

## Deployment

Frontend: Vercel

Backend: Render

Database: Supabase

Live Application URL: To be added after deployment.

## Author

Developed as an internship assignment for Hairdrama Tech.
