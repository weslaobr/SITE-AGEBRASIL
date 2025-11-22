const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkTable() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tournaments';
        `);

        if (res.rows.length === 0) {
            console.log('❌ Table "tournaments" does not exist.');
        } else {
            console.log('✅ Table "tournaments" exists with columns:');
            console.log(JSON.stringify(res.rows, null, 2));
        }
    } catch (err) {
        console.error('❌ Error checking table:', err);
    } finally {
        pool.end();
    }
}

checkTable();
