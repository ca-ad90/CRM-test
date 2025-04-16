import sqlite3 from "sqlite3";
import { open } from "sqlite";
import * as path from 'path';
import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';

// Enable verbose logging in development
if (process.env.NODE_ENV !== 'production') {
    sqlite3.verbose();
}

// Database connection pool (singleton pattern)
let dbInstance = null;
let connectionInProgress = null;

/**
 * Initialize the database connection with improved error handling and performance
 * @returns {Promise<object>} The database connection object
 */
export async function getDbConnection() {
    if (dbInstance) {
        return dbInstance;
    }

    // If a connection is already in progress, wait for it
    if (connectionInProgress) {
        return connectionInProgress;
    }

    connectionInProgress = (async () => {
        try {
            // Ensure the data directory exists
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            const dataDir = path.join(__dirname, '../data');
            const dbPath = path.join(dataDir, 'database.sqlite');
            
            // Create the data directory if it doesn't exist
            try {
                await mkdir(dataDir, { recursive: true });
            } catch (err) {
                if (err.code !== 'EEXIST') {
                    throw err;
                }
            }
            
            // Open the database connection with WAL mode for better concurrency
            dbInstance = await open({
                filename: dbPath,
                driver: sqlite3.Database,
                // This allows multiple readers while write operations are queued
                mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
            });
            
            // Set pragmas for better performance
            await dbInstance.exec('PRAGMA journal_mode = WAL;'); // Write-Ahead Logging for better concurrency
            await dbInstance.exec('PRAGMA synchronous = NORMAL;'); // Balance between durability and performance
            await dbInstance.exec('PRAGMA foreign_keys = ON;'); // Enable foreign key constraints
            await dbInstance.exec('PRAGMA cache_size = -64000;'); // Increase cache size (in KB)
            
            // Set timeout for busy connections
            await dbInstance.configure('busyTimeout', 5000);
            
            console.log(`Database connection established at ${dbPath}`);
            return dbInstance;
        } catch (error) {
            console.error("Failed to open database connection:", error);
            connectionInProgress = null;
            throw error;
        }
    })();

    return connectionInProgress;
}

/**
 * Run a transaction with automatic commit/rollback
 * @param {Function} callback - Callback function with db instance as parameter
 * @returns {Promise<any>} Result from the callback function
 */
export async function runTransaction(callback) {
    const db = await getDbConnection();
    
    try {
        await db.exec('BEGIN TRANSACTION');
        const result = await callback(db);
        await db.exec('COMMIT');
        return result;
    } catch (error) {
        await db.exec('ROLLBACK').catch(err => {
            console.error("Error during transaction rollback:", err);
        });
        throw error;
    }
}

/**
 * Close the database connection (mainly for testing)
 */
export async function closeDbConnection() {
    if (dbInstance) {
        try {
            await dbInstance.close();
            console.log("Database connection closed");
        } catch (error) {
            console.error("Error closing database connection:", error);
        } finally {
            dbInstance = null;
            connectionInProgress = null;
        }
    }
}

/**
 * Execute a query with automatic error handling and logging
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @param {string} method - DB method (get, all, run)
 * @returns {Promise<any>} Query result
 */
export async function executeQuery(query, params = [], method = 'all') {
    const db = await getDbConnection();
    
    try {
        const validMethods = ['get', 'all', 'run', 'exec'];
        if (!validMethods.includes(method)) {
            throw new Error(`Invalid query method: ${method}`);
        }
        
        return await db[method](query, params);
    } catch (error) {
        // Enhance error with query info for easier debugging
        error.query = query;
        error.params = params;
        error.method = method;
        throw error;
    }
}

// Repository of table schemas for the application
export const tableSchemas = {
    companies: {
        columns: [
            "company_id",
            "company_name",
            "website",
            "address",
            "phone",
            "email",
        ],
        userTable: "user_companies",
        idColumn: "company_id",
    },
    contacts: {
        columns: [
            "contact_id",
            "company_id",
            "first_name",
            "last_name",
            "position",
            "email",
            "phone",
            "linkedin_url",
            "notes",
        ],
        userTable: "user_contacts",
        idColumn: "contact_id",
    },
    communications: {
        columns: [
            "communication_id",
            "contact_id",
            "date_contacted",
            "contact_method",
            "message_content",
            "received_response",
            "response_date",
            "response_content",
        ],
        userTable: "user_communications",
        idColumn: "communication_id",
    },
    meetings: {
        columns: [
            "meeting_id",
            "contact_id",
            "meeting_date",
            "location",
            "meeting_type",
            "meeting_status",
            "meeting_notes",
            "follow_up_needed",
        ],
        userTable: "user_meetings",
        idColumn: "meeting_id",
    },
    users: {
        columns: [
            "user_id", 
            "username", 
            "email", 
            "password_hash", 
            "role_id", 
            "created_at", 
            "last_login"
        ],
        idColumn: "user_id",
    },
    roles: {
        columns: [
            "role_id",
            "role_name",
            "description"
        ],
        idColumn: "role_id"
    },
    permissions: {
        columns: [
            "permission_id",
            "permission_name",
            "description"
        ],
        idColumn: "permission_id"
    }
};

/**
 * Generate SQL placeholders for a list of values
 * @param {number} count - Number of placeholders to generate
 * @returns {string} SQL placeholder string (e.g., "?, ?, ?")
 */
export function generatePlaceholders(count) {
    return Array(count).fill('?').join(', ');
}

/**
 * Check if a user has admin role
 * @param {number} userId - User ID to check
 * @returns {Promise<boolean>} Whether user is an admin
 */
export async function isUserAdmin(userId) {
    const db = await getDbConnection();
    const user = await db.get(
        "SELECT role_id FROM users WHERE user_id = ?",
        userId
    );
    
    return user && user.role_id === 1;
}
