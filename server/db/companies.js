// db/companies.js - Company-related database operations

import { getDbConnection } from './connection.js';

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
        return db.all("SELECT * FROM companies ORDER BY company_name");
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
            "INSERT INTO companies (company_name, website, address, phone, email) VALUES (?, ?, ?, ?, ?)",
            [
                company.company_name,
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
            "UPDATE companies SET company_name = ?, website = ?, address = ?, phone = ?, email = ? WHERE company_id = ?",
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
 * Get companies filtered by communication status
 * @param {string} status - Filter type: 'contacted', 'not-contacted', 'no-contacts'
 * @returns {Promise<Array>} Array of filtered company objects
 */
export const getFilteredCompanies = async (status) => {
    const db = await getDbConnection();

    if (status === 'contacted') {
        // Get companies that have been contacted
        return db.all(`
            SELECT DISTINCT c.*
            FROM companies c
            INNER JOIN contacts ct ON c.company_id = ct.company_id
            INNER JOIN communications com ON ct.contact_id = com.contact_id
            ORDER BY c.company_name
        `);
    } else if (status === 'not-contacted') {
        // Get companies that have not been contacted
        return db.all(`
            SELECT DISTINCT c.*
            FROM companies c
            INNER JOIN contacts ct ON c.company_id = ct.company_id
            WHERE ct.contact_id NOT IN (
                SELECT DISTINCT contact_id
                FROM communications
            )
            ORDER BY c.company_name
        `);
    } else if (status === 'no-contacts') {
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
