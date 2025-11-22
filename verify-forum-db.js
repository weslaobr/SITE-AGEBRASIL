require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkTables() {
    const tables = [
        'forum_categories',
        'forum_topics',
        'forum_replies',
        'forum_admins'
    ];

    console.log('Verificando tabelas do fórum...');

    for (const table of tables) {
        try {
            const res = await pool.query(`SELECT count(*) FROM ${table}`);
            console.log(`✅ Tabela '${table}' existe. Registros: ${res.rows[0].count}`);
        } catch (err) {
            console.error(`❌ Erro na tabela '${table}':`, err.message);
        }
    }

    pool.end();
}

checkTables();
