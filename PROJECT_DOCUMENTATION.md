# Online Voting System - Technical Documentation

## 1. Architecture Overview
The project follows a decoupled architecture:
- **Client**: Static web pages using Vanilla JS and CSS. Communicates via REST APIs.
- **Server**: Node.js Express server handling business logic and file uploads.
- **Persistence**: SQLite database for relational data storage.

## 2. Directory Structure
```text
votingweb/
├── backend-node/       # Node.js Server logic
│   ├── db/            # Database initialization and migrations
│   ├── uploads/       # Storage for candidate/party images
│   └── server.js      # Main API entry point
├── frontend/           # Web Interface
│   ├── app.js         # Shared logic and API client
│   ├── style.css      # Design system
│   └── *.html         # Page templates
├── START_VOTING_APP.bat # One-click runner for Windows
└── api/                # Cloud-ready serverless entry point
```

## 3. Technology Stack
- **Runtime**: Node.js (v14+)
- **Frameowrk**: Express.js
- **Database**: SQLite3 (Local file-based)
- **UI**: Vanilla HTML/CSS/JS (Legacy-compatible, no frameworks)

## 4. Key Workflows

### 4.1 Admin Flow
1. Login with `admin` / `admin123`.
2. Create an election.
3. Use **Add Party** and **Add Candidate** to build the roster.
4. **Start** the election to enable voting.
5. **Stop** the election to see final results.

### 4.2 Voter Flow
1. Register a 13-digit CNIC (e.g., `42101-1234567-1`).
2. Login with the registered CNIC.
3. Select an active election.
4. Choose a party and candidate.
5. Submit vote.

## 5. Security & Integrity Rules
- **CNIC Validation**: Format `XXXXX-XXXXXXX-X` enforced via regex.
- **Registration Check**: Votes from unregistered CNICs are rejected (403).
- **Unique Voting**: Database unique index `(election_id, voter_cnic)` prevents double voting.
- **Soft Deletes**: Uses an `active` flag to allow removing roster items without breaking historical vote counts.

## 6. How to Generate PDF
To convert the [SRS_Document.md](file:///C:/Users/User/.gemini/antigravity/brain/7fd0123b-7222-47da-9f65-1350a219338d/SRS_Document.md) to a PDF:
1. Open the `.md` file in **VS Code**.
2. Install the **"Markdown PDF"** extension.
3. Right-click in the file and select **"Markdown PDF: Export (pdf)"**.
4. Alternatively, use an online Markdown to PDF converter.
