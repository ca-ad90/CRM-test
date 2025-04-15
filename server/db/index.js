import * as fs from 'node:fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getDbConnection } from "./connection.js";
import { contactsDb } from "./contacts.js";
import { companiesDb } from "./companies.js";
import { communicationsDb } from "./communications.js";
import { meetingsDb } from "./meetings.js";
import { searchDb } from "./search.js";
import { dashboardDb } from "./dashboard.js";
import { usersDb } from "./users.js";
import { tokensDb } from "./tokens.js";
import { getFilteredCompanies, getFilteredContacts } from "./filtered-queries.js";

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
            path.join("./", "init.sql"),
            "utf8",
        );

        // Execute schema creation
        await db.exec(initSql);

        // Read and execute authentication schema
        const authSql = fs.readFileSync(
            path.join("./", "createUserTable.sql"),
            "utf8",
        );

        await db.exec(authSql);
        console.log("Database schema initialized");
    }
}

export {
    companiesDb,
    contactsDb,
    communicationsDb,
    meetingsDb,
    dashboardDb,
    searchDb,
    usersDb,
    tokensDb,
    getFilteredCompanies,
    getFilteredContacts,
};
