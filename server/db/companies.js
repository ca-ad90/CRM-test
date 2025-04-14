import { getDbConnection } from "./db.js";

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
            "INSERT INTO companies (company_name,  website, address,phone,email) VALUES (?, ?, ?, ?,?,?)",
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
