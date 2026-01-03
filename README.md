# Online Voting System

A simple online voting system with a Node.js backend and a pure HTML/JS frontend.

## Project Structure
- `/frontend`: HTML, CSS, and Vanilla JavaScript files.
- `/backend-node`: Node.js Express server and SQLite database.

## Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher)

## Setup and Running

### 1. Backend
1. Open a terminal and navigate to the `backend-node` directory:
   ```bash
   cd backend-node
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   node server.js
   ```
   The server will run on `http://localhost:8080`.

### 2. Frontend
1. Open the `frontend` folder.
2. Open `index.html` using a local web server (like **Live Server** in VS Code) for the best experience.
3. If you open index.html directly as a file (`file:///...`), ensure your browser allows CORS for local files.

## Admin Credentials
- **Username**: `admin`
- **Password**: `admin123`

## Features
- Voter Registration and CNIC-based Login.
- Admin Dashboard for Election Management.
- Real-time Voting (One vote per election).
- Results displayed only after the election ends.
- SQLite Database for persistent storage.
