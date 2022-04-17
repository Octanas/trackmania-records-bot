const { Pool } = require('pg');

require('dotenv').config();

const database = { client: null };

module.exports = {
    database: database,
    async initialize_db() {
        database.client = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });

        // Initialize database
        try {
            const query_server = 'CREATE TABLE IF NOT EXISTS "server" (' +
                '"discord_id" BIGINT PRIMARY KEY' +
                ');';

            await database.client.query(query_server);

            const query_player = 'CREATE TABLE IF NOT EXISTS "player" (' +
                '"discord_id" BIGINT PRIMARY KEY, ' +
                '"trackmania_id" TEXT NOT NULL, ' +
                '"server_id" BIGINT NOT NULL REFERENCES "server"("discord_id")' +
                ');';

            await database.client.query(query_player);

            console.log('Database initialized.');

        } catch (err) {
            console.log(`Error initializing database: ${err}`);
            throw err;
        }
    },
    async close_db() {
        console.log('Closing database connection...');

        if (database.client === null)
            console.log('Database connection is already closed.')

        await database.client.end();

        console.log('Database connection was closed.')

        database.client = null;
    }
}