import { getDbConnection } from "./connection.js";

/**
 * Dashboard related database operations
 */
export const dashboardDb = {
    /**
     * Get dashboard statistics for a specific user
     * @param {number} userId - The user ID
     * @returns {Promise<object>} Dashboard statistics
     */
    async getStats(userId) {
        const db = await getDbConnection();

        // Get counts for user's data
        const companiesCount = await db.get(
            `SELECT COUNT(*) as count
             FROM companies c
             JOIN user_companies uc ON c.company_id = uc.company_id
             WHERE uc.user_id = ?`,
            userId
        );

        const contactsCount = await db.get(
            `SELECT COUNT(*) as count
             FROM contacts c
             JOIN user_contacts uc ON c.contact_id = uc.contact_id
             WHERE uc.user_id = ?`,
            userId
        );

        const communicationsCount = await db.get(
            `SELECT COUNT(*) as count
             FROM communications c
             JOIN user_communications uc ON c.communication_id = uc.communication_id
             WHERE uc.user_id = ?`,
            userId
        );

        const meetingsCount = await db.get(
            `SELECT COUNT(*) as count
             FROM meetings m
             JOIN user_meetings um ON m.meeting_id = um.meeting_id
             WHERE um.user_id = ?`,
            userId
        );

        // Get upcoming meetings count
        const now = new Date().toISOString();
        const upcomingMeetingsCount = await db.get(
            `SELECT COUNT(*) as count
             FROM meetings m
             JOIN user_meetings um ON m.meeting_id = um.meeting_id
             WHERE m.meeting_date > ?
             AND m.meeting_status != 'cancelled'
             AND um.user_id = ?`,
            [now, userId]
        );

        // Get pending follow-ups count
        const pendingFollowUpsCount = await db.get(
            `SELECT COUNT(*) as count
             FROM meetings m
             JOIN user_meetings um ON m.meeting_id = um.meeting_id
             WHERE m.follow_up_needed = 1
             AND um.user_id = ?`,
            userId
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
    * Get recent activities for a specific user
    * @param {number} limit - Maximum number of activities to return
    * @param {number} userId - The user ID
    * @returns {Promise<Array>} Array of recent activities
    */
    async getRecentActivities(limit = 10, userId) {
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
            JOIN user_communications uc ON com.communication_id = uc.communication_id
            JOIN contacts c ON com.contact_id = c.contact_id
            LEFT JOIN companies co ON c.company_id = co.company_id
            WHERE uc.user_id = ?
            ORDER BY com.date_contacted DESC
            LIMIT ?
            `,
            [userId, limit]
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
            JOIN user_meetings um ON m.meeting_id = um.meeting_id
            JOIN contacts c ON m.contact_id = c.contact_id
            LEFT JOIN companies co ON c.company_id = co.company_id
            WHERE um.user_id = ?
            ORDER BY m.meeting_date DESC
            LIMIT ?
            `,
            [userId, limit]
        );

        // Combine and sort by date
        const activities = [...recentCommunications, ...recentMeetings];
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Return limited number of activities
        return activities.slice(0, limit);
    },
};
