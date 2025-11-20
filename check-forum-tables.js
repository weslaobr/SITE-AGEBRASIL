const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(poolConfig);

async function checkForumTables() {
    let client;
    try {
        console.log('🔍 Verificando tabelas do fórum...\n');
        client = await pool.connect();

        const tables = [
            'forum_categories',
            'forum_topics',
            'forum_replies',
            'forum_admins',
            'forum_mod_logs',
            'forum_user_stats',
            'forum_settings'
        ];

        for (const table of tables) {
            const result = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );
            `, [table]);

            const exists = result.rows[0].exists;
            console.log(`${exists ? '✅' : '❌'} ${table}: ${exists ? 'EXISTE' : 'NÃO ENCONTRADA'}`);
        }

        // Contar registros
        console.log('\n📊 Estatísticas:');
        try {
            const categoriesCount = await client.query('SELECT COUNT(*) FROM forum_categories');
            const settingsCount = await client.query('SELECT COUNT(*) FROM forum_settings');

            console.log(`   📂 Categorias: ${categoriesCount.rows[0].count}`);
            console.log(`   ⚙️  Configurações: ${settingsCount.rows[0].count}`);
        } catch (countError) {
            console.log('   ℹ️  Tabelas ainda vazias ou não criadas');
        }

    } catch (error) {
        console.error('❌ Erro ao verificar tabelas:', error.message);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

if (require.main === module) {
    checkForumTables();
}