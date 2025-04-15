import { getDbConnection } from "./connection.js";

/**
 * Meetings related database operations
 */
export const meetingsDb = {
    /**
     * Get all meetings for a specific user
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of meeting objects
     */
    async getAll(userId) {
        const db = await getDbConnection();
        return db.all(`
            SELECT m.*, c.first_name, c.last_name, co.company_name
            FROM meetings m
            JOIN user_meetings um ON m.meeting_id = um.meeting_id
            JOIN contacts c ON m.contact_id = c.contact_id
            LEFT JOIN companies co ON c.company_id = co.company_id
            WHERE um.user_id = ?
            ORDER BY m.meeting_date DESC
        `, userId);
    },

    /**
     * Get meetings by contact ID (for a specific user)
     * @param {number} contactId - The contact ID
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of meeting objects
     */
    async getByContactId(contactId, userId) {
        const db = await getDbConnection();
        return db.all(
            `SELECT m.*
             FROM meetings m
             JOIN user_meetings um ON m.meeting_id = um.meeting_id
             WHERE m.contact_id = ? AND um.user_id = ?
             ORDER BY m.meeting_date DESC`,
            [contactId, userId]
        );
    },

    /**
     * Get a meeting by ID (for a specific user)
     * @param {number} id - The meeting ID
     * @param {number} userId - The user ID
     * @returns {Promise<object>} The meeting object
     */
    async getById(id, userId) {
        const db = await getDbConnection();
        return db.get(
            `SELECT m.*, c.first_name, c.last_name, co.company_name
             FROM meetings m
             JOIN user_meetings um ON m.meeting_id = um.meeting_id
             JOIN contacts c ON m.contact_id = c.contact_id
             LEFT JOIN companies co ON c.company_id = co.company_id
             WHERE m.meeting_id = ? AND um.user_id = ?`,
            [id, userId]
        );
    },

    /**
     * Create a new meeting
     * @param {object} meeting - The meeting data
     * @param {number} userId - The user ID
     * @returns {Promise<object>} The created meeting with ID
     */
    async create(meeting, userId) {
        const db = await getDbConnection();

        // Begin transaction
        await db.run('BEGIN TRANSACTION');

        try {
            // Insert into meetings table
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
                ]
            );

            const meetingId = result.lastID;

            // Associate meeting with user
            await db.run(
                "INSERT INTO user_meetings (user_id, meeting_id, is_owner) VALUES (?, ?, 1)",
                [userId, meetingId]
            );

            // Commit transaction
            await db.run('COMMIT');

            return {
                meeting_id: meetingId,
                ...meeting,
            };
        } catch (error) {
            // Rollback transaction in case of error
            await db.run('ROLLBACK');
            throw error;
        }
    },

    /**
     * Update a meeting
     * @param {number} id - The meeting ID
     * @param {object} meeting - The updated meeting data
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async update(id, meeting, userId) {
        const db = await getDbConnection();

        // Check if user has access to this meeting
        const hasAccess = await this.checkUserAccess(id, userId);
        if (!hasAccess) {
            return false;
        }

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
            ]
        );

        return result.changes > 0;
    },

    /**
     * Delete a meeting
     * @param {number} id - The meeting ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id, userId) {
        const db = await getDbConnection();

        // Check if user has access to this meeting
        const hasAccess = await this.checkUserAccess(id, userId);
        if (!hasAccess) {
            return false;
        }

        // Begin transaction
        await db.run('BEGIN TRANSACTION');

        try {
            // Remove user-meeting association
            await db.run(
                "DELETE FROM user_meetings WHERE meeting_id = ? AND user_id = ?",
                [id, userId]
            );

            // Check if other users have access to this meeting
            const otherUsersHaveAccess = await db.get(
                "SELECT 1 FROM user_meetings WHERE meeting_id = ? LIMIT 1",
                id
            );

            // If no other users have access, delete the meeting
            if (!otherUsersHaveAccess) {
                await db.run(
                    "DELETE FROM meetings WHERE meeting_id = ?",
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
     * Get upcoming meetings (for a specific user)
     * @param {number} limit - Maximum number of meetings to return
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of upcoming meeting objects
     */
    async getUpcoming(limit = 10, userId) {
        const db = await getDbConnection();
        const now = new Date().toISOString();
        return db.all(
            `SELECT m.*, c.first_name, c.last_name, co.company_name
             FROM meetings m
             JOIN user_meetings um ON m.meeting_id = um.meeting_id
             JOIN contacts c ON m.contact_id = c.contact_id
             LEFT JOIN companies co ON c.company_id = co.company_id
             WHERE m.meeting_date > ?
             AND m.meeting_status != 'cancelled'
             AND um.user_id = ?
             ORDER BY m.meeting_date ASC
             LIMIT ?`,
            [now, userId, limit]
        );
    },

    /**
     * Check if user has access to a meeting
     * @param {number} meetingId - The meeting ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Whether user has access
     */
    async checkUserAccess(meetingId, userId) {
        const db = await getDbConnection();
        const result = await db.get(
            "SELECT 1 FROM user_meetings WHERE meeting_id = ? AND user_id = ?",
            [meetingId, userId]
        );
        return !!result;
    }
};
