const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
const db = require('./db/database');

const app = express();
const PORT = 8080;

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

// --- Elections ---

// GET /api/elections - List all elections
app.get('/api/elections', (req, res) => {
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
    db.run("INSERT INTO elections (name) VALUES (?)", [name], function (err) {
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

// GET /api/election/details - Get parties and candidates for an election
app.get('/api/election/details', (req, res) => {
    const election_id = req.query.election_id;
    if (!election_id) return res.status(400).json({ success: false, message: "election_id is required" });

    db.all("SELECT * FROM parties WHERE election_id = ?", [election_id], (err, parties) => {
        if (err) return res.status(500).json({ success: false, message: err.message });

        db.all("SELECT * FROM candidates WHERE election_id = ?", [election_id], (err, candidates) => {
            if (err) return res.status(500).json({ success: false, message: err.message });

            // Map candidates to use 'party' field as party_id for frontend compatibility
            const mappedCandidates = candidates.map(c => ({
                id: c.id,
                name: c.name,
                party: c.party_id,
                image_path: c.image_path ? `http://localhost:8080/${c.image_path}` : null
            }));

            const mappedParties = parties.map(p => ({
                party_id: p.party_id,
                party_name: p.party_name,
                symbol_path: p.symbol_path ? `http://localhost:8080/${p.symbol_path}` : null
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

    db.run("INSERT INTO parties (election_id, party_id, party_name, symbol_path) VALUES (?, ?, ?, ?)",
        [election_id, party_id, party_name, symbol_path], function (err) {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, id: this.lastID });
        });
});

// --- Candidates ---

// POST /api/admin/candidate/add - Add candidate
app.post('/api/admin/candidate/add', upload.single('photo'), (req, res) => {
    const { election_id, party, name } = req.body;
    const image_path = req.file ? req.file.path : null;

    db.run("INSERT INTO candidates (election_id, party_id, name, image_path) VALUES (?, ?, ?, ?)",
        [election_id, party, name, image_path], function (err) {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, id: this.lastID });
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

    // Check if election is RUNNING
    db.get("SELECT status FROM elections WHERE id = ?", [election_id], (err, election) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (!election || election.status !== 'RUNNING') {
            return res.status(400).json({ success: false, message: "Election is not currently running" });
        }

        db.run("INSERT INTO votes (election_id, voter_cnic, party_id, candidate_id) VALUES (?, ?, ?, ?)",
            [election_id, cnic, party_id, candidate_id], function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ success: false, message: "You have already voted in this election" });
                    }
                    return res.status(500).json({ success: false, message: err.message });
                }
                res.json({ success: true });
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
            WHERE c.election_id = ?
            GROUP BY c.id
            ORDER BY vote_count DESC
        `;

        db.all(query, [election_id, election_id, election_id], (err, rows) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, data: { candidates: rows } });
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
