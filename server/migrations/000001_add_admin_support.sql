-- Add roles table
CREATE TABLE IF NOT EXISTS roles (
    role_id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT NOT NULL UNIQUE,
    description TEXT
);


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
CREATE INDEX IF NOT EXISTS idx_user_permissions ON role_permissions(role_id);
