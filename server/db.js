import sqlite3 from "sqlite3";
import { open } from "sqlite";
import * as fs from 'node:fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
// Database connection singleton
let db = null;

/**
 * Initialize the database connection
 * @returns {Promise<object>} The database connection object
 */
async function getDbConnection() {
    if (db) {
        return db;
    }

    // Open the database connection
    db = await open({
        filename: "./server/database.sqlite",
        driver: sqlite3.Database,
    });

    console.log("Database connection established");
    return db;
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
        let data  = await db.all("SELECT * FROM companies ORDER BY company_name")
        return data
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
            "INSERT INTO companies (company_name, industry, website, address,phone,email) VALUES (?, ?, ?, ?,?,?)",
            [
                company.company_name,
                company.industry,
                company.website,
                company.address,
                company.phone,
                company.email
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
            "UPDATE companies SET company_name = ?, industry = ?, website = ?, address = ?, phone=?,email=? WHERE company_id = ?",
            [
                company.company_name,
                company.industry,
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
      WHERE company_name LIKE ? OR industry LIKE ? OR website LIKE ? OR address LIKE ?
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

export default {
    companiesDb,
    contactsDb,
    communicationsDb,
    meetingsDb,
    dashboardDb,
    searchDb,
    initializeDatabase,
};
