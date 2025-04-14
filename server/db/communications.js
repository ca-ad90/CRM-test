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
