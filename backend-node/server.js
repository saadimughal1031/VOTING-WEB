const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
const db = require('./db/database');

const app = express();
const PORT = 8080;

// #region agent log
// Instrumentation: Log serverless function invocation
app.use((req, res, next) => {
    fetch('http://127.0.0.1:7242/ingest/a2eaae95-ca36-48f9-9d8c-f5d9f506986b', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'server.js:11', message: 'Request received', data: { method: req.method, path: req.path, url: req.url, originalUrl: req.originalUrl, baseUrl: req.baseUrl, isVercel: !!process.env.VERCEL, vercelUrl: process.env.VERCEL_URL }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'G' }) }).catch(() => { });
    next();
});
// #endregion

// Handle Vercel path differences - When using api/ directory automatically,
// Vercel passes the FULL path including /api to the Express app
// This middleware logs path information for debugging
app.use((req, res, next) => {
    // #region agent log
    const pathInfo = {
        path: req.path,
        url: req.url,
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl,
        isVercel: !!process.env.VERCEL,
        vercelUrl: process.env.VERCEL_URL,
        hasApiPrefix: req.path.startsWith('/api'),
        method: req.method
    };
    fetch('http://127.0.0.1:7242/ingest/a2eaae95-ca36-48f9-9d8c-f5d9f506986b', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'server.js:22', message: 'Path analysis - no rewrite needed', data: pathInfo, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run5', hypothesisId: 'K' }) }).catch(() => { });
    // #endregion
    next();
});

// Middleware
app.use(cors({
    origin: '*', // Allow all origins for local testing
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Storage for files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// API Endpoints

// Root endpoint to test if serverless function is being called
app.get('/', (req, res) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a2eaae95-ca36-48f9-9d8c-f5d9f506986b', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'server.js:47', message: 'Root endpoint hit', data: { method: req.method, path: req.path, url: req.url, originalUrl: req.originalUrl, isVercel: !!process.env.VERCEL }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run3', hypothesisId: 'I' }) }).catch(() => { });
    // #endregion
    res.json({
        success: true,
        message: 'Serverless function is working',
        path: req.path,
        url: req.url,
        originalUrl: req.originalUrl,
        isVercel: !!process.env.VERCEL,
        vercelUrl: process.env.VERCEL_URL
    });
});

// Diagnostic endpoint to test routing
app.get('/api/test', (req, res) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a2eaae95-ca36-48f9-9d8c-f5d9f506986b', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'server.js:61', message: 'Test endpoint hit', data: { method: req.method, path: req.path, url: req.url, originalUrl: req.originalUrl }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run3', hypothesisId: 'I' }) }).catch(() => { });
    // #endregion
    res.json({
        success: true,
        message: 'API is working',
        path: req.path,
        url: req.url,
        originalUrl: req.originalUrl,
        isVercel: !!process.env.VERCEL,
        vercelUrl: process.env.VERCEL_URL
    });
});

// --- Elections ---

// GET /api/elections - List all elections
app.get('/api/elections', (req, res) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a2eaae95-ca36-48f9-9d8c-f5d9f506986b', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'server.js:40', message: 'Route matched: /api/elections', data: { method: req.method, path: req.path, url: req.url }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion
    db.all("SELECT * FROM elections ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: rows });
    });
});

