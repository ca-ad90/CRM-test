import sqlite3 from "sqlite3";
import { open } from "sqlite";
import * as fs from 'node:fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { contactsDb } from "./contacts.js";
import { companiesDb } from "./companies.js";
import {communicationsDb} from "./communications.js";
import {meetingsDb} from "./meetings.js";
import {searchDb} from "./search.js";
import {dashboardDb} from "./dashboard.js";
export async function initializeDatabase() {
    const db = await getDbConnection();

    // Check if tables exist
    const tablesExist = await db.get(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='companies'
  `);

    if (!tablesExist) {
        console.log("Initializing database schema...");

        // Read schema from init.sql file
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const initSql = fs.readFileSync(
            path.join(__dirname, "init.sql"),
            "utf8",
        );

        // Execute schema creation
        await db.exec(initSql);
        console.log("Database schema initialized");
    }
}
/**
 * Get companies filtered by communication status
 * @param {string} status - Filter type: 'contacted', 'not-contacted'
 * @returns {Promise<Array>} Array of filtered company objects
 */
export const getFilteredCompanies = async (status) => {
    const db = await getDbConnection();

    if (status === 'contacted') {
        // Get companies that have been contacted
        return db.all(`
            SELECT DISTINCT c.*
            FROM companies c
            INNER JOIN contacts ct ON c.company_id = ct.company_id
            INNER JOIN communications com ON ct.contact_id = com.contact_id
            ORDER BY c.company_name
        `);
    } else if (status === 'not-contacted') {
        // Get companies that have not been contacted
        return db.all(`
    SELECT DISTINCT c.*
    FROM companies c
    INNER JOIN contacts ct ON c.company_id = ct.company_id
    WHERE ct.contact_id NOT IN (
        SELECT DISTINCT contact_id
        FROM communications
    )
    ORDER BY c.company_name        `);
    }else if (status === 'no-contacts') {
        // Get companies that have no contacts
                return db.all(`
                    SELECT c.*
                    FROM companies c
                    WHERE c.company_id NOT IN (
                        SELECT DISTINCT company_id
                        FROM contacts
                    )
                    ORDER BY c.company_name
                `);

    } else {
        // Default to all companies if invalid status
        return companiesDb.getAll();
    }
}

/**
 * Get contacts filtered by communication status or method
 * @param {string} status - Filter type: 'contacted', 'not-contacted', 'called', 'emailed'
 * @returns {Promise<Array>} Array of filtered contact objects
 */
export const getFilteredContacts = async (status) => {
    const db = await getDbConnection();

    if (status === 'contacted') {
        // Get contacts that have been contacted
        return db.all(`
            SELECT DISTINCT c.*, co.company_name
            FROM contacts c
            LEFT JOIN companies co ON c.company_id = co.company_id
            INNER JOIN communications com ON c.contact_id = com.contact_id
            ORDER BY c.last_name, c.first_name
        `);
    } else if (status === 'not-contacted') {
        // Get contacts that have not been contacted
        return db.all(`
            SELECT c.*, co.company_name
            FROM contacts c
            LEFT JOIN companies co ON c.company_id = co.company_id
            WHERE c.contact_id NOT IN (
                SELECT DISTINCT com.contact_id
                FROM communications com
            )
            ORDER BY c.last_name, c.first_name
        `);
    } else if (status === 'called') {
        // Get contacts that have been called
        return db.all(`
            SELECT DISTINCT c.*, co.company_name
            FROM contacts c
            LEFT JOIN companies co ON c.company_id = co.company_id
            INNER JOIN communications com ON c.contact_id = com.contact_id
            WHERE com.contact_method = 'phone' AND com.received_response = 1
            ORDER BY c.last_name, c.first_name
        `);

    }else if (status === 'not-called') {
        // Get contacts that have been called
        return db.all(`
      SELECT DISTINCT c.*, co.company_name
        FROM contacts c
        LEFT JOIN companies co ON c.company_id = co.company_id
        WHERE c.contact_id IN (
            SELECT DISTINCT contact_id
            FROM communications
            WHERE contact_method = 'email'
        )
        AND (
            c.contact_id NOT IN (
                SELECT DISTINCT contact_id
                FROM communications
                WHERE contact_method = 'phone'
            )
            OR
            c.contact_id IN (
                SELECT DISTINCT contact_id
                FROM communications
                WHERE contact_method = 'phone' AND received_response = 0
                AND contact_id NOT IN (
                    SELECT DISTINCT contact_id
                    FROM communications
                    WHERE contact_method = 'phone' AND received_response = 1
                )
            )
        )
        ORDER BY c.last_name, c.first_name

        `);
    } else if (status === 'emailed') {
        // Get contacts that have been emailed
        return db.all(`
            SELECT DISTINCT c.*, co.company_name
            FROM contacts c
            LEFT JOIN companies co ON c.company_id = co.company_id
            INNER JOIN communications com ON c.contact_id = com.contact_id
            WHERE com.contact_method = 'email'
            ORDER BY c.last_name, c.first_name
        `);
    } else {
        // Default to all contacts if invalid status
        return contactsDb.getAll();
    }
}
export default {
    companiesDb,
    contactsDb,
    communicationsDb,
    meetingsDb,
    dashboardDb,
    searchDb,
    getFilteredCompanies,
    getFilteredContacts,
    initializeDatabase,
};
