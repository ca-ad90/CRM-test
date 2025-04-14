// db/contacts.js - Contact-related database operations

import { getDbConnection } from './connection.js';

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
 * Get contacts filtered by communication status or method
 * @param {string} status - Filter type: 'contacted', 'not-contacted', 'called', 'emailed'
 * @returns {Promise<Array>} Array of filtered contact objects
 */
export const getFilteredContacts = async (status) => {
    const db = await getDbConnection();

    if (status === 'contacted') {
        // Get contacts that have been contacted
        return db.all(`
            SELECT DISTINCT c.*, co.company_name
            FROM contacts c
            LEFT JOIN companies co ON c.company_id = co.company_id
            INNER JOIN communications com ON c.contact_id = com.contact_id
            ORDER BY c.last_name, c.first_name
        `);
    } else if (status === 'not-contacted') {
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
    } else if (status === 'called') {
        // Get contacts that have been called
        return db.all(`
            SELECT DISTINCT c.*, co.company_name
            FROM contacts c
            LEFT JOIN companies co ON c.company_id = co.company_id
            INNER JOIN communications com ON c.contact_id = com.contact_id
            WHERE com.contact_method = 'phone' AND com.received_response = 1
            ORDER BY c.last_name, c.first_name
        `);
    } else if (status === 'not-called') {
        // Get contacts that have been emailed but not called or called without response
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
    } else if (status === 'emailed') {
        // Get contacts that have been emailed
        return db.all(`
            SELECT DISTINCT c.*, co.company_name
            FROM contacts c
            LEFT JOIN companies co ON c.company_id = co.company_id
            INNER JOIN communications com ON c.contact_id = com.contact_id
            WHERE com.contact_method = 'email'
            ORDER BY c.last_name, c.first_name
        `);
    } else {
        // Default to all contacts if invalid status
        return contactsDb.getAll();
    }
};
