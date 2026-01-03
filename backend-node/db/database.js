const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'voting.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Elections table
        db.run(`CREATE TABLE IF NOT EXISTS elections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            status TEXT DEFAULT 'CREATED', -- CREATED, RUNNING, ENDED
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            started_at DATETIME,
            ended_at DATETIME
        )`);

        // Parties table
        db.run(`CREATE TABLE IF NOT EXISTS parties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            election_id INTEGER,
            party_id TEXT, -- e.g. P1
            party_name TEXT NOT NULL,
            symbol_path TEXT,
            FOREIGN KEY(election_id) REFERENCES elections(id) ON DELETE CASCADE
        )`);

        // Candidates table
        db.run(`CREATE TABLE IF NOT EXISTS candidates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            election_id INTEGER,
            party_id TEXT, -- matches parties.party_id
            name TEXT NOT NULL,
            image_path TEXT,
            FOREIGN KEY(election_id) REFERENCES elections(id) ON DELETE CASCADE
        )`);

        // Voters table
        db.run(`CREATE TABLE IF NOT EXISTS voters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cnic TEXT UNIQUE NOT NULL,
            name TEXT,
            father_name TEXT,
            address TEXT,
            profile_pic_name TEXT
        )`);

        // Votes table
        db.run(`CREATE TABLE IF NOT EXISTS votes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            election_id INTEGER,
            voter_cnic TEXT,
            party_id TEXT,
            candidate_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(election_id, voter_cnic), -- One vote per election per voter
            FOREIGN KEY(election_id) REFERENCES elections(id) ON DELETE CASCADE,
            FOREIGN KEY(voter_cnic) REFERENCES voters(cnic) ON DELETE CASCADE
        )`);

        // Admins table (optional, but keep for login)
        db.run(`CREATE TABLE IF NOT EXISTS admins (
            admin_id TEXT PRIMARY KEY,
            password TEXT NOT NULL
        )`);

        // Seed default admin
        db.get("SELECT * FROM admins WHERE admin_id = 'admin'", [], (err, row) => {
            if (!row) {
                db.run("INSERT INTO admins (admin_id, password) VALUES ('admin', 'admin123')");
            }
        });
    });
}

module.exports = db;
