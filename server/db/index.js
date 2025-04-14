// db/index.js - Main DB entry point that collects and exports all modules

import { getDbConnection, initializeDatabase } from './connection.js';
import { companiesDb } from './companies.js';
import { contactsDb } from './contacts.js';
import { communicationsDb } from './communications.js';
import { meetingsDb } from './meetings.js';
import { dashboardDb } from './dashboard.js';
import { searchDb } from './search.js';
import { usersDb } from './users.js';
import { userPermissionsDb } from './permissions.js';
import {
    updateCreationOperations,
    updateGetOperations,
    updateDeleteOperations,
    updateDashboardOperations,
    updateSearchOperations,
    initializeUserPermissions,
    getFilteredCompanies,
    getFilteredContacts
} from './userPermissionsHelper.js';

export {
    getDbConnection,
    initializeDatabase,
    companiesDb,
    contactsDb,
    communicationsDb,
    meetingsDb,
    dashboardDb,
    searchDb,
    usersDb,
    userPermissionsDb,
    updateCreationOperations,
    updateGetOperations,
    updateDeleteOperations,
    updateDashboardOperations,
    updateSearchOperations,
    initializeUserPermissions,
    getFilteredCompanies,
    getFilteredContacts
};
