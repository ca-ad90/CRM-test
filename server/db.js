import sqlite3 from "sqlite3";
import { open } from "sqlite";
import * as fs from "node:fs";
import * as path from "path";
import { fileURLToPath } from "url";
// Database connection singleton

global.db = null;
/**
 * Initialize the database connection
 * @returns {Promise<object>} The database connection object
 */
async function getDbConnection() {
    if (global.db) {
        return global.db;
    }

    // Open the database connection
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dbPath = path.join(__dirname, "database.sqlite");
    global.db = await open({
        filename: dbPath,
        driver: sqlite3.Database,
    });

    console.log("Database connection established");
    return global.db;
}

/**
 * Companies related database operations
 */
export const companiesDb = {
    /**
     * Get all companies
     * @returns {Promise<Array>} Array of company objects
     */
    async getAll() {
        const db = await getDbConnection();
        let data = await db.all(
            "SELECT * FROM companies ORDER BY company_name",
        );
        return data;
    },

    /**
     * Get a company by ID
     * @param {number} id - The company ID
     * @returns {Promise<object>} The company object
     */
    async getById(id) {
        const db = await getDbConnection();
        return db.get("SELECT * FROM companies WHERE company_id = ?", id);
    },

    /**
     * Create a new company
     * @param {object} company - The company data
     * @returns {Promise<object>} The created company with ID
     */
    async create(company) {
        const db = await getDbConnection();
        const result = await db.run(
            "INSERT INTO companies (company_name,  website, address,phone,email) VALUES (?, ?, ?, ?,?,?)",
            [
                company.company_name,
                company.website,
                company.address,
                company.phone,
                company.email,
            ],
        );

        return {
            company_id: result.lastID,
            ...company,
        };
    },

    /**
     * Update a company
     * @param {number} id - The company ID
     * @param {object} company - The updated company data
     * @returns {Promise<boolean>} Success status
     */
    async update(id, company) {
        const db = await getDbConnection();
        const result = await db.run(
            "UPDATE companies SET company_name = ?, website = ?, address = ?, phone=?,email=? WHERE company_id = ?",
            [
                company.company_name,
                company.website,
                company.address,
                company.phone,
                company.email,
                id,
            ],
        );

        return result.changes > 0;
    },

    /**
     * Delete a company
     * @param {number} id - The company ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id) {
        const db = await getDbConnection();
        const result = await db.run(
            "DELETE FROM companies WHERE company_id = ?",
            id,
        );
        return result.changes > 0;
    },
};

/**
 * Contacts related database operations
 */
export const contactsDb = {
    /**
     * Get all contacts
     * @returns {Promise<Array>} Array of contact objects
     */
    async getAll() {
        const db = await getDbConnection();
        console.log("get all contacts");
        return db.all(`
      SELECT c.*, co.company_name
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.company_id
      ORDER BY c.last_name, c.first_name
    `);
    },

    /**
     * Get a contact by ID
     * @param {number} id - The contact ID
     * @returns {Promise<object>} The contact object
     */
    async getById(id) {
        const db = await getDbConnection();
        return db.get(
            `
      SELECT c.*, co.company_name
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.company_id
      WHERE c.contact_id = ?
    `,
            id,
        );
    },

    /**
     * Get contacts by company ID
     * @param {number} companyId - The company ID
     * @returns {Promise<Array>} Array of contact objects
     */
    async getByCompanyId(companyId) {
        const db = await getDbConnection();
        return db.all(
            "SELECT * FROM contacts WHERE company_id = ? ORDER BY last_name, first_name",
            companyId,
        );
    },

    /**
     * Create a new contact
     * @param {object} contact - The contact data
     * @returns {Promise<object>} The created contact with ID
     */
    async create(contact) {
        const db = await getDbConnection();
        const result = await db.run(
            `INSERT INTO contacts
       (company_id, first_name, last_name, position, email, phone, linkedin_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                contact.company_id,
                contact.first_name,
                contact.last_name,
                contact.position,
                contact.email,
                contact.phone,
                contact.linkedin_url,
            ],
        );

        return {
            contact_id: result.lastID,
            ...contact,
        };
    },

    /**
     * Update a contact
     * @param {number} id - The contact ID
     * @param {object} contact - The updated contact data
     * @returns {Promise<boolean>} Success status
     */
    async update(id, contact) {
        const db = await getDbConnection();
        const result = await db.run(
            `UPDATE contacts
       SET company_id = ?, first_name = ?, last_name = ?, position = ?,
           email = ?, phone = ?, linkedin_url = ?
       WHERE contact_id = ?`,
            [
                contact.company_id,
                contact.first_name,
                contact.last_name,
                contact.position,
                contact.email,
                contact.phone,
                contact.linkedin_url,
                id,
            ],
        );

        return result.changes > 0;
    },

    /**
     * Delete a contact
     * @param {number} id - The contact ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id) {
        const db = await getDbConnection();
        const result = await db.run(
            "DELETE FROM contacts WHERE contact_id = ?",
            id,
        );
        return result.changes > 0;
    },
};

/**
 * Communications related database operations
 */
export const communicationsDb = {
    /**
     * Get communications by contact ID
     * @param {number} contactId - The contact ID
     * @returns {Promise<Array>} Array of communication objects
     */
    async getByContactId(contactId) {
        const db = await getDbConnection();
        return db.all(
            "SELECT * FROM communications WHERE contact_id = ? ORDER BY date_contacted DESC",
            contactId,
        );
    },

    /**
     * Get a communication by ID
     * @param {number} id - The communication ID
     * @returns {Promise<object>} The communication object
     */
    async getById(id) {
        const db = await getDbConnection();
        return db.get(
            "SELECT * FROM communications WHERE communication_id = ?",
            id,
        );
    },

    /**
     * Create a new communication
     * @param {object} communication - The communication data
     * @returns {Promise<object>} The created communication with ID
     */
    async create(communication) {
        const db = await getDbConnection();
        const result = await db.run(
            `INSERT INTO communications
       (contact_id, date_contacted, contact_method, message_content,
        received_response, response_date, response_content)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                communication.contact_id,
                communication.date_contacted,
                communication.contact_method,
                communication.message_content,
                communication.received_response ? 1 : 0,
                communication.response_date,
                communication.response_content,
            ],
        );

        return {
            communication_id: result.lastID,
            ...communication,
        };
    },

    /**
     * Update a communication
     * @param {number} id - The communication ID
     * @param {object} communication - The updated communication data
     * @returns {Promise<boolean>} Success status
     */
    async update(id, communication) {
        const db = await getDbConnection();
        const result = await db.run(
            `UPDATE communications
       SET contact_id = ?, date_contacted = ?, contact_method = ?, message_content = ?,
           received_response = ?, response_date = ?, response_content = ?
       WHERE communication_id = ?`,
            [
                communication.contact_id,
                communication.date_contacted,
                communication.contact_method,
                communication.message_content,
                communication.received_response ? 1 : 0,
                communication.response_date,
                communication.response_content,
                id,
            ],
        );

        return result.changes > 0;
    },

    /**
     * Delete a communication
     * @param {number} id - The communication ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id) {
        const db = await getDbConnection();
        const result = await db.run(
            "DELETE FROM communications WHERE communication_id = ?",
            id,
        );
        return result.changes > 0;
    },
};

/**
 * Meetings related database operations
 */
export const meetingsDb = {
    /**
     * Get all meetings
     * @returns {Promise<Array>} Array of meeting objects
     */
    async getAll() {
        const db = await getDbConnection();
        return db.all(`
      SELECT m.*, c.first_name, c.last_name, co.company_name
      FROM meetings m
      JOIN contacts c ON m.contact_id = c.contact_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      ORDER BY m.meeting_date DESC
    `);
    },

    /**
     * Get meetings by contact ID
     * @param {number} contactId - The contact ID
     * @returns {Promise<Array>} Array of meeting objects
     */
    async getByContactId(contactId) {
        const db = await getDbConnection();
        return db.all(
            "SELECT * FROM meetings WHERE contact_id = ? ORDER BY meeting_date DESC",
            contactId,
        );
    },

    /**
     * Get a meeting by ID
     * @param {number} id - The meeting ID
     * @returns {Promise<object>} The meeting object
     */
    async getById(id) {
        const db = await getDbConnection();
        return db.get(
            `
      SELECT m.*, c.first_name, c.last_name, co.company_name
      FROM meetings m
      JOIN contacts c ON m.contact_id = c.contact_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      WHERE m.meeting_id = ?
    `,
            id,
        );
    },

    /**
     * Create a new meeting
     * @param {object} meeting - The meeting data
     * @returns {Promise<object>} The created meeting with ID
     */
    async create(meeting) {
        const db = await getDbConnection();
        const result = await db.run(
            `INSERT INTO meetings
       (contact_id, meeting_date, location, meeting_type, meeting_status,
        meeting_notes, follow_up_needed)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                meeting.contact_id,
                meeting.meeting_date,
                meeting.location,
                meeting.meeting_type,
                meeting.meeting_status,
                meeting.meeting_notes,
                meeting.follow_up_needed ? 1 : 0,
            ],
        );

        return {
            meeting_id: result.lastID,
            ...meeting,
        };
    },

    /**
     * Update a meeting
     * @param {number} id - The meeting ID
     * @param {object} meeting - The updated meeting data
     * @returns {Promise<boolean>} Success status
     */
    async update(id, meeting) {
        const db = await getDbConnection();
        const result = await db.run(
            `UPDATE meetings
       SET contact_id = ?, meeting_date = ?, location = ?, meeting_type = ?,
           meeting_status = ?, meeting_notes = ?, follow_up_needed = ?
       WHERE meeting_id = ?`,
            [
                meeting.contact_id,
                meeting.meeting_date,
                meeting.location,
                meeting.meeting_type,
                meeting.meeting_status,
                meeting.meeting_notes,
                meeting.follow_up_needed ? 1 : 0,
                id,
            ],
        );

        return result.changes > 0;
    },

    /**
     * Delete a meeting
     * @param {number} id - The meeting ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id) {
        const db = await getDbConnection();
        const result = await db.run(
            "DELETE FROM meetings WHERE meeting_id = ?",
            id,
        );
        return result.changes > 0;
    },

    /**
     * Get upcoming meetings
     * @param {number} limit - Maximum number of meetings to return
     * @returns {Promise<Array>} Array of upcoming meeting objects
     */
    async getUpcoming(limit = 10) {
        const db = await getDbConnection();
        const now = new Date().toISOString();
        return db.all(
            `
      SELECT m.*, c.first_name, c.last_name, co.company_name
      FROM meetings m
      JOIN contacts c ON m.contact_id = c.contact_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      WHERE m.meeting_date > ? AND m.meeting_status != 'cancelled'
      ORDER BY m.meeting_date ASC
      LIMIT ?
    `,
            [now, limit],
        );
    },
};

/**
 * Dashboard related database operations
 */
export const dashboardDb = {
    /**
     * Get dashboard statistics
     * @returns {Promise<object>} Dashboard statistics
     */
    async getStats() {
        const db = await getDbConnection();

        // Get counts
        const companiesCount = await db.get(
            "SELECT COUNT(*) as count FROM companies",
        );
        const contactsCount = await db.get(
            "SELECT COUNT(*) as count FROM contacts",
        );
        const communicationsCount = await db.get(
            "SELECT COUNT(*) as count FROM communications",
        );
        const meetingsCount = await db.get(
            "SELECT COUNT(*) as count FROM meetings",
        );

        // Get upcoming meetings count
        const now = new Date().toISOString();
        const upcomingMeetingsCount = await db.get(
            `SELECT COUNT(*) as count FROM meetings
       WHERE meeting_date > ? AND meeting_status != 'cancelled'`,
            now,
        );

        // Get pending follow-ups count
        const pendingFollowUpsCount = await db.get(
            "SELECT COUNT(*) as count FROM meetings WHERE follow_up_needed = 1",
        );

        return {
            companiesCount: companiesCount.count,
            contactsCount: contactsCount.count,
            communicationsCount: communicationsCount.count,
            meetingsCount: meetingsCount.count,
            upcomingMeetingsCount: upcomingMeetingsCount.count,
            pendingFollowUpsCount: pendingFollowUpsCount.count,
        };
    },

    /**
   * Get recent activities
   * @param {number} limit - Maximum number of activities to return
  /**
   * Get recent activities
   * @param {number} limit - Maximum number of activities to return
   * @returns {Promise<Array>} Array of recent activities
   */
    async getRecentActivities(limit = 10) {
        const db = await getDbConnection();

        // Get recent communications
        const recentCommunications = await db.all(
            `
      SELECT
        'communication' as type,
        com.communication_id as id,
        com.date_contacted as date,
        c.first_name || ' ' || c.last_name as contact_name,
        c.contact_id,
        co.company_name,
        co.company_id,
        com.contact_method as description
      FROM communications com
      JOIN contacts c ON com.contact_id = c.contact_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      ORDER BY com.date_contacted DESC
      LIMIT ?
    `,
            limit,
        );

        // Get recent meetings
        const recentMeetings = await db.all(
            `
      SELECT
        'meeting' as type,
        m.meeting_id as id,
        m.meeting_date as date,
        c.first_name || ' ' || c.last_name as contact_name,
        c.contact_id,
        co.company_name,
        co.company_id,
        m.meeting_type || ' meeting - ' || m.meeting_status as description
      FROM meetings m
      JOIN contacts c ON m.contact_id = c.contact_id
      LEFT JOIN companies co ON c.company_id = co.company_id
      ORDER BY m.meeting_date DESC
      LIMIT ?
    `,
            limit,
        );

        // Combine and sort by date
        const activities = [...recentCommunications, ...recentMeetings];
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Return limited number of activities
        return activities.slice(0, limit);
    },
};

/**
 * Search functionality across multiple tables
 */
export const searchDb = {
    /**
     * Search across companies and contacts
     * @param {string} query - The search query
     * @returns {Promise<object>} Search results
     */
    async search(query) {
        if (!query || query.trim() === "") {
            return {
                companies: [],
                contacts: [],
            };
        }

        const searchTerm = `%${query.trim()}%`;
        const db = await getDbConnection();

        // Search companies
        const companies = await db.all(
            `
      SELECT * FROM companies
      WHERE company_name LIKE ? OR website LIKE ? OR address LIKE ?
      ORDER BY company_name
      LIMIT 20
    `,
            [searchTerm, searchTerm, searchTerm, searchTerm],
        );

        // Search contacts
        const contacts = await db.all(
            `
      SELECT c.*, co.company_name
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.company_id
      WHERE c.first_name LIKE ? OR c.last_name LIKE ? OR
            c.email LIKE ? OR c.position LIKE ? OR
            c.first_name || ' ' || c.last_name LIKE ?
      ORDER BY c.last_name, c.first_name
      LIMIT 20
    `,
            [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm],
        );

        return {
            companies,
            contacts,
        };
    },
};

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
            path.join(__dirname, "init.sql"),
            "utf8",
        );

        // Execute schema creation
        await db.exec(initSql);
        console.log("Database schema initialized");
    }
}
/**
 * Get companies filtered by communication status
 * @param {string} status - Filter type: 'contacted', 'not-contacted'
 * @returns {Promise<Array>} Array of filtered company objects
 */
export const getFilteredCompanies = async (status) => {
    const db = await getDbConnection();

    if (status === "contacted") {
        // Get companies that have been contacted
        return db.all(`
            SELECT DISTINCT c.*
            FROM companies c
            INNER JOIN contacts ct ON c.company_id = ct.company_id
            INNER JOIN communications com ON ct.contact_id = com.contact_id
            ORDER BY c.company_name
        `);
    } else if (status === "not-contacted") {
        // Get companies that have not been contacted
        return db.all(`
    SELECT DISTINCT c.*
    FROM companies c
    INNER JOIN contacts ct ON c.company_id = ct.company_id
    WHERE ct.contact_id NOT IN (
        SELECT DISTINCT contact_id
        FROM communications
    )
    ORDER BY c.company_name        `);
    } else if (status === "no-contacts") {
        // Get companies that have no contacts
        return db.all(`
                    SELECT c.*
                    FROM companies c
                    WHERE c.company_id NOT IN (
                        SELECT DISTINCT company_id
                        FROM contacts
                    )
                    ORDER BY c.company_name
                `);
    } else {
        // Default to all companies if invalid status
        return companiesDb.getAll();
    }
};

/**
 * Get contacts filtered by communication status or method
 * @param {string} status - Filter type: 'contacted', 'not-contacted', 'called', 'emailed'
 * @returns {Promise<Array>} Array of filtered contact objects
 */
export const getFilteredContacts = async (status) => {
    const db = await getDbConnection();

    switch (status) {
        case "contacted":
            // Get contacts that have been contacted
            return db.all(`
                SELECT DISTINCT c.*, co.company_name
                FROM contacts c
                LEFT JOIN companies co ON c.company_id = co.company_id
                INNER JOIN communications com ON c.contact_id = com.contact_id
                ORDER BY c.last_name, c.first_name
            `);
        case "not-contacted":
            // Get contacts that have not been contacted
            return db.all(`
                SELECT c.*, co.company_name
                FROM contacts c
                LEFT JOIN companies co ON c.company_id = co.company_id
                WHERE c.contact_id NOT IN (
                    SELECT DISTINCT com.contact_id
                    FROM communications com
                )
                ORDER BY c.last_name, c.first_name
            `);
        case "called":
            // Get contacts that have been called
            return db.all(`
                SELECT DISTINCT c.*, co.company_name
                FROM contacts c
                LEFT JOIN companies co ON c.company_id = co.company_id
                INNER JOIN communications com ON c.contact_id = com.contact_id
                WHERE com.contact_method = 'phone' AND com.received_response = 1
                ORDER BY c.last_name, c.first_name
            `);
        case "not-called":
            // Get contacts that have been called
            return db.all(`
          SELECT DISTINCT c.*, co.company_name
            FROM contacts c
            LEFT JOIN companies co ON c.company_id = co.company_id
            WHERE c.contact_id IN (
                SELECT DISTINCT contact_id
                FROM communications
                WHERE contact_method = 'email'
            )
            AND (
                c.contact_id NOT IN (
                    SELECT DISTINCT contact_id
                    FROM communications
                    WHERE contact_method = 'phone'
                )
                OR
                c.contact_id IN (
                    SELECT DISTINCT contact_id
                    FROM communications
                    WHERE contact_method = 'phone' AND received_response = 0
                    AND contact_id NOT IN (
                        SELECT DISTINCT contact_id
                        FROM communications
                        WHERE contact_method = 'phone' AND received_response = 1
                    )
                )
            )
            ORDER BY c.last_name, c.first_name
            `);
        case "emailed":
            // Get contacts that have been emailed
            return db.all(`
                SELECT DISTINCT c.*, co.company_name
                FROM contacts c
                LEFT JOIN companies co ON c.company_id = co.company_id
                INNER JOIN communications com ON c.contact_id = com.contact_id
                WHERE com.contact_method = 'email'
                ORDER BY c.last_name, c.first_name
            `);
        case "no-meetings":
            // Get contacts with no upcoming meetings
            const now = new Date().toISOString();
            return db.all(
                `
                SELECT c.*, co.company_name
                FROM contacts c
                LEFT JOIN companies co ON c.company_id = co.company_id
                WHERE c.contact_id NOT IN (
                    SELECT DISTINCT m.contact_id
                    FROM meetings m
                    WHERE m.meeting_date > ? AND m.meeting_status = 'scheduled'
                )
                ORDER BY c.last_name, c.first_name
            `,
                now,
            );
        default:
            // Default to all contacts if invalid status
            return contactsDb.getAll();
    }
};

/**
 * User related database operations
 */
export const usersDb = {
    /**
     * Get all users
     * @returns {Promise<Array>} Array of user objects
     */
    async getAll() {
        const db = await getDbConnection();
        return db.all("SELECT * FROM users ORDER BY username");
    },

    /**
     * Get a user by ID
     * @param {number} id - The user ID
     * @returns {Promise<object>} The user object
     */
    async getById(id) {
        const db = await getDbConnection();
        return db.get("SELECT * FROM users WHERE user_id = ?", id);
    },

    /**
     * Get a user by username
     * @param {string} username - The username
     * @returns {Promise<object>} The user object
     */
    async getByUsername(username) {
        const db = await getDbConnection();
        return db.get("SELECT * FROM users WHERE username = ?", username);
    },

    /**
     * Create a new user
     * @param {object} user - The user data
     * @returns {Promise<object>} The created user with ID
     */
    async create(user) {
        const db = await getDbConnection();
        const result = await db.run("INSERT INTO users (username) VALUES (?)", [
            user.username,
        ]);

        return {
            user_id: result.lastID,
            ...user,
        };
    },

    /**
     * Update a user's last login time
     * @param {number} id - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async updateLastLogin(id) {
        const db = await getDbConnection();
        const result = await db.run(
            "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?",
            [id],
        );

        return result.changes > 0;
    },

    /**
     * Delete a user
     * @param {number} id - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id) {
        const db = await getDbConnection();
        const result = await db.run("DELETE FROM users WHERE user_id = ?", id);
        return result.changes > 0;
    },
};

/**
 * User permissions related database operations
 */
export const userPermissionsDb = {
    /**
     * Share a company with a user
     * @param {number} companyId - The company ID
     * @param {number} userId - The user ID
     * @param {boolean} isOwner - Whether the user is the owner
     * @returns {Promise<boolean>} Success status
     */
    async shareCompany(companyId, userId, isOwner = false) {
        const db = await getDbConnection();
        try {
            await db.run(
                "INSERT INTO user_companies (company_id, user_id, is_owner) VALUES (?, ?, ?)",
                [companyId, userId, isOwner ? 1 : 0],
            );
            return true;
        } catch (error) {
            console.error("Error sharing company:", error);
            return false;
        }
    },

    /**
     * Share a contact with a user
     * @param {number} contactId - The contact ID
     * @param {number} userId - The user ID
     * @param {boolean} isOwner - Whether the user is the owner
     * @returns {Promise<boolean>} Success status
     */
    async shareContact(contactId, userId, isOwner = false) {
        const db = await getDbConnection();
        try {
            await db.run(
                "INSERT INTO user_contacts (contact_id, user_id, is_owner) VALUES (?, ?, ?)",
                [contactId, userId, isOwner ? 1 : 0],
            );
            return true;
        } catch (error) {
            console.error("Error sharing contact:", error);
            return false;
        }
    },

    /**
     * Share a meeting with a user
     * @param {number} meetingId - The meeting ID
     * @param {number} userId - The user ID
     * @param {boolean} isOwner - Whether the user is the owner
     * @returns {Promise<boolean>} Success status
     */
    async shareMeeting(meetingId, userId, isOwner = false) {
        const db = await getDbConnection();
        try {
            await db.run(
                "INSERT INTO user_meetings (meeting_id, user_id, is_owner) VALUES (?, ?, ?)",
                [meetingId, userId, isOwner ? 1 : 0],
            );
            return true;
        } catch (error) {
            console.error("Error sharing meeting:", error);
            return false;
        }
    },

    /**
     * Share a communication with a user
     * @param {number} communicationId - The communication ID
     * @param {number} userId - The user ID
     * @param {boolean} isOwner - Whether the user is the owner
     * @returns {Promise<boolean>} Success status
     */
    async shareCommunication(communicationId, userId, isOwner = false) {
        const db = await getDbConnection();
        try {
            await db.run(
                "INSERT INTO user_communications (communication_id, user_id, is_owner) VALUES (?, ?, ?)",
                [communicationId, userId, isOwner ? 1 : 0],
            );
            return true;
        } catch (error) {
            console.error("Error sharing communication:", error);
            return false;
        }
    },

    /**
     * Remove company sharing for a user
     * @param {number} companyId - The company ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async unshareCompany(companyId, userId) {
        const db = await getDbConnection();
        const result = await db.run(
            "DELETE FROM user_companies WHERE company_id = ? AND user_id = ? AND is_owner = 0",
            [companyId, userId],
        );
        return result.changes > 0;
    },

    /**
     * Remove contact sharing for a user
     * @param {number} contactId - The contact ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async unshareContact(contactId, userId) {
        const db = await getDbConnection();
        const result = await db.run(
            "DELETE FROM user_contacts WHERE contact_id = ? AND user_id = ? AND is_owner = 0",
            [contactId, userId],
        );
        return result.changes > 0;
    },

    /**
     * Remove meeting sharing for a user
     * @param {number} meetingId - The meeting ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async unshareMeeting(meetingId, userId) {
        const db = await getDbConnection();
        const result = await db.run(
            "DELETE FROM user_meetings WHERE meeting_id = ? AND user_id = ? AND is_owner = 0",
            [meetingId, userId],
        );
        return result.changes > 0;
    },

    /**
     * Remove communication sharing for a user
     * @param {number} communicationId - The communication ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async unshareCommunication(communicationId, userId) {
        const db = await getDbConnection();
        const result = await db.run(
            "DELETE FROM user_communications WHERE communication_id = ? AND user_id = ? AND is_owner = 0",
            [communicationId, userId],
        );
        return result.changes > 0;
    },

    /**
     * Get companies accessible by a user
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of company objects
     */
    async getUserCompanies(userId) {
        const db = await getDbConnection();
        return db.all(
            `
        SELECT c.*, uc.is_owner
        FROM companies c
        JOIN user_companies uc ON c.company_id = uc.company_id
        WHERE uc.user_id = ?
        ORDER BY c.company_name
      `,
            userId,
        );
    },

    /**
     * Get contacts accessible by a user
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of contact objects
     */
    async getUserContacts(userId) {
        const db = await getDbConnection();
        return db.all(
            `
        SELECT c.*, co.company_name, uc.is_owner
        FROM contacts c
        LEFT JOIN companies co ON c.company_id = co.company_id
        JOIN user_contacts uc ON c.contact_id = uc.contact_id
        WHERE uc.user_id = ?
        ORDER BY c.last_name, c.first_name
      `,
            userId,
        );
    },

    /**
     * Get meetings accessible by a user
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of meeting objects
     */
    async getUserMeetings(userId) {
        const db = await getDbConnection();
        return db.all(
            `
        SELECT m.*, c.first_name, c.last_name, co.company_name, um.is_owner
        FROM meetings m
        JOIN contacts c ON m.contact_id = c.contact_id
        LEFT JOIN companies co ON c.company_id = co.company_id
        JOIN user_meetings um ON m.meeting_id = um.meeting_id
        WHERE um.user_id = ?
        ORDER BY m.meeting_date DESC
      `,
            userId,
        );
    },

    /**
     * Get communications accessible by a user
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of communication objects
     */
    async getUserCommunications(userId) {
        const db = await getDbConnection();
        return db.all(
            `
        SELECT com.*, uc.is_owner
        FROM communications com
        JOIN user_communications uc ON com.communication_id = uc.communication_id
        WHERE uc.user_id = ?
        ORDER BY com.date_contacted DESC
      `,
            userId,
        );
    },

    /**
     * Check if user has access to a company
     * @param {number} userId - The user ID
     * @param {number} companyId - The company ID
     * @returns {Promise<boolean>} Whether the user has access
     */
    async canAccessCompany(userId, companyId) {
        const db = await getDbConnection();
        const result = await db.get(
            "SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?",
            [userId, companyId],
        );
        return result ? true : false;
    },

    /**
     * Check if user has access to a contact
     * @param {number} userId - The user ID
     * @param {number} contactId - The contact ID
     * @returns {Promise<boolean>} Whether the user has access
     */
    async canAccessContact(userId, contactId) {
        const db = await getDbConnection();
        const result = await db.get(
            "SELECT 1 FROM user_contacts WHERE user_id = ? AND contact_id = ?",
            [userId, contactId],
        );
        return result ? true : false;
    },

    /**
     * Check if user has access to a meeting
     * @param {number} userId - The user ID
     * @param {number} meetingId - The meeting ID
     * @returns {Promise<boolean>} Whether the user has access
     */
    async canAccessMeeting(userId, meetingId) {
        const db = await getDbConnection();
        const result = await db.get(
            "SELECT 1 FROM user_meetings WHERE user_id = ? AND meeting_id = ?",
            [userId, meetingId],
        );
        return result ? true : false;
    },

    /**
     * Check if user has access to a communication
     * @param {number} userId - The user ID
     * @param {number} communicationId - The communication ID
     * @returns {Promise<boolean>} Whether the user has access
     */
    async canAccessCommunication(userId, communicationId) {
        const db = await getDbConnection();
        const result = await db.get(
            "SELECT 1 FROM user_communications WHERE user_id = ? AND communication_id = ?",
            [userId, communicationId],
        );
        return result ? true : false;
    },

    /**
     * Get users who have access to a company
     * @param {number} companyId - The company ID
     * @returns {Promise<Array>} Array of user objects
     */
    async getCompanyUsers(companyId) {
        const db = await getDbConnection();
        return db.all(
            `
        SELECT u.*, uc.is_owner
        FROM users u
        JOIN user_companies uc ON u.user_id = uc.user_id
        WHERE uc.company_id = ?
        ORDER BY u.username
      `,
            companyId,
        );
    },

    /**
     * Get users who have access to a contact
     * @param {number} contactId - The contact ID
     * @returns {Promise<Array>} Array of user objects
     */
    async getContactUsers(contactId) {
        const db = await getDbConnection();
        return db.all(
            `
        SELECT u.*, uc.is_owner
        FROM users u
        JOIN user_contacts uc ON u.user_id = uc.user_id
        WHERE uc.contact_id = ?
        ORDER BY u.username
      `,
            contactId,
        );
    },

    /**
     * Get users who have access to a meeting
     * @param {number} meetingId - The meeting ID
     * @returns {Promise<Array>} Array of user objects
     */
    async getMeetingUsers(meetingId) {
        const db = await getDbConnection();
        return db.all(
            `
        SELECT u.*, um.is_owner
        FROM users u
        JOIN user_meetings um ON u.user_id = um.user_id
        WHERE um.meeting_id = ?
        ORDER BY u.username
      `,
            meetingId,
        );
    },
};

// Modify existing database operations to respect user permissions
// For example, update the companiesDb.getAll method:

export const updateCompaniesDbForUsers = (companiesDb) => {
    const originalGetAll = companiesDb.getAll;

    companiesDb.getAll = async function (userId) {
        if (!userId) {
            return originalGetAll.call(this);
        }

        const db = await getDbConnection();
        return db.all(
            `
        SELECT c.*
        FROM companies c
        JOIN user_companies uc ON c.company_id = uc.company_id
        WHERE uc.user_id = ?
        ORDER BY c.company_name
      `,
            userId,
        );
    };

    const originalCreate = companiesDb.create;

    companiesDb.create = async function (company, userId) {
        const result = await originalCreate.call(this, company);

        if (userId) {
            await userPermissionsDb.shareCompany(
                result.company_id,
                userId,
                true,
            );
        }

        return result;
    };
};

export const updateContactsDbForUsers = (contactsDb) => {
    const originalGetAll = contactsDb.getAll;

    contactsDb.getAll = async function (userId) {
        if (!userId) {
            return originalGetAll.call(this);
        }

        const db = await getDbConnection();
        return db.all(
            `
        SELECT c.*, co.company_name
        FROM contacts c
        LEFT JOIN companies co ON c.company_id = co.company_id
        JOIN user_contacts uc ON c.contact_id = uc.contact_id
        WHERE uc.user_id = ?
        ORDER BY c.last_name, c.first_name
      `,
            userId,
        );
    };

    const originalCreate = contactsDb.create;

    contactsDb.create = async function (contact, userId) {
        const result = await originalCreate.call(this, contact);

        if (userId) {
            await userPermissionsDb.shareContact(
                result.contact_id,
                userId,
                true,
            );

            // If this contact belongs to a company, make sure the user has access to that company
            if (contact.company_id) {
                const canAccess = await userPermissionsDb.canAccessCompany(
                    userId,
                    contact.company_id,
                );
                if (!canAccess) {
                    await userPermissionsDb.shareCompany(
                        contact.company_id,
                        userId,
                        false,
                    );
                }
            }
        }

        return result;
    };
};

export const updateMeetingsDbForUsers = (meetingsDb) => {
    const originalGetAll = meetingsDb.getAll;

    meetingsDb.getAll = async function (userId) {
        if (!userId) {
            return originalGetAll.call(this);
        }

        const db = await getDbConnection();
        return db.all(
            `
        SELECT m.*, c.first_name, c.last_name, co.company_name
        FROM meetings m
        JOIN contacts c ON m.contact_id = c.contact_id
        LEFT JOIN companies co ON c.company_id = co.company_id
        JOIN user_meetings um ON m.meeting_id = um.meeting_id
        WHERE um.user_id = ?
        ORDER BY m.meeting_date DESC
      `,
            userId,
        );
    };

    const originalCreate = meetingsDb.create;

    meetingsDb.create = async function (meeting, userId) {
        const result = await originalCreate.call(this, meeting);

        if (userId) {
            await userPermissionsDb.shareMeeting(
                result.meeting_id,
                userId,
                true,
            );

            // Make sure the user has access to the contact involved in this meeting
            const canAccess = await userPermissionsDb.canAccessContact(
                userId,
                meeting.contact_id,
            );
            if (!canAccess) {
                await userPermissionsDb.shareContact(
                    meeting.contact_id,
                    userId,
                    false,
                );
            }
        }

        return result;
    };
};

export const updateCommunicationsDbForUsers = (communicationsDb) => {
    const originalGetByContactId = communicationsDb.getByContactId;

    communicationsDb.getByContactId = async function (contactId, userId) {
        if (!userId) {
            return originalGetByContactId.call(this, contactId);
        }

        const db = await getDbConnection();
        return db.all(
            `
        SELECT c.*
        FROM communications c
        JOIN user_communications uc ON c.communication_id = uc.communication_id
        WHERE c.contact_id = ? AND uc.user_id = ?
        ORDER BY c.date_contacted DESC
      `,
            [contactId, userId],
        );
    };

    const originalCreate = communicationsDb.create;

    communicationsDb.create = async function (communication, userId) {
        const result = await originalCreate.call(this, communication);

        if (userId) {
            await userPermissionsDb.shareCommunication(
                result.communication_id,
                userId,
                true,
            );

            // Make sure the user has access to the contact involved in this communication
            const canAccess = await userPermissionsDb.canAccessContact(
                userId,
                communication.contact_id,
            );
            if (!canAccess) {
                await userPermissionsDb.shareContact(
                    communication.contact_id,
                    userId,
                    false,
                );
            }
        }

        return result;
    };
};

export default {
    companiesDb,
    contactsDb,
    communicationsDb,
    meetingsDb,
    dashboardDb,
    searchDb,
    getFilteredCompanies,
    getFilteredContacts,
    initializeDatabase,
};
