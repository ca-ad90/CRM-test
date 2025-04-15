import { getDbConnection } from "./connection.js";

/**
 * Communications related database operations
 */
export const communicationsDb = {
    /**
     * Get communications by contact ID (for a specific user)
     * @param {number} contactId - The contact ID
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of communication objects
     */
    async getByContactId(contactId, userId) {
        const db = await getDbConnection();
        return db.all(
            `SELECT c.*
             FROM communications c
             JOIN user_communications uc ON c.communication_id = uc.communication_id
             WHERE c.contact_id = ? AND uc.user_id = ?
             ORDER BY c.date_contacted DESC`,
            [contactId, userId]
        );
    },

    /**
     * Get a communication by ID (for a specific user)
     * @param {number} id - The communication ID
     * @param {number} userId - The user ID
     * @returns {Promise<object>} The communication object
     */
    async getById(id, userId) {
        const db = await getDbConnection();
        return db.get(
            `SELECT c.*
             FROM communications c
             JOIN user_communications uc ON c.communication_id = uc.communication_id
             WHERE c.communication_id = ? AND uc.user_id = ?`,
            [id, userId]
        );
    },

    /**
     * Create a new communication
     * @param {object} communication - The communication data
     * @param {number} userId - The user ID
     * @returns {Promise<object>} The created communication with ID
     */
    async create(communication, userId) {
        const db = await getDbConnection();

        // Begin transaction
        await db.run('BEGIN TRANSACTION');

        try {
            // Insert into communications table
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
                ]
            );

            const communicationId = result.lastID;

            // Associate communication with user
            await db.run(
                "INSERT INTO user_communications (user_id, communication_id, is_owner) VALUES (?, ?, 1)",
                [userId, communicationId]
            );

            // Commit transaction
            await db.run('COMMIT');

            return {
                communication_id: communicationId,
                ...communication,
            };
        } catch (error) {
            // Rollback transaction in case of error
            await db.run('ROLLBACK');
            throw error;
        }
    },

    /**
     * Update a communication
     * @param {number} id - The communication ID
     * @param {object} communication - The updated communication data
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async update(id, communication, userId) {
        const db = await getDbConnection();

        // Check if user has access to this communication
        const hasAccess = await this.checkUserAccess(id, userId);
        if (!hasAccess) {
            return false;
        }

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
            ]
        );

        return result.changes > 0;
    },

    /**
     * Delete a communication
     * @param {number} id - The communication ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id, userId) {
        const db = await getDbConnection();

        // Check if user has access to this communication
        const hasAccess = await this.checkUserAccess(id, userId);
        if (!hasAccess) {
            return false;
        }

        // Begin transaction
        await db.run('BEGIN TRANSACTION');

        try {
            // Remove user-communication association
            await db.run(
                "DELETE FROM user_communications WHERE communication_id = ? AND user_id = ?",
                [id, userId]
            );

            // Check if other users have access to this communication
            const otherUsersHaveAccess = await db.get(
                "SELECT 1 FROM user_communications WHERE communication_id = ? LIMIT 1",
                id
            );

            // If no other users have access, delete the communication
            if (!otherUsersHaveAccess) {
                await db.run(
                    "DELETE FROM communications WHERE communication_id = ?",
                    id
                );
            }

            // Commit transaction
            await db.run('COMMIT');
            return true;
        } catch (error) {
            // Rollback transaction in case of error
            await db.run('ROLLBACK');
            throw error;
        }
    },

    /**
     * Check if user has access to a communication
     * @param {number} communicationId - The communication ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Whether user has access
     */
    async checkUserAccess(communicationId, userId) {
        const db = await getDbConnection();
        const result = await db.get(
            "SELECT 1 FROM user_communications WHERE communication_id = ? AND user_id = ?",
            [communicationId, userId]
        );
        return !!result;
    }
};
