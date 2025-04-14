// db/permissions.js - User permissions related database operations

import { getDbConnection } from './connection.js';

/**
 * User permissions related database operations
 */
export const userPermissionsDb = {
    /**
     * Share a company with a user
     * @param {number} companyId - The company ID
     * @param {number} userId - The user ID
     * @param {boolean} isOwner - Whether the user is the owner
     * @returns {Promise<boolean>} Success status
     */
    async shareCompany(companyId, userId, isOwner = false) {
        const db = await getDbConnection();
        try {
            await db.run(
                "INSERT INTO user_companies (company_id, user_id, is_owner) VALUES (?, ?, ?)",
                [companyId, userId, isOwner ? 1 : 0]
            );
            return true;
        } catch (error) {
            console.error("Error sharing company:", error);
            return false;
        }
    },

    /**
     * Share a contact with a user
     * @param {number} contactId - The contact ID
     * @param {number} userId - The user ID
     * @param {boolean} isOwner - Whether the user is the owner
     * @returns {Promise<boolean>} Success status
     */
    async shareContact(contactId, userId, isOwner = false) {
        const db = await getDbConnection();
        try {
            await db.run(
                "INSERT INTO user_contacts (contact_id, user_id, is_owner) VALUES (?, ?, ?)",
                [contactId, userId, isOwner ? 1 : 0]
            );
            return true;
        } catch (error) {
            console.error("Error sharing contact:", error);
            return false;
        }
    },

    /**
     * Share a meeting with a user
     * @param {number} meetingId - The meeting ID
     * @param {number} userId - The user ID
     * @param {boolean} isOwner - Whether the user is the owner
     * @returns {Promise<boolean>} Success status
     */
    async shareMeeting(meetingId, userId, isOwner = false) {
        const db = await getDbConnection();
        try {
            await db.run(
                "INSERT INTO user_meetings (meeting_id, user_id, is_owner) VALUES (?, ?, ?)",
                [meetingId, userId, isOwner ? 1 : 0]
            );
            return true;
        } catch (error) {
            console.error("Error sharing meeting:", error);
            return false;
        }
    },

    /**
     * Share a communication with a user
     * @param {number} communicationId - The communication ID
     * @param {number} userId - The user ID
     * @param {boolean} isOwner - Whether the user is the owner
     * @returns {Promise<boolean>} Success status
     */
    async shareCommunication(communicationId, userId, isOwner = false) {
        const db = await getDbConnection();
        try {
            await db.run(
                "INSERT INTO user_communications (communication_id, user_id, is_owner) VALUES (?, ?, ?)",
                [communicationId, userId, isOwner ? 1 : 0]
            );
            return true;
        } catch (error) {
            console.error("Error sharing communication:", error);
            return false;
        }
    },

    /**
     * Remove company sharing for a user
     * @param {number} companyId - The company ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async unshareCompany(companyId, userId) {
        const db = await getDbConnection();
        const result = await db.run(
            "DELETE FROM user_companies WHERE company_id = ? AND user_id = ? AND is_owner = 0",
            [companyId, userId]
        );
        return result.changes > 0;
    },

    /**
     * Remove contact sharing for a user
     * @param {number} contactId - The contact ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async unshareContact(contactId, userId) {
        const db = await getDbConnection();
        const result = await db.run(
            "DELETE FROM user_contacts WHERE contact_id = ? AND user_id = ? AND is_owner = 0",
            [contactId, userId]
        );
        return result.changes > 0;
    },

    /**
     * Remove meeting sharing for a user
     * @param {number} meetingId - The meeting ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async unshareMeeting(meetingId, userId) {
        const db = await getDbConnection();
        const result = await db.run(
            "DELETE FROM user_meetings WHERE meeting_id = ? AND user_id = ? AND is_owner = 0",
            [meetingId, userId]
        );
        return result.changes > 0;
    },

    /**
     * Remove communication sharing for a user
     * @param {number} communicationId - The communication ID
     * @param {number} userId - The user ID
     * @returns {Promise<boolean>} Success status
     */
    async unshareCommunication(communicationId, userId) {
        const db = await getDbConnection();
        const result = await db.run(
            "DELETE FROM user_communications WHERE communication_id = ? AND user_id = ? AND is_owner = 0",
            [communicationId, userId]
        );
        return result.changes > 0;
    },

    /**
     * Get companies accessible by a user
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of company objects
     */
    async getUserCompanies(userId) {
        const db = await getDbConnection();
        return db.all(`
            SELECT c.*, uc.is_owner
            FROM companies c
            JOIN user_companies uc ON c.company_id = uc.company_id
            WHERE uc.user_id = ?
            ORDER BY c.company_name
        `, userId);
    },

    /**
     * Get contacts accessible by a user
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of contact objects
     */
    async getUserContacts(userId) {
        const db = await getDbConnection();
        return db.all(`
            SELECT c.*, co.company_name, uc.is_owner
            FROM contacts c
            LEFT JOIN companies co ON c.company_id = co.company_id
            JOIN user_contacts uc ON c.contact_id = uc.contact_id
            WHERE uc.user_id = ?
            ORDER BY c.last_name, c.first_name
        `, userId);
    },

    /**
     * Get meetings accessible by a user
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of meeting objects
     */
    async getUserMeetings(userId) {
        const db = await getDbConnection();
        return db.all(`
            SELECT m.*, c.first_name, c.last_name, co.company_name, um.is_owner
            FROM meetings m
            JOIN contacts c ON m.contact_id = c.contact_id
            LEFT JOIN companies co ON c.company_id = co.company_id
            JOIN user_meetings um ON m.meeting_id = um.meeting_id
            WHERE um.user_id = ?
            ORDER BY m.meeting_date DESC
        `, userId);
    },

    /**
     * Get communications accessible by a user
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} Array of communication objects
     */
    async getUserCommunications(userId) {
        const db = await getDbConnection();
        return db.all(`
            SELECT com.*, uc.is_owner
            FROM communications com
            JOIN user_communications uc ON com.communication_id = uc.communication_id
            WHERE uc.user_id = ?
            ORDER BY com.date_contacted DESC
        `, userId);
    },

    /**
     * Check if user has access to a company
     * @param {number} userId - The user ID
     * @param {number} companyId - The company ID
     * @returns {Promise<boolean>} Whether the user has access
     */
    async canAccessCompany(userId, companyId) {
        const db = await getDbConnection();
        const result = await db.get(
            "SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?",
            [userId, companyId]
        );
        return result ? true : false;
    },

    /**
     * Check if user has access to a contact
     * @param {number} userId - The user ID
     * @param {number} contactId - The contact ID
     * @returns {Promise<boolean>} Whether the user has access
     */
    async canAccessContact(userId, contactId) {
        const db = await getDbConnection();
        const result = await db.get(
            "SELECT 1 FROM user_contacts WHERE user_id = ? AND contact_id = ?",
            [userId, contactId]
        );
        return result ? true : false;
    },

    /**
     * Check if user has access to a meeting
     * @param {number} userId - The user ID
     * @param {number} meetingId - The meeting ID
     * @returns {Promise<boolean>} Whether the user has access
     */
    async canAccessMeeting(userId, meetingId) {
        const db = await getDbConnection();
        const result = await db.get(
            "SELECT 1 FROM user_meetings WHERE user_id = ? AND meeting_id = ?",
            [userId, meetingId]
        );
        return result ? true : false;
    },

    /**
     * Check if user has access to a communication
     * @param {number} userId - The user ID
     * @param {number} communicationId - The communication ID
     * @returns {Promise<boolean>} Whether the user has access
     */
    async canAccessCommunication(userId, communicationId) {
        const db = await getDbConnection();
        const result = await db.get(
            "SELECT 1 FROM user_communications WHERE user_id = ? AND communication_id = ?",
            [userId, communicationId]
        );
        return result ? true : false;
    },

    /**
     * Get users who have access to a company
     * @param {number} companyId - The company ID
     * @returns {Promise<Array>} Array of user objects
     */
    async getCompanyUsers(companyId) {
        const db = await getDbConnection();
        return db.all(`
            SELECT u.*, uc.is_owner
            FROM users u
            JOIN user_companies uc ON u.user_id = uc.user_id
            WHERE uc.company_id = ?
            ORDER BY u.username
        `, companyId);
    },

    /**
     * Get users who have access to a contact
     * @param {number} contactId - The contact ID
     * @returns {Promise<Array>} Array of user objects
     */
    async getContactUsers(contactId) {
        const db = await getDbConnection();
        return db.all(`
            SELECT u.*, uc.is_owner
            FROM users u
            JOIN user_contacts uc ON u.user_id = uc.user_id
            WHERE uc.contact_id = ?
            ORDER BY u.username
        `, contactId);
    },

    /**
     * Get users who have access to a meeting
     * @param {number} meetingId - The meeting ID
     * @returns {Promise<Array>} Array of user objects
     */
    async getMeetingUsers(meetingId) {
        const db = await getDbConnection();
        return db.all(`
            SELECT u.*, um.is_owner
            FROM users u
            JOIN user_meetings um ON u.user_id = um.user_id
            WHERE um.meeting_id = ?
            ORDER BY u.username
        `, meetingId);
    },

    /**
     * Get users who have access to a communication
     * @param {number} communicationId - The communication ID
     * @returns {Promise<Array>} Array of user objects
     */
    async getCommunicationUsers(communicationId) {
        const db = await getDbConnection();
        return db.all(`
            SELECT u.*, uc.is_owner
            FROM users u
            JOIN user_communications uc ON u.user_id = uc.user_id
            WHERE uc.communication_id = ?
            ORDER BY u.username
        `, communicationId);
    }
};
