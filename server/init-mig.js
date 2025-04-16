import { applyMigrations, createAdminMigration } from './db/migrations.js';

async function initializeDatabase() {
  try {
    // First create the admin migration file
    console.log('Creating admin migration file...');
    await createAdminMigration();

    // Then apply all migrations
    console.log('Applying migrations...');
    await applyMigrations();

    console.log('Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase();
