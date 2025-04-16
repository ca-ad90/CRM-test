import { getDbConnection } from "./connection.js";

/**
 * Search functionality across multiple tables
 */
export const searchDb = {
    /**
     * Search across companies and contacts for a specific user
     * @param {string} query - The search query
     * @param {number} userId - The user ID
     * @returns {Promise<object>} Search results
     */
    async search(query, userId) {
        if (!query || query.trim() === "") {
            return {
                companies: [],
                contacts: [],
            };
        }

        const searchTerm = `%${query.trim()}%`;
        const db = await getDbConnection();

        // Search companies (that user has access to)
        const companies = await db.all(
            `
            SELECT c.*
            FROM companies c
            JOIN user_companies uc ON c.company_id = uc.company_id
            WHERE uc.user_id = ?
            AND (c.company_name LIKE ? OR c.website LIKE ? OR c.address LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)
            ORDER BY c.company_name
            LIMIT 20
            `,
            [userId, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
        );

        // Search contacts (that user has access to)
        const contacts = await db.all(
            `
            SELECT c.*, co.company_name
            FROM contacts c
            JOIN user_contacts uc ON c.contact_id = uc.contact_id
            LEFT JOIN companies co ON c.company_id = co.company_id
            WHERE uc.user_id = ?
            AND (c.first_name LIKE ? OR c.last_name LIKE ? OR
                 c.email LIKE ? OR c.position LIKE ? OR
                 c.first_name || ' ' || c.last_name LIKE ?)
            ORDER BY c.last_name, c.first_name
            LIMIT 20
            `,
            [userId, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
        );

        return {
            companies,
            contacts,
        };
    },
};