// GET /api/admin/elections - Same as elections but for admin page (can be extended with more info)
app.get('/api/admin/elections', (req, res) => {
    const query = `
        SELECT e.*, 
        (SELECT COUNT(*) FROM parties WHERE election_id = e.id) as party_count,
        (SELECT COUNT(*) FROM candidates WHERE election_id = e.id) as candidate_count,
        (SELECT COUNT(*) FROM votes WHERE election_id = e.id) as vote_count
        FROM elections e ORDER BY created_at DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: rows });
    });
});

// GET /api/elections/ended - List ended elections
app.get('/api/elections/ended', (req, res) => {
    db.all("SELECT * FROM elections WHERE status = 'ENDED' ORDER BY ended_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: rows });
    });
});

// POST /api/admin/election/create - Create election
app.post('/api/admin/election/create', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Name is required" });
    db.run("INSERT INTO elections (name, status) VALUES (?, 'CREATED')", [name], function (err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

// PUT /api/admin/elections/:id - Update election
app.put('/api/admin/elections/:id', (req, res) => {
    const { name } = req.body;
    const { id } = req.params;
    db.run("UPDATE elections SET name = ? WHERE id = ?", [name, id], function (err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

// POST /api/admin/election/start - Start election
app.post('/api/admin/election/start', (req, res) => {
    const { election_id } = req.body;
    db.run("UPDATE elections SET status = 'RUNNING', started_at = CURRENT_TIMESTAMP WHERE id = ?", [election_id], function (err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

// POST /api/admin/election/stop - Stop election
app.post('/api/admin/election/stop', (req, res) => {
    const { election_id } = req.body;
    db.run("UPDATE elections SET status = 'ENDED', ended_at = CURRENT_TIMESTAMP WHERE id = ?", [election_id], function (err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

// DELETE /api/admin/elections/:id - Delete election
app.delete('/api/admin/elections/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM elections WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

// POST /api/admin/election/reset - Reset election (delete votes and go back to SETUP/CREATED)
app.post('/api/admin/election/reset', (req, res) => {
    const { election_id } = req.body;
    if (!election_id) return res.status(400).json({ success: false, message: "election_id is required" });

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        // 1. Delete all votes
        db.run("DELETE FROM votes WHERE election_id = ?", [election_id], (err) => {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ success: false, message: "Failed to delete votes: " + err.message });
            }
            // 2. Reset election status and timestamps
            db.run("UPDATE elections SET status = 'CREATED', started_at = NULL, ended_at = NULL WHERE id = ?", [election_id], (err) => {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ success: false, message: "Failed to update election status: " + err.message });
                }
                db.run("COMMIT");
                res.json({ success: true, message: "Election reset successfully. All votes removed." });
            });
        });
    });
});

// GET /api/election/details - Get parties and candidates for an election
app.get('/api/election/details', (req, res) => {
    const election_id = req.query.election_id;
    if (!election_id) return res.status(400).json({ success: false, message: "election_id is required" });

    db.all("SELECT * FROM parties WHERE election_id = ? AND active = 1", [election_id], (err, parties) => {
        if (err) return res.status(500).json({ success: false, message: err.message });

        db.all("SELECT * FROM candidates WHERE election_id = ? AND active = 1", [election_id], (err, candidates) => {
            if (err) return res.status(500).json({ success: false, message: err.message });

            // Map candidates to use 'party' field as party_id for frontend compatibility
            // Use environment-aware URL for images
            const baseUrl = process.env.VERCEL_URL
                ? `https://${process.env.VERCEL_URL}`
                : (req.protocol + '://' + req.get('host'));

            const mappedCandidates = candidates.map(c => ({
                id: c.id,
                name: c.name,
                party: c.party_id,
                image_path: c.image_path ? `${baseUrl}/${c.image_path}` : null
            }));

            const mappedParties = parties.map(p => ({
                id: p.id,
                party_id: p.party_id,
                party_name: p.party_name,
                symbol_path: p.symbol_path ? `${baseUrl}/${p.symbol_path}` : null
            }));

            res.json({
                success: true,
                data: {
                    parties: mappedParties,
                    candidates: mappedCandidates
                }
            });
        });
    });
});

// --- Parties ---

// POST /api/admin/party/add - Add party
app.post('/api/admin/party/add', upload.single('symbol'), (req, res) => {
    const { party_id, party_name, election_id } = req.body;
    const symbol_path = req.file ? req.file.path : null;

    db.get("SELECT status FROM elections WHERE id = ?", [election_id], (err, election) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!election) return res.status(404).json({ success: false, message: "Election not found" });
        if (election.status === 'ENDED') {
            return res.status(400).json({ success: false, message: "Cannot add party to an ended election" });
        }

        db.run("INSERT INTO parties (election_id, party_id, party_name, symbol_path) VALUES (?, ?, ?, ?)",
            [election_id, party_id, party_name, symbol_path], function (err) {
                if (err) return res.status(500).json({ success: false, message: err.message });
                res.json({ success: true, id: this.lastID });
            });
    });
});

