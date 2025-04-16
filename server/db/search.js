import { getDbConnection, isUserAdmin } from "./connection.js";

/**
 * Search functionality across multiple tables
 */
export const searchDb = {
    /**
     * Search across companies and contacts (with admin override for all data)
     * @param {string} query - The search query
     * @param {number} userId - The user ID
     * @returns {Promise<object>} Search results
     */
    async search(query, userId) {
        if (!query || query.trim() === "") {
            return {
                companies: [],
                contacts: [],
                meetings: [],
                communications: []
            };
        }

        const searchTerm = `%${query.trim()}%`;
        const db = await getDbConnection();
        
        // Check if user is admin
        const isAdmin = await isUserAdmin(userId);
        
        // Search companies
        let companies;
        if (isAdmin) {
            // Admin can search all companies
            companies = await db.all(
                `
                SELECT c.*
                FROM companies c
                WHERE c.company_name LIKE ? OR c.website LIKE ? OR 
                      c.address LIKE ? OR c.phone LIKE ? OR c.email LIKE ?
                ORDER BY c.company_name
                LIMIT 20
                `,
                [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
            );
        } else {
            // Regular users only search companies they have access to
            companies = await db.all(
                `
                SELECT c.*
                FROM companies c
                JOIN user_companies uc ON c.company_id = uc.company_id
                WHERE uc.user_id = ?
                AND (c.company_name LIKE ? OR c.website LIKE ? OR 
                     c.address LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)
                ORDER BY c.company_name
                LIMIT 20
                `,
                [userId, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
            );
        }

        // Search contacts
        let contacts;
        if (isAdmin) {
            // Admin can search all contacts
            contacts = await db.all(
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
                [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
            );
        } else {
            // Regular users only search contacts they have access to
            contacts = await db.all(
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
        }
        
        // Search meetings (for admins or more comprehensive search)
        let meetings = [];
        if (isAdmin || query.length > 3) {  // Only search meetings for more specific queries
            if (isAdmin) {
                // Admin can search all meetings
                meetings = await db.all(
                    `
                    SELECT m.*, c.first_name, c.last_name, co.company_name
                    FROM meetings m
                    JOIN contacts c ON m.contact_id = c.contact_id
                    LEFT JOIN companies co ON c.company_id = co.company_id
                    WHERE m.location LIKE ? OR m.meeting_notes LIKE ? OR
                          m.meeting_type LIKE ? OR m.meeting_status LIKE ? OR
                          c.first_name || ' ' || c.last_name LIKE ?
                    ORDER BY m.meeting_date DESC
                    LIMIT 10
                    `,
                    [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
                );
            } else {
                // Regular users only search meetings they have access to
                meetings = await db.all(
                    `
                    SELECT m.*, c.first_name, c.last_name, co.company_name
                    FROM meetings m
                    JOIN user_meetings um ON m.meeting_id = um.meeting_id
                    JOIN contacts c ON m.contact_id = c.contact_id
                    LEFT JOIN companies co ON c.company_id = co.company_id
                    WHERE um.user_id = ?
                    AND (m.location LIKE ? OR m.meeting_notes LIKE ? OR
                         m.meeting_type LIKE ? OR m.meeting_status LIKE ? OR
                         c.first_name || ' ' || c.last_name LIKE ?)
                    ORDER BY m.meeting_date DESC
                    LIMIT 10
                    `,
                    [userId, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
                );
            }
        }
        
        // Search communications (for admins or more comprehensive search)
        let communications = [];
        if (isAdmin || query.length > 3) {  // Only search communications for more specific queries
            if (isAdmin) {
                // Admin can search all communications
                communications = await db.all(
                    `
                    SELECT com.*, c.first_name, c.last_name, co.company_name
                    FROM communications com
                    JOIN contacts c ON com.contact_id = c.contact_id
                    LEFT JOIN companies co ON c.company_id = co.company_id
                    WHERE com.message_content LIKE ? OR 
                          com.response_content LIKE ? OR
                          com.contact_method LIKE ? OR
                          c.first_name || ' ' || c.last_name LIKE ?
                    ORDER BY com.date_contacted DESC
                    LIMIT 10
                    `,
                    [searchTerm, searchTerm, searchTerm, searchTerm]
                );
            } else {
                // Regular users only search communications they have access to
                communications = await db.all(
                    `
                    SELECT com.*, c.first_name, c.last_name, co.company_name
                    FROM communications com
                    JOIN user_communications uc ON com.communication_id = uc.communication_id
                    JOIN contacts c ON com.contact_id = c.contact_id
                    LEFT JOIN companies co ON c.company_id = co.company_id
                    WHERE uc.user_id = ?
                    AND (com.message_content LIKE ? OR 
                         com.response_content LIKE ? OR
                         com.contact_method LIKE ? OR
                         c.first_name || ' ' || c.last_name LIKE ?)
                    ORDER BY com.date_contacted DESC
                    LIMIT 10
                    `,
                    [userId, searchTerm, searchTerm, searchTerm, searchTerm]
                );
            }
        }

        return {
            companies,
            contacts,
            meetings,
            communications
        };
    },
    
    /**
     * Advanced search with filters (primarily for admin)
     * @param {object} filters - Search filters
     * @param {number} userId - The user ID
     * @param {number} limit - Maximum results per category
     * @returns {Promise<object>} Search results
     */
    async advancedSearch(filters, userId, limit = 20) {
        const db = await getDbConnection();
        const isAdmin = await isUserAdmin(userId);
        
        // Build query parameters
        const params = [];
        let whereClause = "1=1";
        
        // Text search
        if (filters.query && filters.query.trim() !== "") {
            const searchTerm = `%${filters.query.trim()}%`;
            params.push(searchTerm);
            
            // Different text search fields depending on entity type
            switch(filters.entityType) {
                case 'companies':
                    whereClause += " AND (c.company_name LIKE ? OR c.website LIKE ? OR c.email LIKE ?)";
                    params.push(searchTerm, searchTerm);
                    break;
                case 'contacts':
                    whereClause += " AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.position LIKE ?)";
                    params.push(searchTerm, searchTerm, searchTerm);
                    break;
                case 'communications':
                    whereClause += " AND (com.message_content LIKE ? OR com.response_content LIKE ? OR com.contact_method LIKE ?)";
                    params.push(searchTerm, searchTerm);
                    break;
                case 'meetings':
                    whereClause += " AND (m.location LIKE ? OR m.meeting_notes LIKE ? OR m.meeting_type LIKE ? OR m.meeting_status LIKE ?)";
                    params.push(searchTerm, searchTerm, searchTerm);
                    break;
            }
        }
        
        // Date filters
        if (filters.dateFrom) {
            let dateField;
            switch(filters.entityType) {
                case 'companies':
                case 'contacts':
                    dateField = "created_at";
                    break;
                case 'communications':
                    dateField = "date_contacted";
                    break;
                case 'meetings':
                    dateField = "meeting_date";
                    break;
            }
            
            if (dateField) {
                whereClause += ` AND ${dateField} >= ?`;
                params.push(filters.dateFrom);
            }
        }
        
        if (filters.dateTo) {
            let dateField;
            switch(filters.entityType) {
                case 'companies':
                case 'contacts':
                    dateField = "created_at";
                    break;
                case 'communications':
                    dateField = "date_contacted";
                    break;
                case 'meetings':
                    dateField = "meeting_date";
                    break;
            }
            
            if (dateField) {
                whereClause += ` AND ${dateField} <= ?`;
                params.push(filters.dateTo);
            }
        }
        
        // Entity-specific filters
        switch(filters.entityType) {
            case 'companies':
                if (filters.address) {
                    whereClause += " AND c.address LIKE ?";
                    params.push(`%${filters.address}%`);
                }
                break;
                
            case 'contacts':
                if (filters.companyId) {
                    whereClause += " AND c.company_id = ?";
                    params.push(filters.companyId);
                }
                if (filters.position) {
                    whereClause += " AND c.position LIKE ?";
                    params.push(`%${filters.position}%`);
                }
                break;
                
            case 'communications':
                if (filters.contactId) {
                    whereClause += " AND com.contact_id = ?";
                    params.push(filters.contactId);
                }
                if (filters.contactMethod) {
                    whereClause += " AND com.contact_method = ?";
                    params.push(filters.contactMethod);
                }
                if (filters.hasResponse !== undefined) {
                    whereClause += ` AND com.received_response = ${filters.hasResponse ? 1 : 0}`;
                }
                break;
                
            case 'meetings':
                if (filters.contactId) {
                    whereClause += " AND m.contact_id = ?";
                    params.push(filters.contactId);
                }
                if (filters.meetingType) {
                    whereClause += " AND m.meeting_type = ?";
                    params.push(filters.meetingType);
                }
                if (filters.meetingStatus) {
                    whereClause += " AND m.meeting_status = ?";
                    params.push(filters.meetingStatus);
                }
                if (filters.followUpNeeded !== undefined) {
                    whereClause += ` AND m.follow_up_needed = ${filters.followUpNeeded ? 1 : 0}`;
                }
                break;
        }
        
        // User access filter for non-admins
        if (!isAdmin) {
            // Add user_id parameter for access control
            params.push(userId);
        }
        
        // Execute the appropriate query based on entity type
        let results;
        
        switch(filters.entityType) {
            case 'companies':
                results = await this.searchCompanies(whereClause, params, isAdmin, userId, limit);
                break;
            case 'contacts':
                results = await this.searchContacts(whereClause, params, isAdmin, userId, limit);
                break;
            case 'communications':
                results = await this.searchCommunications(whereClause, params, isAdmin, userId, limit);
                break;
            case 'meetings':
                results = await this.searchMeetings(whereClause, params, isAdmin, userId, limit);
                break;
            default:
                // If no specific entity type, search all
                const companies = await this.searchCompanies(whereClause, params, isAdmin, userId, limit);
                const contacts = await this.searchContacts(whereClause, params, isAdmin, userId, limit);
                const communications = await this.searchCommunications(whereClause, params, isAdmin, userId, limit);
                const meetings = await this.searchMeetings(whereClause, params, isAdmin, userId, limit);
                
                results = {
                    companies,
                    contacts,
                    communications,
                    meetings
                };
        }
        
        return results;
    },
    
    /**
     * Search companies with filters
     * @private
     */
    async searchCompanies(whereClause, params, isAdmin, userId, limit) {
        const db = await getDbConnection();
        
        let query;
        if (isAdmin) {
            query = `
                SELECT c.*
                FROM companies c
                WHERE ${whereClause}
                ORDER BY c.company_name
                LIMIT ?
            `;
        } else {
            query = `
                SELECT c.*
                FROM companies c
                JOIN user_companies uc ON c.company_id = uc.company_id
                WHERE ${whereClause} AND uc.user_id = ?
                ORDER BY c.company_name
                LIMIT ?
            `;
        }
        
        // Add limit parameter
        params.push(limit);
        
        return db.all(query, params);
    },
    
    /**
     * Search contacts with filters
     * @private
     */
    async searchContacts(whereClause, params, isAdmin, userId, limit) {
        const db = await getDbConnection();
        
        let query;
        if (isAdmin) {
            query = `
                SELECT c.*, co.company_name
                FROM contacts c
                LEFT JOIN companies co ON c.company_id = co.company_id
                WHERE ${whereClause}
                ORDER BY c.last_name, c.first_name
                LIMIT ?
            `;
        } else {
            query = `
                SELECT c.*, co.company_name
                FROM contacts c
                JOIN user_contacts uc ON c.contact_id = uc.contact_id
                LEFT JOIN companies co ON c.company_id = co.company_id
                WHERE ${whereClause} AND uc.user_id = ?
                ORDER BY c.last_name, c.first_name
                LIMIT ?
            `;
        }
        
        // Add limit parameter
        params.push(limit);
        
        return db.all(query, params);
    },
    
    /**
     * Search communications with filters
     * @private
     */
    async searchCommunications(whereClause, params, isAdmin, userId, limit) {
        const db = await getDbConnection();
        
        let query;
        if (isAdmin) {
            query = `
                SELECT com.*, c.first_name, c.last_name, co.company_name
                FROM communications com
                JOIN contacts c ON com.contact_id = c.contact_id
                LEFT JOIN companies co ON c.company_id = co.company_id
                WHERE ${whereClause}
                ORDER BY com.date_contacted DESC
                LIMIT ?
            `;
        } else {
            query = `
                SELECT com.*, c.first_name, c.last_name, co.company_name
                FROM communications com
                JOIN user_communications uc ON com.communication_id = uc.communication_id
                JOIN contacts c ON com.contact_id = c.contact_id
                LEFT JOIN companies co ON c.company_id = co.company_id
                WHERE ${whereClause} AND uc.user_id = ?
                ORDER BY com.date_contacted DESC
                LIMIT ?
            `;
        }
        
        // Add limit parameter
        params.push(limit);
        
        return db.all(query, params);
    },
    
    /**
     * Search meetings with filters
     * @private
     */
    async searchMeetings(whereClause, params, isAdmin, userId, limit) {
        const db = await getDbConnection();
        
        let query;
        if (isAdmin) {
            query = `
                SELECT m.*, c.first_name, c.last_name, co.company_name
                FROM meetings m
                JOIN contacts c ON m.contact_id = c.contact_id
                LEFT JOIN companies co ON c.company_id = co.company_id
                WHERE ${whereClause}
                ORDER BY m.meeting_date DESC
                LIMIT ?
            `;
        } else {
            query = `
                SELECT m.*, c.first_name, c.last_name, co.company_name
                FROM meetings m
                JOIN user_meetings um ON m.meeting_id = um.meeting_id
                JOIN contacts c ON m.contact_id = c.contact_id
                LEFT JOIN companies co ON c.company_id = co.company_id
                WHERE ${whereClause} AND um.user_id = ?
                ORDER BY m.meeting_date DESC
                LIMIT ?
            `;
        }
        
        // Add limit parameter
        params.push(limit);
        
        return db.all(query, params);
    }
};
