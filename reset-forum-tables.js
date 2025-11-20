const { Pool } = require('pg');

const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(poolConfig);

async function resetForumTables() {
    let client;
    try {
        console.log('⚠️  ATENÇÃO: Isso irá APAGAR todos os dados do fórum!');
        console.log('Digite "RESETAR-FORUM" para confirmar:');

        // Aguardar confirmação
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await new Promise(resolve => {
            readline.question('Confirmação: ', resolve);
        });

        readline.close();

        if (answer !== 'RESETAR-FORUM') {
            console.log('❌ Operação cancelada.');
            return;
        }

        client = await pool.connect();

        console.log('🗑️  Removendo tabelas do fórum...');

        // Dropar tabelas na ordem correta (devido às foreign keys)
        const tables = [
            'FORUM_REPLIES',
            'FORUM_TOPICS',
            'FORUM_MOD_LOGS',
            'FORUM_USER_STATS',
            'FORUM_ADMINS',
            'FORUM_SETTINGS',
            'FORUM_CATEGORIES'
        ];

        for (const table of tables) {
            await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
            console.log(`   ✅ ${table} removida`);
        }

        console.log('✅ Todas as tabelas do fórum foram removidas.');
        console.log('💡 Execute "npm run forum:create-tables" para recriá-las.');

    } catch (error) {
        console.error('❌ Erro ao resetar tabelas:', error);
    } finally {
        if (client) client.release();
        await pool.end();
    }
}

if (require.main === module) {
    resetForumTables();
}