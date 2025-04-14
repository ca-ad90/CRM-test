// db/connection.js - Database connection and initialization

import sqlite3 from "sqlite3";
import { open } from "sqlite";
import * as fs from 'node:fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

global.db = null;

/**
 * Initialize the database connection
 * @returns {Promise<object>} The database connection object
 */
export async function getDbConnection() {
    if (global.db) {
        return global.db;
    }

    // Open the database connection
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dbPath = path.join(__dirname, "..", "database.sqlite");
    global.db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    console.log("Database connection established");
    return global.db;
}

/**
 * Initialize the database with schema if needed
 */
export async function initializeDatabase() {
    const db = await getDbConnection();

    // Check if tables exist
    const tablesExist = await db.get(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='companies'
    `);

    if (!tablesExist) {
        console.log("Initializing database schema...");

        // Read schema from init.sql file
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const initSql = fs.readFileSync(
            path.join(__dirname, "..", "init.sql"),
            "utf8"
        );

        // Execute schema creation
        await db.exec(initSql);
        console.log("Database schema initialized");
    }

    // Check if user tables exist, if not create them
    const userTablesExist = await db.get(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='users'
    `);

    if (!userTablesExist) {
        console.log("Initializing user tables...");

        // User tables schema
        const userSchema = `
            -- Users table
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            );

            -- User permissions for companies
            CREATE TABLE IF NOT EXISTS user_companies (
                user_id INTEGER,
                company_id INTEGER,
                is_owner INTEGER DEFAULT 0, -- 0 = shared, 1 = owner
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, company_id),
                FOREIGN KEY (user_id) REFERENCES users(user_id),
                FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
            );

            -- User permissions for contacts
            CREATE TABLE IF NOT EXISTS user_contacts (
                user_id INTEGER,
                contact_id INTEGER,
                is_owner INTEGER DEFAULT 0, -- 0 = shared, 1 = owner
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, contact_id),
                FOREIGN KEY (user_id) REFERENCES users(user_id),
                FOREIGN KEY (contact_id) REFERENCES contacts(contact_id) ON DELETE CASCADE
            );

            -- User permissions for meetings
            CREATE TABLE IF NOT EXISTS user_meetings (
                user_id INTEGER,
                meeting_id INTEGER,
                is_owner INTEGER DEFAULT 0, -- 0 = shared, 1 = owner
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, meeting_id),
                FOREIGN KEY (user_id) REFERENCES users(user_id),
                FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id) ON DELETE CASCADE
            );

            -- User permissions for communications
            CREATE TABLE IF NOT EXISTS user_communications (
                user_id INTEGER,
                communication_id INTEGER,
                is_owner INTEGER DEFAULT 0, -- 0 = shared, 1 = owner
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, communication_id),
                FOREIGN KEY (user_id) REFERENCES users(user_id),
                FOREIGN KEY (communication_id) REFERENCES communications(communication_id) ON DELETE CASCADE
            );

            -- Add default admin user
            INSERT OR IGNORE INTO users (username) VALUES ('admin');
        `;

        // Execute user schema creation
        await db.exec(userSchema);
        console.log("User tables initialized");
    }
}
