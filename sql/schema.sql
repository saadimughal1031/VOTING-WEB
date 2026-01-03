PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admins (
  admin_id TEXT PRIMARY KEY,
  password TEXT NOT NULL
);

-- Voters table: Added id column as PRIMARY KEY, cnic as UNIQUE
CREATE TABLE IF NOT EXISTS voters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cnic TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  father_name TEXT NOT NULL,
  address TEXT NOT NULL,
  profile_pic_name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Elections table: Changed to use 'id' instead of 'election_id'
CREATE TABLE IF NOT EXISTS elections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('CREATED','RUNNING','ENDED')) DEFAULT 'CREATED'
);

-- Parties table: Keep for reference, but candidates will have party name directly
CREATE TABLE IF NOT EXISTS parties (
  party_id TEXT,
  election_id INTEGER NOT NULL,
  party_name TEXT NOT NULL,
  symbol_path TEXT,
  PRIMARY KEY (party_id, election_id),
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
);

-- Candidates table: Match code expectations - id as PK, name (not candidate_name), party as TEXT column
CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER NOT NULL,
  party TEXT NOT NULL,
  name TEXT NOT NULL,
  image_path TEXT,
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE
);

-- Votes table: Use voter_id (integer), candidate_id (integer), add party_id for reference
CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  election_id INTEGER NOT NULL,
  voter_id INTEGER NOT NULL,
  candidate_id INTEGER NOT NULL,
  party_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
  FOREIGN KEY (voter_id) REFERENCES voters(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  UNIQUE (election_id, voter_id)
);

-- Support queries table for help widget
CREATE TABLE IF NOT EXISTS support_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
