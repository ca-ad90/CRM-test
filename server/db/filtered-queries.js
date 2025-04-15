import { getDbConnection } from "./connection.js";
import { companiesDb } from "./companies.js";
import { contactsDb } from "./contacts.js";

/**
 * Get companies filtered by communication status (for a specific user)
 * @param {string} status - Filter type: 'contacted', 'not-contacted', 'no-contacts'
 * @param {number} userId - The user ID
 * @returns {Promise<Array>} Array of filtered company objects
 */
export const getFilteredCompanies = async (status, userId) => {
    const db = await getDbConnection();

    if (status === 'contacted') {
        // Get companies that have been contacted
        return db.all(`
            SELECT DISTINCT c.*
            FROM companies c
            JOIN user_companies uc ON c.company_id = uc.company_id
            JOIN contacts ct ON c.company_id = ct.company_id
            JOIN user_contacts uct ON ct.contact_id = uct.contact_id
            JOIN communications com ON ct.contact_id = com.contact_id
            JOIN user_communications ucom ON com.communication_id = ucom.communication_id
            WHERE uc.user_id = ? AND uct.user_id = ? AND ucom.user_id = ?
            ORDER BY c.company_name
        `, [userId, userId, userId]);
    } else if (status === 'not-contacted') {
        // Get companies that have not been contacted
        return db.all(`
            SELECT DISTINCT c.*
            FROM companies c
            JOIN user_companies uc ON c.company_id = uc.company_id
            JOIN contacts ct ON c.company_id = ct.company_id
            JOIN user_contacts uct ON ct.contact_id = uct.contact_id
            WHERE uc.user_id = ? AND uct.user_id = ?
            AND ct.contact_id NOT IN (
                SELECT DISTINCT com.contact_id
                FROM communications com
                JOIN user_communications ucom ON com.communication_id = ucom.communication_id
                WHERE ucom.user_id = ?
            )
            ORDER BY c.company_name
        `, [userId, userId, userId]);
    } else if (status === 'no-contacts') {
        // Get companies that have no contacts
        return db.all(`
            SELECT c.*
            FROM companies c
            JOIN user_companies uc ON c.company_id = uc.company_id
            WHERE uc.user_id = ?
            AND c.company_id NOT IN (
                SELECT DISTINCT company_id
                FROM contacts ct
                JOIN user_contacts uct ON ct.contact_id = uct.contact_id
                WHERE uct.user_id = ?
            )
            ORDER BY c.company_name
        `, [userId, userId]);
    } else {
        // Default to all companies if invalid status
        return companiesDb.getAll(userId);
    }
};

/**
 * Get contacts filtered by communication status or method (for a specific user)
 * @param {string} status - Filter type: 'contacted', 'not-contacted', 'called', 'emailed'
 * @param {number} userId - The user ID
 * @returns {Promise<Array>} Array of filtered contact objects
 */
export const getFilteredContacts = async (status, userId) => {
    const db = await getDbConnection();

    if (status === 'contacted') {
        // Get contacts that have been contacted
        return db.all(`
            SELECT DISTINCT c.*, co.company_name
            FROM contacts c
            JOIN user_contacts uc ON c.contact_id = uc.contact_id
            LEFT JOIN companies co ON c.company_id = co.company_id
            LEFT JOIN user_companies uco ON co.company_id = uco.company_id
            JOIN communications com ON c.contact_id = com.contact_id
            JOIN user_communications ucom ON com.communication_id = ucom.communication_id
            WHERE uc.user_id = ? AND (co.company_id IS NULL OR uco.user_id = ?) AND ucom.user_id = ?
            ORDER BY c.last_name, c.first_name
        `, [userId, userId, userId]);
    } else if (status === 'not-contacted') {
        // Get contacts that have not been contacted
        return db.all(`
            SELECT c.*, co.company_name
            FROM contacts c
            JOIN user_contacts uc ON c.contact_id = uc.contact_id
            LEFT JOIN companies co ON c.company_id = co.company_id
            LEFT JOIN user_companies uco ON co.company_id = uco.company_id
            WHERE uc.user_id = ? AND (co.company_id IS NULL OR uco.user_id = ?)
            AND c.contact_id NOT IN (
                SELECT DISTINCT com.contact_id
                FROM communications com
                JOIN user_communications ucom ON com.communication_id = ucom.communication_id
                WHERE ucom.user_id = ?
            )
            ORDER BY c.last_name, c.first_name
        `, [userId, userId, userId]);
    } else if (status === 'called') {
        // Get contacts that have been called
        return db.all(`
            SELECT DISTINCT c.*, co.company_name
            FROM contacts c
            JOIN user_contacts uc ON c.contact_id = uc.contact_id
            LEFT JOIN companies co ON c.company_id = co.company_id
            LEFT JOIN user_companies uco ON co.company_id = uco.company_id
            JOIN communications com ON c.contact_id = com.contact_id
            JOIN user_communications ucom ON com.communication_id = ucom.communication_id
            WHERE uc.user_id = ? AND (co.company_id IS NULL OR uco.user_id = ?)
            AND ucom.user_id = ? AND com.contact_method = 'phone'
            ORDER BY c.last_name, c.first_name
        `, [userId, userId, userId]);
    } else if (status === 'not-called') {
        // Get contacts that have been emailed but not called
        return db.all(`
            SELECT DISTINCT c.*, co.company_name
            FROM contacts c
            JOIN user_contacts uc ON c.contact_id = uc.contact_id
            LEFT JOIN companies co ON c.company_id = co.company_id
            LEFT JOIN user_companies uco ON co.company_id = uco.company_id
            WHERE uc.user_id = 0 AND (co.company_id IS NULL OR uco.user_id = 0)
            AND c.contact_id IN (
                SELECT DISTINCT com.contact_id
                FROM communications com
                JOIN user_communications ucom ON com.communication_id = ucom.communication_id
                WHERE ucom.user_id = 0 AND com.contact_method = 'email'
            )
            AND c.contact_id NOT IN (
                SELECT DISTINCT com.contact_id
                FROM communications com
                JOIN user_communications ucom ON com.communication_id = ucom.communication_id
                WHERE ucom.user_id = 0 AND com.contact_method = 'phone'
            )
            ORDER BY c.last_name, c.first_name
        `, [userId, userId, userId, userId]);
    } else if (status === 'emailed') {
        // Get contacts that have been emailed
        return db.all(`
            SELECT DISTINCT c.*, co.company_name
            FROM contacts c
            JOIN user_contacts uc ON c.contact_id = uc.contact_id
            LEFT JOIN companies co ON c.company_id = co.company_id
            LEFT JOIN user_companies uco ON co.company_id = uco.company_id
            JOIN communications com ON c.contact_id = com.contact_id
            JOIN user_communications ucom ON com.communication_id = ucom.communication_id
            WHERE uc.user_id = ? AND (co.company_id IS NULL OR uco.user_id = ?)
            AND ucom.user_id = ? AND com.contact_method = 'email'
            ORDER BY c.last_name, c.first_name
        `, [userId, userId, userId]);
    } else {
        // Default to all contacts if invalid status
        return contactsDb.getAll(userId);
    }
  }
