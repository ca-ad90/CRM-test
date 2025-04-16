import { getDbConnection, runTransaction } from './connection.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Apply database migrations in sequence
 * @returns {Promise<void>}
 */
export async function applyMigrations() {
    const db = await getDbConnection();

    // Create migrations table if it doesn't exist
    await db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            migration_name TEXT NOT NULL UNIQUE,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Get applied migrations
    const appliedMigrations = await db.all('SELECT migration_name FROM migrations');
    const appliedMigrationNames = new Set(appliedMigrations.map(m => m.migration_name));

    // Get all migration files
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const migrationsDir = path.join(__dirname, '../migrations');

    try {
        await fs.mkdir(migrationsDir, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') {
            throw err;
        }
    }

    // Read migration files
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort(); // Sort to ensure migrations are applied in order

    // Apply pending migrations
    for (const file of migrationFiles) {
        if (!appliedMigrationNames.has(file)) {
            console.log(`Applying migration: ${file}`);

            try {
                // Read migration file
                const filePath = path.join(migrationsDir, file);
                const sql = await fs.readFile(filePath, 'utf8');

                // Apply migration in a transaction
                await runTransaction(async (db) => {
                    // Execute migration
                    await db.exec(sql);

                    // Record migration
                    await db.run(
                        'INSERT INTO migrations (migration_name) VALUES (?)',
                        [file]
                    );
                });

                console.log(`Successfully applied migration: ${file}`);
            } catch (error) {
                console.error(`Error applying migration ${file}:`, error);
                throw error;
            }
        }
    }

    console.log('All migrations applied successfully');
}

/**
 * Create a new migration file
 * @param {string} name - Migration name
 * @returns {Promise<string>} Path to the created migration file
 */
export async function createMigration(name) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const migrationsDir = path.join(__dirname, '../migrations');

    try {
        await fs.mkdir(migrationsDir, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') {
            throw err;
        }
    }

    // Create timestamp
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const fileName = `${timestamp}_${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.sql`;
    const filePath = path.join(migrationsDir, fileName);

    // Create migration file template
    const template = `-- Migration: ${name}
-- Created at: ${new Date().toISOString()}

-- Write your migration SQL here
-- Use -- Up for the changes to apply
-- Use -- Down for rollback (optional)

-- Up

-- Add your schema changes here


-- Down

-- Add rollback SQL here (optional)
`;

    await fs.writeFile(filePath, template, 'utf8');
    console.log(`Created migration file: ${fileName}`);

    return filePath;
}

/**
 * Create the admin migration file
 * @returns {Promise<void>}
 */
export async function createAdminMigration() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const migrationsDir = path.join(__dirname, '../migrations');

    try {
        await fs.mkdir(migrationsDir, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') {
            throw err;
        }
    }

    const fileName = '000001_add_admin_support.sql';
    const filePath = path.join(migrationsDir, fileName);

    // Check if file already exists
    try {
        await fs.access(filePath);
        console.log('Admin migration already exists, skipping creation');
        return;
    } catch (error) {
        // File doesn't exist, continue
    }

    // Get the admin schema SQL from our artifact
    const adminSql = `-- Add roles table
CREATE TABLE IF NOT EXISTS roles (
    role_id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT NOT NULL UNIQUE,
    description TEXT
);

-- Insert default roles
INSERT INTO roles (role_name, description) VALUES
('admin', 'Administrator with full access'),
('user', 'Regular user with limited access');

-- Add role column to users table
ALTER TABLE users ADD COLUMN role_id INTEGER DEFAULT 2;
ALTER TABLE users ADD FOREIGN KEY (role_id) REFERENCES roles(role_id);

-- Create the first admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role_id, created_at)
VALUES ('admin', 'admin@example.com',
        '$2b$10$rF.tRWF/H1.XhJNoBmgZTuZC9pPUq5wf6IzZ73KyB0YV1LPzLFM2m',
        1, CURRENT_TIMESTAMP);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
    permission_name TEXT NOT NULL UNIQUE,
    description TEXT
);

-- Insert default permissions
INSERT INTO permissions (permission_name, description) VALUES
('manage_users', 'Create, view, edit, and delete users'),
('view_all_data', 'View all companies, contacts, communications, and meetings'),
('edit_all_data', 'Edit all companies, contacts, communications, and meetings'),
('delete_all_data', 'Delete all companies, contacts, communications, and meetings');

-- Create role_permissions join table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE
);

-- Assign permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, permission_id FROM permissions;

-- Create activity_log table for audit trail
CREATE TABLE IF NOT EXISTS activity_log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Create view for user permissions (simplifies permission checks)
CREATE VIEW IF NOT EXISTS user_permissions AS
SELECT u.user_id, p.permission_name
FROM users u
JOIN roles r ON u.role_id = r.role_id
JOIN role_permissions rp ON r.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.permission_id;

-- Index for faster permission lookups
CREATE INDEX IF NOT EXISTS idx_user_permissions ON role_permissions(role_id);`;

    await fs.writeFile(filePath, adminSql, 'utf8');
    console.log(`Created admin migration file: ${fileName}`);
}

/**
 * Rollback the last migration
 * @returns {Promise<void>}
 */
export async function rollbackLastMigration() {
    const db = await getDbConnection();

    // Get the last applied migration
    const lastMigration = await db.get(
        'SELECT id, migration_name FROM migrations ORDER BY id DESC LIMIT 1'
    );

    if (!lastMigration) {
        console.log('No migrations to roll back');
        return;
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const filePath = path.join(__dirname, '../migrations', lastMigration.migration_name);

    try {
        // Read migration file
        const sql = await fs.readFile(filePath, 'utf8');

        // Find the Down section
        const downMatch = sql.match(/-- Down\s+([\s\S]*?)(\s*-- .*|\s*$)/);

        if (!downMatch || !downMatch[1].trim()) {
            console.log(`No rollback SQL found in migration: ${lastMigration.migration_name}`);
            return;
        }

        const downSql = downMatch[1].trim();

        // Apply rollback in a transaction
        await runTransaction(async (db) => {
            // Execute rollback
            await db.exec(downSql);

            // Remove migration record
            await db.run('DELETE FROM migrations WHERE id = ?', [lastMigration.id]);
        });

        console.log(`Successfully rolled back migration: ${lastMigration.migration_name}`);
    } catch (error) {
        console.error(`Error rolling back migration ${lastMigration.migration_name}:`, error);
        throw error;
    }
}

/**
 * Get migration status
 * @returns {Promise<object>} Migration status object
 */
export async function getMigrationStatus() {
    const db = await getDbConnection();

    // Get applied migrations
    const appliedMigrations = await db.all(
        'SELECT id, migration_name, applied_at FROM migrations ORDER BY id'
    );

    // Get all migration files
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const migrationsDir = path.join(__dirname, '../migrations');

    let files = [];
    try {
        files = await fs.readdir(migrationsDir);
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }

    const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort();

    // Create status object
    const appliedNames = new Set(appliedMigrations.map(m => m.migration_name));
    const pendingMigrations = migrationFiles.filter(file => !appliedNames.has(file));

    return {
        applied: appliedMigrations,
        pending: pendingMigrations,
        total: migrationFiles.length,
        appliedCount: appliedMigrations.length,
        pendingCount: pendingMigrations.length
    };
}
