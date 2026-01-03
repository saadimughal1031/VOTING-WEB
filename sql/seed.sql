-- Demo Admin
INSERT OR IGNORE INTO admins(admin_id, password)
VALUES ('admin01', 'admin123');

-- Demo Elections (using id column)
INSERT OR IGNORE INTO elections(id, name, status)
VALUES (1, 'General Election 2025', 'RUNNING');

INSERT OR IGNORE INTO elections(id, name, status)
VALUES (2, 'University Election', 'CREATED');

-- Parties for election 1 (kept for reference)
INSERT OR IGNORE INTO parties(party_id, election_id, party_name)
VALUES ('P1', 1, 'Party A');

INSERT OR IGNORE INTO parties(party_id, election_id, party_name)
VALUES ('P2', 1, 'Party B');

-- Candidates for election 1 (using id, name, party columns)
INSERT OR IGNORE INTO candidates(id, election_id, party, name)
VALUES (1, 1, 'Party A', 'Candidate 1');

INSERT OR IGNORE INTO candidates(id, election_id, party, name)
VALUES (2, 1, 'Party B', 'Candidate 2');
