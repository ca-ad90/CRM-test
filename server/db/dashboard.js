import { getDbConnection, isUserAdmin } from "./connection.js";

/**
 * Dashboard related database operations
 */
export const dashboardDb = {
    /**
     * Get dashboard statistics for a specific user (or system-wide for admin)
     * @param {number} userId - The user ID
     * @returns {Promise<object>} Dashboard statistics
     */
    async getStats(userId) {
        const db = await getDbConnection();
        
        // Check if user is admin
        const isAdmin = await isUserAdmin(userId);
        
        if (isAdmin) {
            // For admin, get system-wide statistics
            const companiesCount = await db.get("SELECT COUNT(*) as count FROM companies");
            const contactsCount = await db.get("SELECT COUNT(*) as count FROM contacts");
            const communicationsCount = await db.get("SELECT COUNT(*) as count FROM communications");
            const meetingsCount = await db.get("SELECT COUNT(*) as count FROM meetings");
            
            // Get active users count
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const activeUsersCount = await db.get(
                "SELECT COUNT(*) as count FROM users WHERE last_login > ?",
                [thirtyDaysAgo]
            );
            
            // Get upcoming meetings count
            const upcomingMeetingsCount = await db.get(
                `SELECT COUNT(*) as count
                 FROM meetings
                 WHERE meeting_date > datetime('now')
                 AND meeting_status != 'cancelled'`
            );
            
            // Get pending follow-ups count
            const pendingFollowUpsCount = await db.get(
                `SELECT COUNT(*) as count
                 FROM meetings
                 WHERE follow_up_needed = 1`
            );
            
            // Get recent communications count
            const recentCommunicationsCount = await db.get(
                `SELECT COUNT(*) as count
                 FROM communications
                 WHERE date_contacted > datetime('now', '-7 days')`
            );
            
            return {
                companiesCount: companiesCount.count,
                contactsCount: contactsCount.count,
                communicationsCount: communicationsCount.count,
                meetingsCount: meetingsCount.count,
                activeUsersCount: activeUsersCount.count,
                upcomingMeetingsCount: upcomingMeetingsCount.count,
                pendingFollowUpsCount: pendingFollowUpsCount.count,
                recentCommunicationsCount: recentCommunicationsCount.count,
                isAdmin: true
            };
        }
        
        // For regular user, get user-specific statistics
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
        
        // Get recent communications count
        const sevenDaysAgo = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const recentCommunicationsCount = await db.get(
            `SELECT COUNT(*) as count
             FROM communications c
             JOIN user_communications uc ON c.communication_id = uc.communication_id
             WHERE c.date_contacted > ?
             AND uc.user_id = ?`,
            [sevenDaysAgo, userId]
        );

        return {
            companiesCount: companiesCount.count,
            contactsCount: contactsCount.count,
            communicationsCount: communicationsCount.count,
            meetingsCount: meetingsCount.count,
            upcomingMeetingsCount: upcomingMeetingsCount.count,
            pendingFollowUpsCount: pendingFollowUpsCount.count,
            recentCommunicationsCount: recentCommunicationsCount.count,
            isAdmin: false
        };
    },

    /**
    * Get recent activities for a specific user (or system-wide for admin)
    * @param {number} limit - Maximum number of activities to return
    * @param {number} userId - The user ID
    * @returns {Promise<Array>} Array of recent activities
    */
    async getRecentActivities(limit = 10, userId) {
        const db = await getDbConnection();
        
        // Check if user is admin
        const isAdmin = await isUserAdmin(userId);
        
        // For admin, get system-wide activities or option to filter by user
        if (isAdmin) {
            // Get recent communications (system-wide)
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
                  u.username as created_by,
                  com.contact_method as description
                FROM communications com
                JOIN contacts c ON com.contact_id = c.contact_id
                LEFT JOIN companies co ON c.company_id = co.company_id
                JOIN user_communications uc ON com.communication_id = uc.communication_id AND uc.is_owner = 1
                JOIN users u ON uc.user_id = u.user_id
                ORDER BY com.date_contacted DESC
                LIMIT ?
                `,
                [limit]
            );

            // Get recent meetings (system-wide)
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
                  u.username as created_by,
                  m.meeting_type || ' meeting - ' || m.meeting_status as description
                FROM meetings m
                JOIN contacts c ON m.contact_id = c.contact_id
                LEFT JOIN companies co ON c.company_id = co.company_id
                JOIN user_meetings um ON m.meeting_id = um.meeting_id AND um.is_owner = 1
                JOIN users u ON um.user_id = u.user_id
                ORDER BY m.meeting_date DESC
                LIMIT ?
                `,
                [limit]
            );
            
            // Get recent system activity log entries
            const recentSystemActivities = await db.all(
                `
                SELECT
                  'system' as type,
                  a.log_id as id,
                  a.created_at as date,
                  u.username as created_by,
                  NULL as contact_name,
                  NULL as contact_id,
                  NULL as company_name,
                  NULL as company_id,
                  a.action_type || ' ' || a.entity_type || 
                    CASE WHEN a.details IS NOT NULL THEN ': ' || a.details ELSE '' END as description
                FROM activity_log a
                JOIN users u ON a.user_id = u.user_id
                ORDER BY a.created_at DESC
                LIMIT ?
                `,
                [limit]
            );

            // Combine and sort by date
            const activities = [
                ...recentCommunications, 
                ...recentMeetings,
                ...recentSystemActivities
            ];
            activities.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Return limited number of activities
            return activities.slice(0, limit);
        }
        
        // For regular user, get user-specific activities
        
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
    
    /**
     * Get system activity logs (admin only)
     * @param {number} userId - The requesting user ID
     * @param {number} limit - Maximum number of logs to return
     * @param {number} offset - Offset for pagination
     * @param {object} filters - Optional filters (user_id, action_type, entity_type, date_from, date_to)
     * @returns {Promise<object>} Activity logs with pagination info
     */
    async getActivityLogs(userId, limit = 50, offset = 0, filters = {}) {
        const db = await getDbConnection();
        
        // Verify the user is an admin
        const isAdmin = await isUserAdmin(userId);
        if (!isAdmin) {
            throw new Error("Only administrators can access activity logs");
        }
        
        // Build query with filters
        let query = `
            SELECT a.*, u.username
            FROM activity_log a
            JOIN users u ON a.user_id = u.user_id
            WHERE 1=1
        `;
        
        const queryParams = [];
        
        if (filters.user_id) {
            query += " AND a.user_id = ?";
            queryParams.push(filters.user_id);
        }
        
        if (filters.action_type) {
            query += " AND a.action_type = ?";
            queryParams.push(filters.action_type);
        }
        
        if (filters.entity_type) {
            query += " AND a.entity_type = ?";
            queryParams.push(filters.entity_type);
        }
        
        if (filters.date_from) {
            query += " AND a.created_at >= ?";
            queryParams.push(filters.date_from);
        }
        
        if (filters.date_to) {
            query += " AND a.created_at <= ?";
            queryParams.push(filters.date_to);
        }
        
        // Add order and pagination
        query += " ORDER BY a.created_at DESC LIMIT ? OFFSET ?";
        queryParams.push(limit, offset);
        
        // Execute query
        const logs = await db.all(query, ...queryParams);
        
        // Count total matching logs for pagination
        let countQuery = `
            SELECT COUNT(*) as total
            FROM activity_log a
            WHERE 1=1
        `;
        
        const countParams = [];
        
        if (filters.user_id) {
            countQuery += " AND a.user_id = ?";
            countParams.push(filters.user_id);
        }
        
        if (filters.action_type) {
            countQuery += " AND a.action_type = ?";
            countParams.push(filters.action_type);
        }
        
        if (filters.entity_type) {
            countQuery += " AND a.entity_type = ?";
            countParams.push(filters.entity_type);
        }
        
        if (filters.date_from) {
            countQuery += " AND a.created_at >= ?";
            countParams.push(filters.date_from);
        }
        
        if (filters.date_to) {
            countQuery += " AND a.created_at <= ?";
            countParams.push(filters.date_to);
        }
        
        const totalResult = await db.get(countQuery, ...countParams);
        
        return {
            logs,
            pagination: {
                total: totalResult.total,
                limit,
                offset,
                hasMore: offset + logs.length < totalResult.total
            }
        };
    },
    
    /**
     * Get user activity summary (admin only)
     * @param {number} userId - The requesting user ID
     * @returns {Promise<Array>} Array of user activity summaries
     */
    async getUserActivitySummary(userId) {
        const db = await getDbConnection();
        
        // Verify the user is an admin
        const isAdmin = await isUserAdmin(userId);
        if (!isAdmin) {
            throw new Error("Only administrators can access user activity summaries");
        }
        
        return db.all(`
            SELECT 
                u.user_id,
                u.username,
                u.email,
                u.last_login,
                r.role_name,
                (SELECT COUNT(*) FROM activity_log WHERE user_id = u.user_id) as total_activities,
                (SELECT COUNT(*) FROM user_companies WHERE user_id = u.user_id) as companies_count,
                (SELECT COUNT(*) FROM user_contacts WHERE user_id = u.user_id) as contacts_count,
                (SELECT COUNT(*) FROM user_communications WHERE user_id = u.user_id) as communications_count,
                (SELECT COUNT(*) FROM user_meetings WHERE user_id = u.user_id) as meetings_count,
                (SELECT COUNT(*) FROM activity_log 
                 WHERE user_id = u.user_id AND created_at > datetime('now', '-30 days')) as recent_activities
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            ORDER BY total_activities DESC
        `);
    }
};
