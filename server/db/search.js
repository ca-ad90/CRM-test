// db/search.js - Search functionality across multiple tables

import { getDbConnection } from './connection.js';

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
            [searchTerm, searchTerm, searchTerm],
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
