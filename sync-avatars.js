// Script para sincronizar avatares do Discord para tópicos e respostas existentes
require('dotenv').config();
const { Pool } = require('pg');
const https = require('https');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

function fetchDiscordUser(discordId, botToken) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'discord.com',
            path: `/api/v10/users/${discordId}`,
            method: 'GET',
            headers: {
                'Authorization': `Bot ${botToken}`
            }
        };

        https.get(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function syncAvatars() {
    console.log('🔄 Iniciando sincronização de avatares...\n');

    if (!process.env.DISCORD_BOT_TOKEN) {
        console.log('❌ DISCORD_BOT_TOKEN não configurado no .env');
        console.log('ℹ️  Novos tópicos/respostas terão avatar automaticamente.');
        console.log('ℹ️  Para sincronizar tópicos antigos, configure o bot token.\n');
        await pool.end();
        return;
    }

    try {
        // 1. Buscar todos os tópicos e respostas únicos por author_discord_id
        const topicsResult = await pool.query(`
            SELECT DISTINCT author_discord_id, author_name 
            FROM forum_topics 
            WHERE author_discord_id IS NOT NULL
        `);

        const repliesResult = await pool.query(`
            SELECT DISTINCT author_discord_id, author_name 
            FROM forum_replies 
            WHERE author_discord_id IS NOT NULL
        `);

        // Combinar e remover duplicados
        const allAuthors = new Map();
        [...topicsResult.rows, ...repliesResult.rows].forEach(row => {
            if (!allAuthors.has(row.author_discord_id)) {
                allAuthors.set(row.author_discord_id, row.author_name);
            }
        });

        console.log(`📊 Encontrados ${allAuthors.size} autores únicos\n`);

        // 2. Para cada autor, buscar dados do Discord
        let updated = 0;
        let errors = 0;

        for (const [discordId, authorName] of allAuthors) {
            try {
                console.log(`🔍 Buscando avatar para ${authorName} (${discordId})...`);

                const userData = await fetchDiscordUser(discordId, process.env.DISCORD_BOT_TOKEN);
                const avatarUrl = userData.avatar
                    ? `https://cdn.discordapp.com/avatars/${discordId}/${userData.avatar}.webp`
                    : null;

                if (avatarUrl) {
                    // Atualizar tópicos
                    const topicsUpdate = await pool.query(
                        'UPDATE forum_topics SET author_avatar = $1 WHERE author_discord_id = $2',
                        [avatarUrl, discordId]
                    );

                    // Atualizar respostas
                    const repliesUpdate = await pool.query(
                        'UPDATE forum_replies SET author_avatar = $1 WHERE author_discord_id = $2',
                        [avatarUrl, discordId]
                    );

                    const totalUpdated = topicsUpdate.rowCount + repliesUpdate.rowCount;
                    console.log(`   ✅ Avatar atualizado! (${totalUpdated} registros)`);
                    updated += totalUpdated;
                } else {
                    console.log(`   ℹ️  Usuário não tem avatar customizado`);
                }

                // Delay para não exceder rate limit da API do Discord
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.log(`   ❌ Erro: ${error.message}`);
                errors++;
            }
        }

        console.log(`\n✨ Sincronização concluída!`);
        console.log(`   📝 ${updated} registros atualizados`);
        console.log(`   ⚠️  ${errors} erros`);

    } catch (error) {
        console.error('❌ Erro fatal:', error);
    } finally {
        await pool.end();
    }
}

// Executar
syncAvatars();
