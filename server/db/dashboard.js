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