// DELETE /api/admin/party/:id - Delete party
app.delete('/api/admin/party/:id', (req, res) => {
    const { id } = req.params;

    // Check if any votes exist for this party IN THIS SPECIFIC ROSTER ENTRY
    db.get("SELECT p.election_id, p.party_id, (SELECT COUNT(*) FROM votes WHERE party_id = p.party_id AND election_id = p.election_id) as vote_count FROM parties p WHERE p.id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!row) return res.status(404).json({ success: false, message: "Party not found" });

        if (row.vote_count > 0) {
            return res.status(409).json({ success: false, message: `Cannot delete party as it already has ${row.vote_count} votes in this election. You must reset the election first to remove it from the roster.` });
        }

        // Soft delete
        db.run("UPDATE parties SET active = 0 WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true });
        });
    });
});

// --- Candidates ---

// POST /api/admin/candidate/add - Add candidate
app.post('/api/admin/candidate/add', upload.single('photo'), (req, res) => {
    const { election_id, party, name } = req.body;
    const image_path = req.file ? req.file.path : null;

    db.get("SELECT status FROM elections WHERE id = ?", [election_id], (err, election) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!election) return res.status(404).json({ success: false, message: "Election not found" });
        if (election.status === 'ENDED') {
            return res.status(400).json({ success: false, message: "Cannot add candidate to an ended election" });
        }

        db.run("INSERT INTO candidates (election_id, party_id, name, image_path) VALUES (?, ?, ?, ?)",
            [election_id, party, name, image_path], function (err) {
                if (err) return res.status(500).json({ success: false, message: err.message });
                res.json({ success: true, id: this.lastID });
            });
    });
});

// DELETE /api/admin/candidate/:id - Delete candidate
app.delete('/api/admin/candidate/:id', (req, res) => {
    const { id } = req.params;

    // Check if any votes exist for this candidate
    db.get("SELECT (SELECT COUNT(*) FROM votes WHERE candidate_id = ?) as vote_count", [id], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: err.message });

        if (row.vote_count > 0) {
            return res.status(409).json({ success: false, message: `Cannot delete candidate as they already have ${row.vote_count} votes. You must reset the election first to remove them.` });
        }

        // Soft delete
        db.run("UPDATE candidates SET active = 0 WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true });
        });
    });
});

// --- Voters ---

// POST /api/voter/register - Register voter
app.post('/api/voter/register', (req, res) => {
    const { name, father_name, cnic, address, profile_pic_name } = req.body;
    db.run("INSERT INTO voters (cnic, name, father_name, address, profile_pic_name) VALUES (?, ?, ?, ?, ?)",
        [cnic, name, father_name, address, profile_pic_name], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ success: false, message: "CNIC already registered" });
                }
                return res.status(500).json({ success: false, message: err.message });
            }
            res.json({ success: true, cnic });
        });
});

// POST /api/voter/login - Voter login
app.post('/api/voter/login', (req, res) => {
    const { cnic } = req.body;
    db.get("SELECT * FROM voters WHERE cnic = ?", [cnic], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!row) return res.status(404).json({ success: false, message: "CNIC not registered" });
        res.json({ success: true, cnic: row.cnic });
    });
});

// --- Admin ---

// POST /api/admin/login - Admin login
app.post('/api/admin/login', (req, res) => {
    const { admin_id, password } = req.body;
    db.get("SELECT * FROM admins WHERE admin_id = ? AND password = ?", [admin_id, password], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!row) return res.status(401).json({ success: false, message: "Invalid credentials" });
        res.json({ success: true, token: "fake-jwt-token" });
    });
});

// POST /api/admin/change-credentials
app.post('/api/admin/change-credentials', (req, res) => {
    const { admin_id, old_password, new_password } = req.body;
    db.get("SELECT * FROM admins WHERE admin_id = ? AND password = ?", [admin_id, old_password], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!row) return res.status(401).json({ success: false, message: "Invalid old password" });

        db.run("UPDATE admins SET password = ? WHERE admin_id = ?", [new_password, admin_id], (err) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true });
        });
    });
});

// --- Voting ---

