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
