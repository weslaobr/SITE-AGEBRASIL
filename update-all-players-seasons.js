// update-all-players-complete.js
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: "postgresql://postgres:ljPQHCOBFkYKHSAnZshLkQDmSWDZqBqW@mainline.proxy.rlwy.net:27194/railway",
    ssl: { rejectUnauthorized: false }
});

function pointsToClass(points) {
    if (points >= 1600) return 'Conquer 3';
    if (points >= 1500) return 'Conquer 2';
    if (points >= 1400) return 'Conquer 1';
    if (points >= 1350) return 'Diamante 3';
    if (points >= 1300) return 'Diamante 2';
    if (points >= 1200) return 'Diamante 1';
    if (points >= 1150) return 'Platina 3';
    if (points >= 1100) return 'Platina 2';
    if (points >= 1000) return 'Platina 1';
    if (points >= 900) return 'Ouro 3';
    if (points >= 800) return 'Ouro 2';
    if (points >= 700) return 'Ouro 1';
    if (points >= 600) return 'Prata 3';
    if (points >= 550) return 'Prata 2';
    if (points >= 500) return 'Prata 1';
    if (points >= 450) return 'Bronze 3';
    if (points >= 400) return 'Bronze 2';
    return 'Bronze 1';
}

async function updateAllPlayersComplete() {
    try {
        console.log('🚀 Iniciando atualização COMPLETA para TODOS os jogadores...\n');

        // Buscar todos os jogadores da tabela users
        const playersResult = await pool.query(`
            SELECT u.id as user_id, u.discord_user_id, u.aoe4_world_id
            FROM users u
            WHERE u.aoe4_world_id IS NOT NULL 
            AND u.aoe4_world_id != ''
            ORDER BY u.id
        `);

        console.log(`📊 Encontrados ${playersResult.rows.length} jogadores na tabela users`);

        let totalUpdated = 0;
        let totalErrors = 0;
        let totalSeasons = 0;

        // Processar cada jogador
        const playersToProcess = playersResult.rows;

        console.log(`🎯 Processando ${playersToProcess.length} jogadores...\n`);

        for (let i = 0; i < playersToProcess.length; i++) {
            const player = playersToProcess[i];

            try {
                console.log(`[${i + 1}/${playersToProcess.length}] 🔍 Processando: ${player.aoe4_world_id}...`);

                // Buscar dados completos da API
                const response = await fetch(`https://aoe4world.com/api/v0/players/${player.aoe4_world_id}`, {
                    headers: { 'User-Agent': 'Aoe4BrasilBot/1.0' }
                });

                if (!response.ok) {
                    console.log(`   ❌ API não respondeu`);
                    totalErrors++;
                    continue;
                }

                const playerData = await response.json();

                if (!playerData.name) {
                    console.log(`   ❌ Dados inválidos`);
                    totalErrors++;
                    continue;
                }

                // Coletar dados de todas as seasons
                const seasonsData = [];

                // Season atual (12) - Dados COMPLETOS
                if (playerData.modes) {
                    const solo = playerData.modes.rm_solo || playerData.modes.rm_1v1;
                    const team = playerData.modes.rm_team || playerData.modes.rm_2v2 || playerData.modes.rm_3v3 || playerData.modes.rm_4v4;

                    if (solo || team) {
                        seasonsData.push({
                            season_id: 12,
                            name: playerData.name,
                            avatar_url: playerData.avatar_url,
                            clan_tag: playerData.clan?.tag,
                            region: playerData.region,
                            civilization: playerData.main_civilization,

                            // Dados Solo
                            rm_solo_points: solo?.rating || 0,
                            rm_solo_elo: solo?.rating || 0,
                            rm_solo_wins: solo?.wins_count || 0,
                            rm_solo_total_matches: solo?.games_count || 0,
                            last_solo_game: solo?.last_game_at,

                            // Dados Team
                            rm_team_points: team?.rating || 0,
                            rm_team_elo: team?.rating || 0,
                            rm_team_wins: team?.wins_count || 0,
                            rm_team_total_matches: team?.games_count || 0,
                            last_team_game: team?.last_game_at,

                            source: 'current'
                        });
                    }
                }

                // Seasons anteriores - Dados históricos
                if (playerData.modes?.rm_1v1?.previous_seasons) {
                    playerData.modes.rm_1v1.previous_seasons.forEach(prevSeason => {
                        seasonsData.push({
                            season_id: prevSeason.season,
                            name: playerData.name,
                            avatar_url: playerData.avatar_url,
                            clan_tag: playerData.clan?.tag,
                            region: playerData.region,
                            civilization: playerData.main_civilization,

                            // Dados Solo (históricos)
                            rm_solo_points: prevSeason.rating || 0,
                            rm_solo_elo: prevSeason.rating || 0,
                            rm_solo_wins: prevSeason.wins_count || 0,
                            rm_solo_total_matches: prevSeason.games_count || 0,
                            last_solo_game: prevSeason.last_game_at,

                            // Dados Team (históricos - geralmente não disponíveis)
                            rm_team_points: 0,
                            rm_team_elo: 0,
                            rm_team_wins: 0,
                            rm_team_total_matches: 0,
                            last_team_game: null,

                            source: 'historical'
                        });
                    });
                }

                if (seasonsData.length === 0) {
                    console.log(`   ⚠️  Nenhuma season encontrada`);
                    continue;
                }

                // Inserir/atualizar no banco
                let playerSeasonsUpdated = 0;
                for (const season of seasonsData) {
                    try {
                        await pool.query(`
                            INSERT INTO leaderboard_cache 
                            (user_id, aoe4_world_id, name,
                             rm_solo_points, rm_solo_elo, rm_solo_wins, rm_solo_total_matches,
                             rm_team_points, rm_team_elo, rm_team_wins, rm_team_total_matches,
                             level, season_id, avatar_url, clan_tag, region, civilization,
                             last_solo_game, last_team_game, cached_at)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
                            ON CONFLICT (user_id, season_id) 
                            DO UPDATE SET
                                name = EXCLUDED.name,
                                rm_solo_points = EXCLUDED.rm_solo_points,
                                rm_solo_elo = EXCLUDED.rm_solo_elo,
                                rm_solo_wins = EXCLUDED.rm_solo_wins,
                                rm_solo_total_matches = EXCLUDED.rm_solo_total_matches,
                                rm_team_points = EXCLUDED.rm_team_points,
                                rm_team_elo = EXCLUDED.rm_team_elo,
                                rm_team_wins = EXCLUDED.rm_team_wins,
                                rm_team_total_matches = EXCLUDED.rm_team_total_matches,
                                level = EXCLUDED.level,
                                avatar_url = EXCLUDED.avatar_url,
                                clan_tag = EXCLUDED.clan_tag,
                                region = EXCLUDED.region,
                                civilization = EXCLUDED.civilization,
                                last_solo_game = EXCLUDED.last_solo_game,
                                last_team_game = EXCLUDED.last_team_game,
                                cached_at = NOW()
                        `, [
                            player.user_id,
                            player.aoe4_world_id,
                            season.name,
                            season.rm_solo_points,
                            season.rm_solo_elo,
                            season.rm_solo_wins,
                            season.rm_solo_total_matches,
                            season.rm_team_points,
                            season.rm_team_elo,
                            season.rm_team_wins,
                            season.rm_team_total_matches,
                            pointsToClass(season.rm_solo_points), // level baseado no ELO solo
                            season.season_id,
                            season.avatar_url,
                            season.clan_tag,
                            season.region,
                            season.civilization,
                            season.last_solo_game,
                            season.last_team_game
                        ]);

                        playerSeasonsUpdated++;
                        totalSeasons++;

                    } catch (error) {
                        console.log(`   ❌ Erro season ${season.season_id}:`, error.message);
                    }
                }

                if (playerSeasonsUpdated > 0) {
                    totalUpdated++;
                    console.log(`   ✅ ${playerData.name}: ${playerSeasonsUpdated} seasons atualizadas`);
                }

                // Delay para não sobrecarregar a API
                if (i < playersToProcess.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }

            } catch (error) {
                console.log(`   💥 Erro geral:`, error.message);
                totalErrors++;
            }
        }

        console.log(`\n🎉 RESUMO FINAL:`);
        console.log(`   ✅ Jogadores atualizados: ${totalUpdated}`);
        console.log(`   📊 Seasons processadas: ${totalSeasons}`);
        console.log(`   ❌ Erros: ${totalErrors}`);
        console.log(`   📊 Total de jogadores: ${playersToProcess.length}`);

        // Estatísticas finais
        const stats = await pool.query(`
            SELECT 
                COUNT(DISTINCT user_id) as total_players,
                COUNT(*) as total_records,
                COUNT(DISTINCT season_id) as seasons_count,
                MIN(season_id) as min_season,
                MAX(season_id) as max_season
            FROM leaderboard_cache 
            WHERE name IS NOT NULL
        `);

        console.log(`\n📈 ESTATÍSTICAS DO BANCO:`);
        console.log(`   👥 Jogadores únicos: ${stats.rows[0].total_players}`);
        console.log(`   📊 Registros totais: ${stats.rows[0].total_records}`);
        console.log(`   🎮 Seasons: ${stats.rows[0].min_season} a ${stats.rows[0].max_season}`);

    } catch (error) {
        console.error('❌ Erro geral:', error);
    } finally {
        await pool.end();
    }
}

updateAllPlayersComplete();