// POST /api/vote/cast
app.post('/api/vote/cast', (req, res) => {
    const { cnic, election_id, party_id, candidate_id } = req.body;

    // 1. Check if election is RUNNING
    db.get("SELECT status FROM elections WHERE id = ?", [election_id], (err, election) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!election) return res.status(404).json({ success: false, message: "Election not found" });
        if (election.status !== 'RUNNING') {
            return res.status(400).json({ success: false, message: "Election is not currently running" });
        }

        // 2. Check if voter is REGISTERED
        db.get("SELECT * FROM voters WHERE cnic = ?", [cnic], (err, voter) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            if (!voter) {
                return res.status(403).json({ success: false, message: "You are not registered. Please register before voting." });
            }

            // 3. Check if candidate belongs to this election and is active
            db.get("SELECT * FROM candidates WHERE id = ? AND election_id = ? AND active = 1", [candidate_id, election_id], (err, candidate) => {
                if (err) return res.status(500).json({ success: false, message: err.message });
                if (!candidate) {
                    return res.status(400).json({ success: false, message: "Invalid candidate for this election" });
                }

                // 4. Perform Vote Casting
                db.run("INSERT INTO votes (election_id, voter_cnic, party_id, candidate_id) VALUES (?, ?, ?, ?)",
                    [election_id, cnic, party_id, candidate_id], function (err) {
                        if (err) {
                            if (err.message.includes('UNIQUE')) {
                                return res.status(409).json({ success: false, message: "You have already voted in this election." });
                            }
                            return res.status(500).json({ success: false, message: err.message });
                        }
                        res.json({ success: true });
                    });
            });
        });
    });
});

// --- Results ---

// GET /api/results - Get results for an election
app.get('/api/results', (req, res) => {
    const election_id = req.query.election_id;

    // Check if election is ENDED
    db.get("SELECT status FROM elections WHERE id = ?", [election_id], (err, election) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!election) return res.status(404).json({ success: false, message: "Election not found" });
        if (election.status !== 'ENDED') {
            return res.status(403).json({ success: false, message: "Results are only available after the election has ended" });
        }

        const query = `
            SELECT 
                p.party_name as party,
                c.name as name,
                COUNT(v.id) as vote_count
            FROM candidates c
            LEFT JOIN parties p ON c.party_id = p.party_id AND p.election_id = ?
            LEFT JOIN votes v ON v.candidate_id = c.id AND v.election_id = ?
            WHERE c.election_id = ? AND c.active = 1
            GROUP BY c.id
            ORDER BY vote_count DESC
        `;

        db.all(query, [election_id, election_id, election_id], (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, data: { candidates: rows } });
        });
    });
});

// #region agent log
// Catch-all route to log unmatched requests
app.use((req, res) => {
    const unmatchedInfo = {
        method: req.method,
        path: req.path,
        url: req.url,
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl,
        isVercel: !!process.env.VERCEL,
        vercelUrl: process.env.VERCEL_URL,
        allRoutes: ['/', '/api/test', '/api/elections', '/api/voter/login', '/api/election/details', '/api/results']
    };
    fetch('http://127.0.0.1:7242/ingest/a2eaae95-ca36-48f9-9d8c-f5d9f506986b', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'server.js:347', message: 'Unmatched route - 404', data: unmatchedInfo, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run4', hypothesisId: 'J' }) }).catch(() => { });
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path,
        url: req.url,
        originalUrl: req.originalUrl,
        isVercel: !!process.env.VERCEL,
        hint: 'Check Vercel Function Logs for detailed path information'
    });
});
// #endregion

// Export app for Vercel serverless functions
// #region agent log
// Log export to verify module is being loaded
if (typeof module !== 'undefined' && module.exports) {
    fetch('http://127.0.0.1:7242/ingest/a2eaae95-ca36-48f9-9d8c-f5d9f506986b', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'server.js:300', message: 'Module exported', data: { isVercel: !!process.env.VERCEL, vercelUrl: process.env.VERCEL_URL, nodeEnv: process.env.NODE_ENV }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
}
// #endregion
module.exports = app;

// Start server only when running locally (not in serverless environment)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
