// check-constraints.js
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: "postgresql://postgres:ljPQHCOBFkYKHSAnZshLkQDmSWDZqBqW@mainline.proxy.rlwy.net:27194/railway",
    ssl: { rejectUnauthorized: false }
});

async function checkConstraints() {
    try {
        const result = await pool.query(`
            SELECT 
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                tc.constraint_type
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
            WHERE 
                tc.table_name = 'leaderboard_cache'
        `);

        console.log('🔍 Constraints da tabela leaderboard_cache:');
        result.rows.forEach(row => {
            console.log(`   ${row.constraint_type}: ${row.constraint_name} (${row.column_name})`);
        });

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

checkConstraints();