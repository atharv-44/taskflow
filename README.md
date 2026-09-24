# TaskFlow

TaskFlow — a Jira/Trello-style project management platform built with the MERN stack.

## Key Features

- JWT authentication with bcrypt password hashing
- Workspace-based RBAC (admin/member roles) enforced via live database checks, never trusted from the JWT payload
- Kanban board with drag-and-drop task management
- Fractional/lexicographic ordering for drag-and-drop — O(1) single-document writes per move instead of O(n) reindexing, with automatic rebalancing when order values converge
- Real-time-feeling optimistic UI updates on drag

## Tech Stack

**Backend:**
- Node.js
- Express
- MongoDB / Mongoose
- JWT (JSON Web Tokens)
- bcrypt

**Frontend:**
- React
- Redux Toolkit
- @hello-pangea/dnd
- Vite
- Tailwind CSS

## Architecture Highlights

**Data Model Hierarchy:**
The data is structured hierarchically: Workspace → Project → Board → Column → Task. Access to any nested resource implies and requires authorization at the root Workspace level.

**RBAC Middleware Pattern:**
Role-Based Access Control is enforced securely on the backend. Rather than embedding roles in the JWT payload (which can become stale), every protected request performs a live database lookup for role verification. This ensures that permission changes (like revoking access) take effect immediately without requiring the user to re-login.

**Fractional Ordering Algorithm:**
To avoid expensive O(n) bulk updates when reordering tasks in a Kanban column, TaskFlow uses fractional ordering. When a task is inserted or moved, it receives an `order` value that is the exact mathematical midpoint between its new neighbors. 

Over time, repeated moves into the exact same gap can cause floating-point precision loss. To solve this, when two neighboring order values converge under a small threshold, the affected column triggers a one-time "rebalance" operation that resets the tasks to clean integer spacing via a single bulk write.

*Known Limitation:* Currently, the rebalance operation is not wrapped in a database transaction. If a concurrent task move occurs exactly during a rebalance, one task could be left off the new integer spacing. Implementing a MongoDB transaction around the rebalance read+write is the recommended fix for scaling to high concurrency.

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB Atlas account or local MongoDB instance

### 1. Clone & Install
Clone the repository, then install dependencies for both the backend and frontend:

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Environment Variables
Create a `.env` file in the `server` directory and configure the following variables:
- `PORT` 
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLIENT_URL`

Create a `.env` file in the `client` directory and configure the following variable:
- `VITE_API_URL`

*(Do not commit these files to version control with real credentials).*

### 3. Run Locally

Start the backend server:
```bash
cd server
node server.js
```

Start the frontend development server:
```bash
cd client
npm run dev
```

## API Overview

The REST API exposes the following primary resource endpoints:

- **Auth** (`/api/auth`): Registration, login, and current user retrieval
- **Workspaces** (`/api/workspaces`): Workspace creation, listing, and member invitations
- **Projects** (`/api/projects`): Management of projects within a specific workspace
- **Boards** (`/api/boards`): Board configurations and fetching full board state
- **Columns** (`/api/columns`): Column creation and reordering
- **Tasks** (`/api/tasks`): Task creation, updates, deletion, cross-column moving (with fractional order calculation), and commenting

## License
MIT License
