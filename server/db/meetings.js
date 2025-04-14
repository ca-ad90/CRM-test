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
