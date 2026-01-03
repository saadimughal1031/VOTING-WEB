-- Database Initialization Script
-- Run this to create a fresh database with the correct schema
-- Usage: sqlite3 voting.db < init_database.sql

-- First, drop existing tables if they exist (use with caution!)
-- Uncomment the following lines if you want to reset the database:
-- DROP TABLE IF EXISTS votes;
-- DROP TABLE IF EXISTS candidates;
-- DROP TABLE IF EXISTS parties;
-- DROP TABLE IF EXISTS elections;
-- DROP TABLE IF EXISTS voters;
-- DROP TABLE IF EXISTS admins;

-- Create schema
.read schema.sql

-- Insert seed data
.read seed.sql

-- Verify the database
SELECT 'Database initialized successfully!' as status;
SELECT COUNT(*) as voter_count FROM voters;
SELECT COUNT(*) as election_count FROM elections;
SELECT COUNT(*) as candidate_count FROM candidates;
SELECT COUNT(*) as admin_count FROM admins;

