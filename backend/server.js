import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const PORT = process.env.PORT || 8080;

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pkg;

const app = express();

// CONFIGURAÇÃO DE ATUALIZAÇÃO AUTOMÁTICA - TESTES
const AUTO_UPDATE_CONFIG = {
  enabled: true,
  interval: 15 * 60 * 1000, // ⚡ 5 minutos para testes (depois volta para 30)
  playersPerBatch: 10, // Menos jogadores por lote
  delayBetweenRequests: 2000, // Mais delay entre requests
  maxPlayersPerUpdate: 10 // Menos jogadores por atualização
};

// Middleware
app.use(cors({
  origin: [
    'https://ageivbrasil.up.railway.app',
    'https://aoe4.com.br',
    'http://localhost:8080'
  ],
  credentials: true
}));
app.use(express.json());

const DATABASE_URL = "postgresql://postgres:ljPQHCOBFkYKHSAnZshLkQDmSWDZqBqW@mainline.proxy.rlwy.net:27194/railway";

// Configuração do PostgreSQL
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20
});

// Função para converter pontos em classe/rank
function pointsToClass(points) {
  const value = points || 0;
  
  if (value >= 1600) return 'Conquer 3';
  if (value >= 1500) return 'Conquer 2';
  if (value >= 1400) return 'Conquer 1';
  if (value >= 1350) return 'Diamante 3';
  if (value >= 1300) return 'Diamante 2';   
  if (value >= 1200) return 'Diamante 1';
  if (value >= 1150) return 'Platina 3';
  if (value >= 1100) return 'Platina 2';
  if (value >= 1000) return 'Platina 1';    
  if (value >= 900) return 'Ouro 3';
  if (value >= 800) return 'Ouro 2';
  if (value >= 700) return 'Ouro 1';
  if (value >= 600) return 'Prata 3';
  if (value >= 550) return 'Prata 2';    
  if (value >= 500) return 'Prata 1';
  if (value >= 450) return 'Bronze 3';
  if (value >= 400) return 'Bronze 2';
  return 'Bronze 1';
}

// FUNÇÃO: Sincronizar avatar individual
async function syncPlayerAvatar(playerId, playerName) {
    try {
        console.log(`🔄 Sincronizando avatar de ${playerName}...`);
        
        const response = await fetch(`https://aoe4world.com/api/v0/players/${playerId}`, {
            headers: { 'User-Agent': 'Aoe4BrasilBot/1.0' }
        });
        
        if (response.ok) {
            const playerData = await response.json();
            
            if (playerData.avatars && playerData.avatars.small) {
                await pool.query(
                    'UPDATE leaderboard_cache SET avatar_url = $1, cached_at = NOW() WHERE aoe4_world_id = $2',
                    [playerData.avatars.small, playerId]
                );
                
                console.log(`✅ Avatar sincronizado: ${playerData.avatars.small}`);
                return playerData.avatars.small;
            } else {
                console.log(`❌ ${playerName} não tem avatar na API`);
            }
        } else {
            console.log(`❌ HTTP ${response.status} para ${playerName}`);
        }
        
        return null;
    } catch (error) {
        console.error(`💥 Erro ao sincronizar avatar de ${playerName}:`, error.message);
        return null;
    }
}

// ✅ FUNÇÃO CORRIGIDA: Atualizar cache SEMPRE com Season 12
async function updatePlayerCache(playerId) {
    try {
        console.log(`🔄 Atualizando CACHE COMPLETO para ${playerId} (Season 12)...`);
        
        const response = await fetch(`https://aoe4world.com/api/v0/players/${playerId}`, {
            headers: { 'User-Agent': 'Aoe4BrasilBot/1.0' }
        });
        
        if (!response.ok) {
            console.log(`❌ Erro API: ${response.status} - ${response.statusText}`);
            return false;
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.log(`❌ Resposta não é JSON: ${contentType}`);
            return false;
        }
        
        const playerData = await response.json();
        
        if (!playerData || !playerData.name) {
            console.log('❌ Dados inválidos da API');
            return false;
        }
        
        console.log(`✅ Dados encontrados: ${playerData.name}`);
        
        // ✅ EXTRAIR DADOS (código existente...)
        const soloData = playerData.modes?.rm_solo || {};
        const pointsSolo = soloData.rating || 0;
        const winsSolo = soloData.wins_count || 0;
        const gamesSolo = soloData.games_count || 0;
        const lastSoloGame = soloData.last_game_at;
        
        const teamData = playerData.modes?.rm_team || {};
        const pointsTeam = teamData.rating || 0;
        const winsTeam = teamData.wins_count || 0;
        const gamesTeam = teamData.games_count || 0;
        const lastTeamGame = teamData.last_game_at;
        
        // ✅ ELO 1v1 CORRETO (código existente...)
        let elo1v1 = 0;
        if (playerData.modes?.rm_1v1_elo?.rating) {
            elo1v1 = playerData.modes.rm_1v1_elo.rating;
        } else if (playerData.modes?.rm_1v1?.rating) {
            elo1v1 = playerData.modes.rm_1v1.rating;
        } else if (playerData.modes?.rm_solo?.rating) {
            elo1v1 = playerData.modes.rm_solo.rating;
        }
        
        const eloTeam = teamData.rating || 0;
// Buscar clan tag do AOE4 World API E do nosso banco
let clanTag = playerData.clan?.tag || '';

// Se não encontrou na API, buscar do nosso banco
if (!clanTag) {
    const clanFromDB = await pool.query(`
        SELECT c.tag 
        FROM clan_members cm
        JOIN clans c ON cm.clan_id = c.id
        JOIN users u ON cm.discord_user_id = u.discord_user_id
        WHERE u.aoe4_world_id = $1
        LIMIT 1
    `, [playerId]);
    
    if (clanFromDB.rows.length > 0) {
        clanTag = clanFromDB.rows[0].tag;
        console.log(`✅ Clan encontrado no banco: ${clanTag}`);
    }
}
        const region = playerData.region || '';
        const civilization = playerData.civilization || '';
        const avatarUrl = playerData.avatars?.small || null;
        
        console.log(`🎯 Dados Season 12 - Solo: ${pointsSolo}pts (${winsSolo}/${gamesSolo}), Team: ${pointsTeam}pts, ELO: ${elo1v1}`);
        
        // Buscar/gerar user_id (código existente...)
        const existingUser = await pool.query(`
            SELECT user_id FROM leaderboard_cache 
            WHERE aoe4_world_id = $1 
            LIMIT 1
        `, [playerId]);
        
        let userId;
        if (existingUser.rows.length > 0) {
            userId = existingUser.rows[0].user_id;
        } else {
            const maxUser = await pool.query(`SELECT COALESCE(MAX(user_id), 0) as max_id FROM leaderboard_cache`);
            userId = parseInt(maxUser.rows[0].max_id) + 1;
        }
        
        // ✅✅✅ ATUALIZAÇÃO CORRIGIDA: SEMPRE Season 12, SEMPRE substituir dados antigos
        await pool.query(`
            INSERT INTO leaderboard_cache 
            (
                user_id, aoe4_world_id, name, 
                rm_solo_points, rm_solo_elo, rm_solo_wins, rm_solo_total_matches,
                rm_team_points, rm_team_elo, rm_team_wins, rm_team_total_matches,
                level, season_id, avatar_url, clan_tag, region, civilization,
                last_solo_game, last_team_game, cached_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
            ON CONFLICT (aoe4_world_id, season_id) 
            DO UPDATE SET
                user_id = EXCLUDED.user_id,
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
                avatar_url = COALESCE(EXCLUDED.avatar_url, leaderboard_cache.avatar_url),
                clan_tag = EXCLUDED.clan_tag,
                region = EXCLUDED.region,
                civilization = EXCLUDED.civilization,
                last_solo_game = EXCLUDED.last_solo_game,
                last_team_game = EXCLUDED.last_team_game,
                cached_at = NOW()
        `, [
            userId, playerId, playerData.name,
            pointsSolo, elo1v1, winsSolo, gamesSolo,
            pointsTeam, eloTeam, winsTeam, gamesTeam,
            pointsToClass(pointsSolo), 
            12,  // ✅ SEMPRE Season 12
            avatarUrl, clanTag, region, civilization,
            lastSoloGame, lastTeamGame
        ]);
        
        console.log(`✅ CACHE ATUALIZADO Season 12: ${playerData.name}`);
        console.log(`   🎯 Solo: ${pointsSolo}pts (${winsSolo}/${gamesSolo}) | Team: ${pointsTeam}pts (${winsTeam}/${gamesTeam})`);
        console.log(`   🏷️  Clan: ${clanTag} | ELO: ${elo1v1}`);
        
        return true;
        
    } catch (error) {
        console.error(`💥 Erro ao atualizar cache de ${playerId}:`, error.message);
        return false;
    }
}

// FUNÇÃO: Buscar players APENAS do banco local - COM ELO 1v1 CORRETO
async function getPlayersFromDatabase(limit, offset, mode, seasonId = 12) {
    try {
        console.log(`💾 Buscando ${limit} players do BANCO LOCAL (season: ${seasonId}, modo: ${mode}, offset: ${offset})...`);
        
        let pointsColumn, winsColumn, totalMatchesColumn, eloColumn, lastGameColumn;
        
        // Definir colunas baseadas no modo
        if (mode === 'rm_team') {
            pointsColumn = 'rm_team_points';
            winsColumn = 'rm_team_wins';
            totalMatchesColumn = 'rm_team_total_matches';
            eloColumn = 'rm_team_elo';
            lastGameColumn = 'last_team_game';
            console.log(`   🎯 Modo Team Ranked`);
        } else {
            pointsColumn = 'rm_solo_points';
            winsColumn = 'rm_solo_wins';
            totalMatchesColumn = 'rm_solo_total_matches';
            eloColumn = 'rm_solo_elo';
            lastGameColumn = 'last_solo_game';
            console.log(`   🎯 Modo Solo Ranked`);
        }

        // ✅✅✅ QUERY CORRIGIDA: Sem TO_CHAR problemático
        const query = `
    SELECT 
        lc.user_id as id,
        lc.name,
        -- ✅ CLAN TAG: Primeiro da cache, depois do banco
        COALESCE(
            NULLIF(lc.clan_tag, ''),
            (SELECT c.tag 
             FROM clan_members cm 
             JOIN clans c ON cm.clan_id = c.id 
             JOIN users u ON cm.discord_user_id = u.discord_user_id 
             WHERE u.aoe4_world_id = lc.aoe4_world_id 
             LIMIT 1),
            'Sem Clan'
        ) as clan,
        COALESCE(lc.avatar_url, '') as avatar_url,
        COALESCE(${pointsColumn}, 0) as points,
        COALESCE(${eloColumn}, 0) as elo,
        COALESCE(${winsColumn}, 0) as wins,
        COALESCE(${totalMatchesColumn}, 0) as total_matches,
        CASE 
            WHEN ${lastGameColumn} IS NOT NULL THEN ${lastGameColumn}::text
            WHEN lc.last_game IS NOT NULL THEN lc.last_game::text
            ELSE 'Sem dados'
        END as last_game,
        COALESCE(lc.region, '') as region,
        COALESCE(lc.civilization, '') as civilization,
        COALESCE(lc.aoe4_world_id, lc.user_id::text) as aoe4world_id,
        lc.season_id,
        lc.cached_at,
        CASE 
            WHEN COALESCE(${totalMatchesColumn}, 0) > 0 THEN 
                ROUND((COALESCE(${winsColumn}, 0)::decimal / COALESCE(${totalMatchesColumn}, 1) * 100)::numeric, 1)
            ELSE 0 
        END as winrate,
        CASE 
            WHEN COALESCE(${pointsColumn}, 0) >= 1600 THEN 'Conquer 3'
            WHEN COALESCE(${pointsColumn}, 0) >= 1500 THEN 'Conquer 2'
            WHEN COALESCE(${pointsColumn}, 0) >= 1400 THEN 'Conquer 1'
            WHEN COALESCE(${pointsColumn}, 0) >= 1350 THEN 'Diamante 3'
            WHEN COALESCE(${pointsColumn}, 0) >= 1300 THEN 'Diamante 2'
            WHEN COALESCE(${pointsColumn}, 0) >= 1200 THEN 'Diamante 1'
            WHEN COALESCE(${pointsColumn}, 0) >= 1150 THEN 'Platina 3'
            WHEN COALESCE(${pointsColumn}, 0) >= 1100 THEN 'Platina 2'
            WHEN COALESCE(${pointsColumn}, 0) >= 1000 THEN 'Platina 1'
            WHEN COALESCE(${pointsColumn}, 0) >= 900 THEN 'Ouro 3'
            WHEN COALESCE(${pointsColumn}, 0) >= 800 THEN 'Ouro 2'
            WHEN COALESCE(${pointsColumn}, 0) >= 700 THEN 'Ouro 1'
            WHEN COALESCE(${pointsColumn}, 0) >= 600 THEN 'Prata 3'
            WHEN COALESCE(${pointsColumn}, 0) >= 550 THEN 'Prata 2'
            WHEN COALESCE(${pointsColumn}, 0) >= 500 THEN 'Prata 1'
            WHEN COALESCE(${pointsColumn}, 0) >= 450 THEN 'Bronze 3'
            WHEN COALESCE(${pointsColumn}, 0) >= 400 THEN 'Bronze 2'
            ELSE 'Bronze 1'
        END as level,
        CASE 
            WHEN ${pointsColumn} IS NOT NULL AND ${pointsColumn} > 0 THEN true
            ELSE false
        END as has_mode_data,
        lc.rm_solo_points as solo_points,
        lc.rm_solo_elo as solo_elo
    FROM leaderboard_cache lc
    WHERE lc.name IS NOT NULL 
    AND lc.name != ''
    AND lc.name != 'Unknown Player'
    AND lc.season_id = $1
    ORDER BY 
        CASE 
            WHEN ${pointsColumn} IS NOT NULL AND ${pointsColumn} > 0 THEN 1
            ELSE 2
        END,
        COALESCE(${pointsColumn}, 0) DESC,
        lc.name ASC
    LIMIT $2 OFFSET $3
`;

        const result = await pool.query(query, [seasonId, limit, offset]);
        
        console.log(`✅ ENCONTRADOS ${result.rows.length} PLAYERS NO BANCO LOCAL`);
        
        // Debug detalhado - CORRIGIDO
        if (result.rows.length > 0) {
            console.log(`🔍 Debug ELO/Pontos (primeiros 3 players):`);
            result.rows.slice(0, 3).forEach((row, index) => {
                console.log(`   ${row.name}: Points=${row.points}, ELO=${row.elo}, LastGame=${row.last_game}`);
            });
        }
        
        // Converter para o formato esperado
        const players = result.rows.map((row, index) => ({
            ...row,
            rank: offset + index + 1,
            total_games: row.total_matches,
            _source: 'database',
            game_mode: mode,
            season: row.season_id,
            has_data: row.has_mode_data,
            solo_points: row.solo_points,
            solo_elo: row.solo_elo
        }));

        return players;
        
    } catch (error) {
        console.error('💥 Erro ao buscar players do banco:', error);
        return [];
    }
}

// ROTA: Atualizar clan tags no cache
app.post('/api/admin/update-clan-tags', async (req, res) => {
    try {
        console.log('🔄 Atualizando clan tags no cache...');
        
        const result = await pool.query(`
            UPDATE leaderboard_cache lc
            SET clan_tag = subquery.clan_tag
            FROM (
                SELECT 
                    u.aoe4_world_id,
                    c.tag as clan_tag
                FROM users u
                JOIN clan_members cm ON u.discord_user_id = cm.discord_user_id
                JOIN clans c ON cm.clan_id = c.id
                WHERE u.aoe4_world_id IS NOT NULL
                AND c.tag IS NOT NULL
                AND c.tag != ''
            ) AS subquery
            WHERE lc.aoe4_world_id = subquery.aoe4_world_id
            AND (lc.clan_tag IS NULL OR lc.clan_tag = '')
        `);
        
        console.log(`✅ Clan tags atualizadas: ${result.rowCount} registros`);
        
        res.json({
            success: true,
            message: `Clan tags atualizadas: ${result.rowCount} registros`,
            updated: result.rowCount
        });
        
    } catch (error) {
        console.error('❌ Erro ao atualizar clan tags:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// FUNÇÃO CORRIGIDA: Gerar estatísticas da leaderboard - COM CLANS REAIS
async function getLeaderboardStats(seasonId = 12) {
    try {
        console.log(`📊 Gerando estatísticas da leaderboard - Season ${seasonId}...`);
        
        // Buscar estatísticas da leaderboard_cache
        const stats = await pool.query(`
            SELECT 
                -- Estatísticas gerais
                COUNT(*) as total_players,
                COUNT(DISTINCT clan_tag) as players_with_clan_tag,
                
                -- Jogadores por modo
                COUNT(CASE WHEN rm_solo_points > 0 THEN 1 END) as players_with_solo,
                COUNT(CASE WHEN rm_team_points > 0 THEN 1 END) as players_with_team,
                
                -- Total de jogos
                COALESCE(SUM(rm_solo_total_matches), 0) as total_solo_games,
                COALESCE(SUM(rm_team_total_matches), 0) as total_team_games,
                
                -- Médias
                ROUND(AVG(COALESCE(rm_solo_points, 0))) as avg_solo_points,
                ROUND(AVG(COALESCE(rm_team_points, 0))) as avg_team_points,
                ROUND(AVG(COALESCE(rm_solo_elo, 0))) as avg_solo_elo,
                ROUND(AVG(COALESCE(rm_team_elo, 0))) as avg_team_elo,
                
                -- Top players
                MAX(COALESCE(rm_solo_points, 0)) as max_solo_points,
                MAX(COALESCE(rm_team_points, 0)) as max_team_points,
                
                -- Distribuição por tier (Solo)
                COUNT(CASE WHEN rm_solo_points >= 1600 THEN 1 END) as conquer_players,
                COUNT(CASE WHEN rm_solo_points >= 1400 AND rm_solo_points < 1600 THEN 1 END) as diamond_players,
                COUNT(CASE WHEN rm_solo_points >= 1000 AND rm_solo_points < 1400 THEN 1 END) as platinum_gold_players,
                COUNT(CASE WHEN rm_solo_points >= 500 AND rm_solo_points < 1000 THEN 1 END) as silver_bronze_players,
                COUNT(CASE WHEN rm_solo_points < 500 AND rm_solo_points > 0 THEN 1 END) as low_elo_players,
                
                -- Players com clan tag
                COUNT(CASE WHEN clan_tag IS NOT NULL AND clan_tag != '' THEN 1 END) as players_with_clan
                
            FROM leaderboard_cache 
            WHERE name IS NOT NULL 
            AND name != ''
            AND name != 'Unknown Player'
            AND season_id = $1
        `, [seasonId]);

        console.log('📊 Resultado da query de estatísticas:', stats.rows[0]);
        
        // Buscar número REAL de clans da tabela clans
        const clanStats = await pool.query(`
            SELECT COUNT(*) as total_clans
            FROM clans 
            WHERE name IS NOT NULL AND name != ''
        `);
        
        const row = stats.rows[0];
        const totalRealClans = parseInt(clanStats.rows[0].total_clans);
        
        const result = {
            // Estatísticas básicas
            total_players: parseInt(row.total_players) || 0,
            total_clans: totalRealClans, // ✅ AGORA USANDO CLANS REAIS
            players_with_clan: parseInt(row.players_with_clan) || 0,
            players_with_clan_tag: parseInt(row.players_with_clan_tag) || 0, // Para debug
            
            // Modos de jogo
            players_with_solo: parseInt(row.players_with_solo) || 0,
            players_with_team: parseInt(row.players_with_team) || 0,
            
            // Total de jogos
            total_solo_games: parseInt(row.total_solo_games) || 0,
            total_team_games: parseInt(row.total_team_games) || 0,
            total_games: (parseInt(row.total_solo_games) || 0) + (parseInt(row.total_team_games) || 0),
            
            // Médias
            avg_solo_points: parseInt(row.avg_solo_points) || 0,
            avg_team_points: parseInt(row.avg_team_points) || 0,
            avg_solo_elo: parseInt(row.avg_solo_elo) || 0,
            avg_team_elo: parseInt(row.avg_team_elo) || 0,
            
            // Top scores
            max_solo_points: parseInt(row.max_solo_points) || 0,
            max_team_points: parseInt(row.max_team_points) || 0,
            
            // Distribuição por tier
            tier_distribution: {
                conquer: parseInt(row.conquer_players) || 0,
                diamond: parseInt(row.diamond_players) || 0,
                platinum_gold: parseInt(row.platinum_gold_players) || 0,
                silver_bronze: parseInt(row.silver_bronze_players) || 0,
                low_elo: parseInt(row.low_elo_players) || 0
            }
        };
        
        // Calcular percentuais
        result.solo_coverage = ((result.players_with_solo / result.total_players) * 100).toFixed(1);
        result.team_coverage = ((result.players_with_team / result.total_players) * 100).toFixed(1);
        result.clan_coverage = ((result.players_with_clan / result.total_players) * 100).toFixed(1);
        
        console.log('📊 Estatísticas calculadas:', result);
        console.log(`🏰 Clans reais no banco: ${totalRealClans}`);
        
        return result;
        
    } catch (error) {
        console.error('❌ Erro ao gerar estatísticas:', error);
        return null;
    }
}

// ROTA: Estatísticas da leaderboard - CORRIGIDA
app.get('/api/stats/leaderboard', async (req, res) => {
    try {
        const season = req.query.season || 'current';
        const seasonId = season === 'current' ? 12 : parseInt(season);
        
        console.log(`📊 Buscando estatísticas - Season ${seasonId}`);
        
        const stats = await getLeaderboardStats(seasonId);
        
        if (!stats) {
            return res.status(500).json({
                success: false,
                error: 'Erro ao gerar estatísticas'
            });
        }
        
        res.json({
            success: true,
            season: seasonId,
            stats: stats,
            last_updated: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erro na rota de estatísticas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// FUNÇÃO: Contar TODOS os players no banco por season
async function getTotalPlayersCount(mode, seasonId = 12) {
    try {
        const result = await pool.query(
            `SELECT COUNT(*) as count FROM leaderboard_cache WHERE name IS NOT NULL AND name != '' AND season_id = $1`,
            [seasonId]
        );
        const count = parseInt(result.rows[0].count);
        console.log(`📊 Total de players no banco (Season ${seasonId}): ${count}`);
        return count;
    } catch (error) {
        console.error('❌ Erro ao contar players:', error);
        return 0;
    }
}

// ✅ FUNÇÃO: Sincronizar NOVOS jogadores dos clans
async function syncNewPlayersFromClans() {
    try {
        console.log('🔄 Sincronizando NOVOS jogadores dos clans...');
        
        let syncedCount = 0;
        let errorCount = 0;
        const results = [];

        // Buscar todos os AOE4 World IDs dos membros dos clans que NÃO estão no cache
        const newPlayers = await pool.query(`
            SELECT DISTINCT 
                u.aoe4_world_id,
                u.discord_user_id,
                c.name as clan_name
            FROM clan_members cm
            JOIN clans c ON cm.clan_id = c.id
            JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id AND lc.season_id = 12
            WHERE u.aoe4_world_id IS NOT NULL 
            AND u.aoe4_world_id != ''
            AND lc.aoe4_world_id IS NULL  -- Apenas jogadores que NÃO estão no cache
            AND u.aoe4_world_id NOT LIKE 'temp_%'  -- Ignorar IDs temporários
        `);

        console.log(`📊 ${newPlayers.rows.length} novos jogadores de clans para sincronizar`);

        // Sincronizar cada novo jogador
        for (let i = 0; i < newPlayers.rows.length; i++) {
            const player = newPlayers.rows[i];
            
            try {
                console.log(`🔄 [${i + 1}/${newPlayers.rows.length}] Sincronizando jogador do clan: ${player.aoe4_world_id} (${player.clan_name})`);
                
                const success = await updatePlayerCache(player.aoe4_world_id);
                
                if (success) {
                    syncedCount++;
                    results.push({
                        aoe4_world_id: player.aoe4_world_id,
                        discord_user_id: player.discord_user_id,
                        clan: player.clan_name,
                        status: 'success'
                    });
                    console.log(`✅ ${player.aoe4_world_id} - Cache criado`);
                } else {
                    errorCount++;
                    results.push({
                        aoe4_world_id: player.aoe4_world_id,
                        discord_user_id: player.discord_user_id,
                        clan: player.clan_name,
                        status: 'error'
                    });
                    console.log(`❌ ${player.aoe4_world_id} - Erro na sincronização`);
                }

                // Delay para não sobrecarregar a API
                if (AUTO_UPDATE_CONFIG.delayBetweenRequests > 0 && i < newPlayers.rows.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, AUTO_UPDATE_CONFIG.delayBetweenRequests));
                }
                
            } catch (error) {
                errorCount++;
                results.push({
                    aoe4_world_id: player.aoe4_world_id,
                    discord_user_id: player.discord_user_id,
                    clan: player.clan_name,
                    status: 'error',
                    error: error.message
                });
                console.error(`💥 Erro em ${player.aoe4_world_id}:`, error.message);
            }
        }

        console.log(`✅ Sincronização de jogadores de clans concluída: ${syncedCount} sincronizados, ${errorCount} erros`);
        return { success: syncedCount, errors: errorCount, results };
        
    } catch (error) {
        console.error('💥 Erro na sincronização de jogadores de clans:', error);
        return { success: 0, errors: 1, results: [] };
    }
}

// FUNÇÃO ATUALIZADA: Atualização automática completa
async function startAutoCacheUpdate() {
  if (!AUTO_UPDATE_CONFIG.enabled) {
    console.log('⏸️ Atualização automática desativada');
    return;
  }

  try {
    console.log('🔄 INICIANDO ATUALIZAÇÃO AUTOMÁTICA COMPLETA...');
    
    // 1. PRIMEIRO: Sincronizar NOVOS USERS (do bot Discord)
    console.log('🎯 FASE 1: Sincronizando NOVOS USERS do bot Discord...');
    const newUsersStats = await syncNewUsersToCache();
    
    // 2. SEGUNDO: Sincronizar novos jogadores dos clans
    console.log('🎯 FASE 2: Sincronizando novos jogadores dos CLANS...');
    const newPlayersStats = await syncNewPlayersFromClans();
    
    // 3. TERCEIRO: Atualizar cache existente
    console.log('🎯 FASE 3: Atualizando cache EXISTENTE...');
    const updateStats = await performCacheUpdate();
    
    console.log(`✅ ATUALIZAÇÃO AUTOMÁTICA CONCLUÍDA:`);
    console.log(`   👤 ${newUsersStats.success} NOVOS users sincronizados`);
    console.log(`   🎮 ${newPlayersStats.success} novos jogadores de clans`);
    console.log(`   🔄 ${updateStats.success} caches atualizados`);
    console.log(`   ❌ ${newUsersStats.errors + newPlayersStats.errors + updateStats.errors} erros totais`);
    console.log(`⏰ Próxima atualização em ${AUTO_UPDATE_CONFIG.interval / 60000} minutos`);
    
  } catch (error) {
    console.error('❌ ERRO NA ATUALIZAÇÃO AUTOMÁTICA:', error);
  } finally {
    // Agendar próxima atualização
    setTimeout(startAutoCacheUpdate, AUTO_UPDATE_CONFIG.interval);
  }
}

// ROTA: Verificar users que precisam de sincronização INICIAL
app.get('/api/debug/users-needing-initial-sync', async (req, res) => {
    try {
        const users = await pool.query(`
            SELECT 
                u.id,
                u.discord_user_id,
                u.aoe4_world_id,
                u.created_at,
                u.discord_guild_id,
                COUNT(cm.clan_id) as clan_count,
                STRING_AGG(c.name, ', ') as clans
            FROM users u
            LEFT JOIN clan_members cm ON u.discord_user_id = cm.discord_user_id
            LEFT JOIN clans c ON cm.clan_id = c.id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id AND lc.season_id = 12
            WHERE u.aoe4_world_id IS NOT NULL 
            AND u.aoe4_world_id != ''
            AND u.aoe4_world_id NOT LIKE 'temp_%'
            AND lc.aoe4_world_id IS NULL  -- Não está no cache
            GROUP BY u.id, u.discord_user_id, u.aoe4_world_id, u.created_at, u.discord_guild_id
            ORDER BY u.created_at DESC
            LIMIT 100
        `);
        
        res.json({
            success: true,
            users_needing_sync: users.rows.length,
            users: users.rows
        });
        
    } catch (error) {
        console.error('❌ Erro ao listar users:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA: Forçar sincronização de NOVOS users
app.post('/api/admin/sync-new-users', async (req, res) => {
    try {
        console.log('🚀 Sincronização manual de NOVOS users acionada...');
        
        const syncStats = await syncNewUsersToCache();
        
        res.json({
            success: true,
            message: `Sincronização de novos users concluída: ${syncStats.success} sincronizados, ${syncStats.errors} erros`,
            stats: syncStats
        });
        
    } catch (error) {
        console.error('❌ Erro na sincronização manual:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// FUNÇÃO: Executar atualização do cache
async function performCacheUpdate() {
  let successCount = 0;
  let errorCount = 0;
  const results = [];

  try {
    // Buscar jogadores que precisam de atualização (CRITÉRIOS EXPANDIDOS)
    const playersToUpdate = await pool.query(`
      SELECT 
        aoe4_world_id, 
        name, 
        rm_solo_points,
        rm_team_points,
        rm_solo_elo,
        rm_team_elo,
        clan_tag,
        region,
        civilization,
        avatar_url,
        cached_at,
        season_id
      FROM leaderboard_cache 
      WHERE aoe4_world_id IS NOT NULL 
      AND name IS NOT NULL
      AND season_id = 12
      AND (
        -- CRITÉRIOS EXPANDIDOS para atualização:
        cached_at IS NULL 
        OR cached_at < NOW() - INTERVAL '2 hours'
        OR rm_solo_elo IS NULL 
        OR rm_solo_elo = 0 
        OR rm_solo_elo = rm_solo_points
        OR rm_solo_points = 0
        OR rm_team_points IS NULL
        OR rm_team_elo IS NULL
        OR clan_tag IS NULL
        OR region IS NULL
        OR civilization IS NULL
        OR avatar_url IS NULL
        OR last_solo_game IS NULL
        OR last_team_game IS NULL
      )
      ORDER BY 
        CASE 
          WHEN cached_at IS NULL THEN 1
          WHEN rm_solo_elo IS NULL OR rm_solo_elo = 0 THEN 2
          WHEN rm_solo_elo = rm_solo_points THEN 3
          WHEN avatar_url IS NULL THEN 4
          WHEN clan_tag IS NULL THEN 5
          ELSE 6
        END,
        cached_at ASC NULLS FIRST
      LIMIT $1
    `, [AUTO_UPDATE_CONFIG.maxPlayersPerUpdate]);

    console.log(`📊 ${playersToUpdate.rows.length} jogadores precisam de atualização`);

    // Atualizar em lotes menores
    for (let i = 0; i < playersToUpdate.rows.length; i++) {
      const player = playersToUpdate.rows[i];
      
      try {
        console.log(`🔄 [${i + 1}/${playersToUpdate.rows.length}] Atualizando ${player.name}...`);
        
        // ✅ USAR A NOVA FUNÇÃO DE ATUALIZAÇÃO COMPLETA
        const success = await updatePlayerCache(player.aoe4_world_id);
        
        if (success) {
          successCount++;
          results.push({
            name: player.name,
            aoe4_world_id: player.aoe4_world_id,
            status: 'success'
          });
        } else {
          errorCount++;
          results.push({
            name: player.name,
            aoe4_world_id: player.aoe4_world_id,
            status: 'error'
          });
        }

        // Delay para não sobrecarregar a API
        if (AUTO_UPDATE_CONFIG.delayBetweenRequests > 0 && i < playersToUpdate.rows.length - 1) {
          await new Promise(resolve => setTimeout(resolve, AUTO_UPDATE_CONFIG.delayBetweenRequests));
        }
        
      } catch (error) {
        errorCount++;
        results.push({
          name: player.name,
          aoe4_world_id: player.aoe4_world_id,
          status: 'error',
          error: error.message
        });
        console.error(`💥 Erro em ${player.name}:`, error.message);
      }
    }

    return { success: successCount, errors: errorCount, results };
    
  } catch (error) {
    console.error('💥 Erro na execução da atualização:', error);
    return { success: 0, errors: 1, results: [] };
  }
}

// FUNÇÃO: Verificar status do cache
async function getCacheStatus() {
  try {
    const status = await pool.query(`
      SELECT 
        COUNT(*) as total_players,
        COUNT(CASE WHEN cached_at > NOW() - INTERVAL '1 hour' THEN 1 END) as fresh_players,
        COUNT(CASE WHEN cached_at IS NULL OR cached_at < NOW() - INTERVAL '2 hours' THEN 1 END) as needs_refresh,
        COUNT(CASE WHEN rm_solo_elo IS NULL OR rm_solo_elo = 0 THEN 1 END) as missing_elo,
        COUNT(CASE WHEN rm_solo_elo = rm_solo_points THEN 1 END) as wrong_elo,
        COUNT(CASE WHEN avatar_url IS NULL THEN 1 END) as missing_avatar,
        COUNT(CASE WHEN clan_tag IS NULL THEN 1 END) as missing_clan,
        AVG(EXTRACT(EPOCH FROM (NOW() - cached_at))) as avg_cache_age_seconds
      FROM leaderboard_cache 
      WHERE name IS NOT NULL
      AND season_id = 12
    `);

    const stats = status.rows[0];
    
    return {
      total_players: parseInt(stats.total_players),
      fresh_players: parseInt(stats.fresh_players),
      needs_refresh: parseInt(stats.needs_refresh),
      missing_elo: parseInt(stats.missing_elo),
      wrong_elo: parseInt(stats.wrong_elo),
      missing_avatar: parseInt(stats.missing_avatar),
      missing_clan: parseInt(stats.missing_clan),
      avg_cache_age_seconds: Math.round(stats.avg_cache_age_seconds || 0),
      cache_health: ((parseInt(stats.fresh_players) / parseInt(stats.total_players)) * 100).toFixed(1) + '%'
    };
    
  } catch (error) {
    console.error('❌ Erro ao verificar status do cache:', error);
    return null;
  }
}

// ROTA: Status da atualização automática
app.get('/api/admin/auto-update/status', async (req, res) => {
  try {
    const cacheStatus = await getCacheStatus();
    
    res.json({
      success: true,
      auto_update: {
        enabled: AUTO_UPDATE_CONFIG.enabled,
        interval_minutes: AUTO_UPDATE_CONFIG.interval / 60000,
        next_update: new Date(Date.now() + AUTO_UPDATE_CONFIG.interval).toISOString(),
        config: AUTO_UPDATE_CONFIG
      },
      cache_status: cacheStatus
    });
    
  } catch (error) {
    console.error('❌ Erro no status da atualização:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ROTA: Configurar atualização automática
app.post('/api/admin/auto-update/config', async (req, res) => {
  try {
    const { enabled, interval_minutes, players_per_batch, delay_between_requests } = req.body;
    
    if (enabled !== undefined) AUTO_UPDATE_CONFIG.enabled = enabled;
    if (interval_minutes) AUTO_UPDATE_CONFIG.interval = interval_minutes * 60 * 1000;
    if (players_per_batch) AUTO_UPDATE_CONFIG.playersPerBatch = players_per_batch;
    if (delay_between_requests) AUTO_UPDATE_CONFIG.delayBetweenRequests = delay_between_requests;
    
    console.log('⚙️ Configuração de atualização automática atualizada:', AUTO_UPDATE_CONFIG);
    
    res.json({
      success: true,
      message: 'Configuração de atualização automática atualizada',
      config: AUTO_UPDATE_CONFIG,
      next_update: new Date(Date.now() + AUTO_UPDATE_CONFIG.interval).toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao configurar atualização:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ✅ FUNÇÃO: Sincronizar users NOVOS que nunca foram para o cache
async function syncNewUsersToCache() {
    try {
        console.log('🔄 Sincronizando USERS NOVOS para o cache...');
        
        let syncedCount = 0;
        let errorCount = 0;
        const results = [];

        // Buscar users que têm aoe4_world_id mas NÃO estão no cache
        const newUsers = await pool.query(`
            SELECT 
                u.discord_user_id,
                u.aoe4_world_id,
                u.created_at
            FROM users u
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id AND lc.season_id = 12
            WHERE u.aoe4_world_id IS NOT NULL 
            AND u.aoe4_world_id != ''
            AND u.aoe4_world_id NOT LIKE 'temp_%'
            AND lc.aoe4_world_id IS NULL  -- Não existe no cache
            AND u.created_at > NOW() - INTERVAL '30 days'  -- Users recentes
            ORDER BY u.created_at DESC
            LIMIT 50  -- Limitar por execução
        `);

        console.log(`📊 ${newUsers.rows.length} NOVOS users para sincronizar com cache`);

        // Sincronizar cada novo user
        for (let i = 0; i < newUsers.rows.length; i++) {
            const user = newUsers.rows[i];
            
            try {
                console.log(`🔄 [${i + 1}/${newUsers.rows.length}] Sincronizando user: ${user.aoe4_world_id} (Discord: ${user.discord_user_id})`);
                
                const success = await updatePlayerCache(user.aoe4_world_id);
                
                if (success) {
                    syncedCount++;
                    results.push({
                        discord_user_id: user.discord_user_id,
                        aoe4_world_id: user.aoe4_world_id,
                        status: 'success',
                        created_at: user.created_at
                    });
                    console.log(`✅ ${user.aoe4_world_id} - Cache criado com sucesso`);
                } else {
                    errorCount++;
                    results.push({
                        discord_user_id: user.discord_user_id,
                        aoe4_world_id: user.aoe4_world_id,
                        status: 'error',
                        created_at: user.created_at
                    });
                    console.log(`❌ ${user.aoe4_world_id} - Erro na sincronização`);
                }

                // Delay para não sobrecarregar a API
                if (AUTO_UPDATE_CONFIG.delayBetweenRequests > 0 && i < newUsers.rows.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, AUTO_UPDATE_CONFIG.delayBetweenRequests));
                }
                
            } catch (error) {
                errorCount++;
                results.push({
                    discord_user_id: user.discord_user_id,
                    aoe4_world_id: user.aoe4_world_id,
                    status: 'error',
                    error: error.message,
                    created_at: user.created_at
                });
                console.error(`💥 Erro em ${user.aoe4_world_id}:`, error.message);
            }
        }

        console.log(`✅✅✅ Sincronização de NOVOS users concluída!`);
        console.log(`   ✅ ${syncedCount} novos users sincronizados`);
        console.log(`   ❌ ${errorCount} erros`);

        return { success: syncedCount, errors: errorCount, results };
        
    } catch (error) {
        console.error('💥 Erro na sincronização de novos users:', error);
        return { success: 0, errors: 1, results: [] };
    }
}

// ROTA: Forçar atualização imediata
app.post('/api/admin/auto-update/trigger', async (req, res) => {
  try {
    console.log('🚀 Atualização manual acionada via API...');
    
    const updateStats = await performCacheUpdate();
    
    res.json({
      success: true,
      message: `Atualização manual concluída: ${updateStats.success} sucessos, ${updateStats.errors} erros`,
      stats: updateStats,
      cache_status: await getCacheStatus()
    });
    
  } catch (error) {
    console.error('❌ Erro na atualização manual:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ROTA: Verificar dados completos de um player no cache
app.get('/api/debug/player-cache/:playerId', async (req, res) => {
    try {
        const playerId = req.params.playerId;
        
        console.log(`🔍 Verificando cache do player ${playerId}...`);
        
        // Buscar dados atuais do cache
        const cacheData = await pool.query(`
            SELECT 
                user_id, name, aoe4_world_id,
                rm_solo_points, rm_solo_elo, rm_solo_wins, rm_solo_total_matches,
                rm_team_points, rm_team_elo, rm_team_wins, rm_team_total_matches,
                clan_tag, region, civilization, avatar_url,
                last_solo_game, last_team_game, cached_at,
                level, season_id
            FROM leaderboard_cache 
            WHERE aoe4_world_id = $1
            AND season_id = 12
        `, [playerId]);
        
        if (cacheData.rows.length === 0) {
            return res.json({
                success: false,
                message: 'Player não encontrado no cache'
            });
        }
        
        const playerCache = cacheData.rows[0];
        
        res.json({
            success: true,
            cache_data: playerCache,
            last_updated: playerCache.cached_at,
            cache_age: Math.round((new Date() - new Date(playerCache.cached_at)) / (1000 * 60)) + ' minutos'
        });
        
    } catch (error) {
        console.error('❌ Erro ao verificar cache:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA: Atualizar ELO em lote para todos os jogadores - ATUALIZADA
app.post('/api/players/update-all-elo', async (req, res) => {
    try {
        const limit = parseInt(req.body.limit) || 10;
        const delay = parseInt(req.body.delay) || 1500; 
        
        console.log(`🚀 Iniciando atualização COMPLETA do cache para ${limit} jogadores...`);
        
        const playersToUpdate = await pool.query(`
            SELECT DISTINCT aoe4_world_id, name, rm_solo_points
            FROM leaderboard_cache 
            WHERE aoe4_world_id IS NOT NULL 
            AND name IS NOT NULL
            AND season_id = 12
            ORDER BY rm_solo_points DESC NULLS LAST
            LIMIT $1
        `, [limit]);
        
        console.log(`📊 ${playersToUpdate.rows.length} jogadores para atualizar`);
        
        const results = [];
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < playersToUpdate.rows.length; i++) {
            const player = playersToUpdate.rows[i];
            try {
                console.log(`🔄 [${i + 1}/${playersToUpdate.rows.length}] Atualizando ${player.name}...`);
                
                // ✅ USAR A NOVA FUNÇÃO DE ATUALIZAÇÃO COMPLETA
                const success = await updatePlayerCache(player.aoe4_world_id);
                
                if (success) {
                    successCount++;
                    results.push({
                        name: player.name,
                        aoe4_world_id: player.aoe4_world_id,
                        status: 'success'
                    });
                    console.log(`✅ ${player.name} - Cache atualizado`);
                } else {
                    errorCount++;
                    results.push({
                        name: player.name,
                        aoe4_world_id: player.aoe4_world_id,
                        status: 'error'
                    });
                    console.log(`❌ ${player.name} - Erro na atualização`);
                }
                
                // Delay para não sobrecarregar a API
                if (delay > 0 && i < playersToUpdate.rows.length - 1) {
                    console.log(`⏳ Aguardando ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
            } catch (error) {
                errorCount++;
                results.push({
                    name: player.name,
                    aoe4_world_id: player.aoe4_world_id,
                    status: 'error',
                    error: error.message
                });
                console.error(`💥 Erro em ${player.name}:`, error.message);
            }
        }
        
        console.log(`✅✅✅ Atualização do cache concluída!`);
        console.log(`   ✅ ${successCount} atualizados com sucesso`);
        console.log(`   ❌ ${errorCount} erros`);
        
        res.json({
            success: true,
            message: `Atualização do cache concluída: ${successCount}/${playersToUpdate.rows.length} jogadores`,
            stats: {
                total_processed: playersToUpdate.rows.length,
                success: successCount,
                errors: errorCount,
                success_rate: ((successCount / playersToUpdate.rows.length) * 100).toFixed(1) + '%'
            },
            results: results.slice(0, 20)
        });
        
    } catch (error) {
        console.error('❌ Erro na atualização em lote:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========== FUNÇÕES DE CLANS CORRIGIDAS ==========

// ROTA: Encontrar jogadores sem dados
app.get('/api/debug/players-without-data', async (req, res) => {
    try {
        const clanId = req.query.clanId; // Opcional: filtrar por clan específico
        
        console.log(`🔍 Buscando jogadores sem dados${clanId ? ` no clan ${clanId}` : ''}...`);
        
        let query = `
            SELECT 
                cm.discord_user_id,
                cm.clan_id,
                c.name as clan_name,
                c.tag as clan_tag,
                u.aoe4_world_id,
                lc.name as player_name,
                lc.rm_solo_points,
                lc.rm_solo_elo,
                lc.rm_team_points,
                lc.rm_team_elo,
                lc.avatar_url,
                cm.joined_at,
                cm.is_owner
            FROM clan_members cm
            JOIN clans c ON cm.clan_id = c.id
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id
            WHERE (lc.name IS NULL OR lc.name = '' OR lc.name = 'Unknown Player')
               OR (lc.rm_solo_points IS NULL OR lc.rm_solo_points = 0)
               OR (u.aoe4_world_id IS NULL OR u.aoe4_world_id = '')
        `;
        
        const params = [];
        if (clanId) {
            query += ` AND cm.clan_id = $1`;
            params.push(clanId);
        }
        
        query += ` ORDER BY c.name, cm.discord_user_id`;
        
        const result = await pool.query(query, params);
        
        console.log(`📊 Encontrados ${result.rows.length} jogadores sem dados`);
        
        // Agrupar por clan para melhor visualização
        const groupedByClan = {};
        result.rows.forEach(player => {
            if (!groupedByClan[player.clan_name]) {
                groupedByClan[player.clan_name] = [];
            }
            groupedByClan[player.clan_name].push(player);
        });
        
        res.json({
            success: true,
            total_players_without_data: result.rows.length,
            players_by_clan: groupedByClan,
            all_players: result.rows
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar jogadores sem dados:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA: Verificar dados específicos de um membro
app.get('/api/debug/player-details/:discordUserId', async (req, res) => {
    try {
        const discordUserId = req.params.discordUserId;
        
        console.log(`🔍 Verificando dados do jogador: ${discordUserId}`);
        
        const result = await pool.query(`
            SELECT 
                -- Dados do clan_members
                cm.discord_user_id,
                cm.clan_id,
                cm.joined_at,
                cm.is_owner,
                
                -- Dados do clan
                c.name as clan_name,
                c.tag as clan_tag,
                
                -- Dados do users
                u.aoe4_world_id,
                u.created_at as user_created,
                
                -- Dados do leaderboard_cache
                lc.name as player_name,
                lc.avatar_url,
                lc.rm_solo_points,
                lc.rm_solo_elo,
                lc.rm_solo_wins,
                lc.rm_solo_total_matches,
                lc.rm_team_points,
                lc.rm_team_elo,
                lc.rm_team_wins,
                lc.rm_team_total_matches,
                lc.region,
                lc.civilization,
                lc.cached_at,
                lc.last_solo_game,
                lc.last_team_game
                
            FROM clan_members cm
            JOIN clans c ON cm.clan_id = c.id
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id
            WHERE cm.discord_user_id = $1
        `, [discordUserId]);
        
        if (result.rows.length === 0) {
            return res.json({
                success: false,
                message: 'Jogador não encontrado no clan_members'
            });
        }
        
        const playerData = result.rows[0];
        
        // Determinar status dos dados
        const dataStatus = {
            has_user_entry: !!playerData.aoe4_world_id,
            has_leaderboard_data: !!playerData.player_name,
            has_solo_data: !!(playerData.rm_solo_points && playerData.rm_solo_points > 0),
            has_team_data: !!(playerData.rm_team_points && playerData.rm_team_points > 0),
            is_owner: playerData.is_owner,
            data_age: playerData.cached_at ? 
                Math.round((new Date() - new Date(playerData.cached_at)) / (1000 * 60 * 60)) + ' horas' : 
                'Nunca atualizado'
        };
        
        res.json({
            success: true,
            player_data: playerData,
            data_status: dataStatus,
            issues: {
                missing_aoe4_id: !playerData.aoe4_world_id,
                missing_leaderboard_data: !playerData.player_name,
                missing_solo_data: !dataStatus.has_solo_data,
                missing_team_data: !dataStatus.has_team_data
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao verificar jogador:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ FUNÇÃO CORRIGIDA: Buscar clans do banco COM MEMBROS ÚNICOS
async function getClansFromDatabase(limit = 10) {
    try {
        console.log(`🏰 Buscando top ${limit} clans do banco...`);
        
        const query = `
            SELECT 
                c.id as clan_id,
                c.name,
                c.tag,
                c.description,
                c.discord_guild_id,
                c.owner_id,
                COUNT(DISTINCT cm.discord_user_id) as member_count,  -- ✅ CORRIGIDO: COUNT DISTINCT
                COUNT(lc.aoe4_world_id) as players_with_data,
                AVG(COALESCE(lc.rm_solo_points, 0)) as avg_solo_points,
                AVG(COALESCE(lc.rm_team_points, 0)) as avg_team_points,
                MAX(COALESCE(lc.rm_solo_points, 0)) as max_solo_points,
                STRING_AGG(
                    DISTINCT CASE 
                        WHEN lc.name IS NOT NULL AND lc.rm_solo_points > 0 
                        THEN lc.name || ' (' || lc.rm_solo_points || ' pts)'
                    END, 
                    ', '
                ) as top_players,
                MIN(cm.joined_at) as created_at
            FROM clans c
            LEFT JOIN clan_members cm ON c.id = cm.clan_id
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id
            WHERE c.name IS NOT NULL 
            AND c.name != ''
            GROUP BY c.id, c.name, c.tag, c.description, c.discord_guild_id, c.owner_id
            HAVING COUNT(DISTINCT cm.discord_user_id) > 0  -- ✅ CORRIGIDO: COUNT DISTINCT
            ORDER BY 
                avg_solo_points DESC NULLS LAST,
                COUNT(DISTINCT cm.discord_user_id) DESC,   -- ✅ CORRIGIDO: COUNT DISTINCT
                max_solo_points DESC NULLS LAST
            LIMIT $1
        `;
        
        const result = await pool.query(query, [limit]);
        console.log(`✅ ${result.rows.length} clans encontrados`);
        
        return result.rows;
        
    } catch (error) {
        console.error('❌ Erro ao buscar clans:', error);
        return [];
    }
}

// ROTA: Debug completo de um jogador específico
app.get('/api/debug/player-detailed-stats/:aoe4WorldId', async (req, res) => {
    try {
        const aoe4WorldId = req.params.aoe4WorldId;
        
        console.log(`🔍 Debug detalhado do jogador ${aoe4WorldId}...`);
        
        // Buscar dados de TODAS as seasons
        const allSeasons = await pool.query(`
            SELECT 
                season_id,
                name,
                rm_solo_points,
                rm_solo_elo,
                rm_solo_wins,
                rm_solo_total_matches,
                rm_team_points,
                rm_team_elo, 
                rm_team_wins,
                rm_team_total_matches,
                cached_at,
                last_solo_game,
                last_team_game
            FROM leaderboard_cache 
            WHERE aoe4_world_id = $1
            ORDER BY season_id DESC, cached_at DESC
        `, [aoe4WorldId]);
        
        // Buscar dados do user e clan
        const userClanData = await pool.query(`
            SELECT 
                u.discord_user_id,
                u.aoe4_world_id,
                c.name as clan_name,
                c.id as clan_id,
                cm.joined_at
            FROM users u
            LEFT JOIN clan_members cm ON u.discord_user_id = cm.discord_user_id
            LEFT JOIN clans c ON cm.clan_id = c.id
            WHERE u.aoe4_world_id = $1
        `, [aoe4WorldId]);
        
        res.json({
            success: true,
            aoe4_world_id: aoe4WorldId,
            user_clan_data: userClanData.rows,
            seasons_data: allSeasons.rows,
            summary: {
                total_seasons: allSeasons.rows.length,
                season_12_data: allSeasons.rows.find(row => row.season_id === 12),
                latest_data: allSeasons.rows[0]
            }
        });
        
    } catch (error) {
        console.error('❌ Erro no debug detalhado:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ FUNÇÃO CORRIGIDA: Buscar clans populares APENAS Season 12
async function getPopularClans(limit = 6) {
    try {
        console.log(`👥 Buscando ${limit} clans populares (Season 12)...`);
        
        const query = `
            SELECT 
                c.id as clan_id,
                c.name,
                c.tag,
                c.description,
                COUNT(DISTINCT cm.discord_user_id) as member_count,
                COUNT(lc.aoe4_world_id) as players_with_data,
                AVG(COALESCE(lc.rm_solo_points, 0)) as avg_solo_points,
                MAX(COALESCE(lc.rm_solo_points, 0)) as max_solo_points,
                STRING_AGG(
                    DISTINCT CASE 
                        WHEN lc.name IS NOT NULL 
                        THEN lc.name
                    END, 
                    ', '
                ) as member_names
            FROM clans c
            LEFT JOIN clan_members cm ON c.id = cm.clan_id
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id AND lc.season_id = 12  -- ✅ FILTRO SEASON 12
            WHERE c.name IS NOT NULL 
            AND c.name != ''
            GROUP BY c.id, c.name, c.tag, c.description
            HAVING COUNT(DISTINCT cm.discord_user_id) > 0
            ORDER BY 
                member_count DESC,
                players_with_data DESC,
                avg_solo_points DESC NULLS LAST
            LIMIT $1
        `;
        
        const result = await pool.query(query, [limit]);
        console.log(`✅ ${result.rows.length} clans populares encontrados (Season 12)`);
        
        return result.rows;
        
    } catch (error) {
        console.error('❌ Erro ao buscar clans populares:', error);
        return [];
    }
}

// ✅ FUNÇÃO CORRIGIDA: Membros do clan APENAS Season 12
async function getClanMembersFixed(clanId, limit = 50) {
    try {
        console.log(`🔍 Buscando membros do clan ${clanId} (Season 12)...`);
        
        const query = `
            SELECT DISTINCT ON (cm.discord_user_id)
                -- Dados básicos do member
                cm.discord_user_id,
                cm.joined_at,
                cm.is_owner,
                
                -- Dados do usuário (ponte)
                u.aoe4_world_id,
                
                -- Dados do player do leaderboard_cache (APENAS SEASON 12)
                lc.user_id,
                lc.name,
                lc.avatar_url,
                lc.clan_tag,
                lc.region,
                lc.civilization,
                
                -- Dados Solo Ranked (SEASON 12)
                lc.rm_solo_points,
                lc.rm_solo_elo,
                lc.rm_solo_wins,
                lc.rm_solo_total_matches,
                lc.last_solo_game,
                
                -- Dados Team Ranked (SEASON 12)
                lc.rm_team_points,
                lc.rm_team_elo,
                lc.rm_team_wins,
                lc.rm_team_total_matches,
                lc.last_team_game,
                
                -- Calcular level baseado nos pontos SOLO (SEASON 12)
                CASE 
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 1600 THEN 'Conquer 3'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 1500 THEN 'Conquer 2'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 1400 THEN 'Conquer 1'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 1350 THEN 'Diamante 3'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 1300 THEN 'Diamante 2'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 1200 THEN 'Diamante 1'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 1150 THEN 'Platina 3'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 1100 THEN 'Platina 2'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 1000 THEN 'Platina 1'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 900 THEN 'Ouro 3'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 800 THEN 'Ouro 2'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 700 THEN 'Ouro 1'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 600 THEN 'Prata 3'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 550 THEN 'Prata 2'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 500 THEN 'Prata 1'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 450 THEN 'Bronze 3'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 400 THEN 'Bronze 2'
                    ELSE 'Bronze 1'
                END as level

            FROM clan_members cm
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id AND lc.season_id = 12  -- ✅ FILTRO SEASON 12
            WHERE cm.clan_id = $1
            ORDER BY cm.discord_user_id, cm.is_owner DESC, COALESCE(lc.rm_solo_points, 0) DESC
            LIMIT $2
        `;
        
        const result = await pool.query(query, [clanId, limit]);
        console.log(`✅ Encontrados ${result.rows.length} membros únicos para o clan ${clanId} (Season 12)`);
        
        return result.rows;
        
    } catch (error) {
        console.error('❌ Erro ao buscar membros do clan:', error);
        return [];
    }
}

// ✅ FUNÇÃO CORRIGIDA: Detalhes do clan APENAS Season 12
async function getClanDetails(clanId) {
    try {
        const query = `
            SELECT 
                c.*,
                COUNT(DISTINCT cm.discord_user_id) as total_members,
                COUNT(lc.aoe4_world_id) as players_with_data,
                AVG(COALESCE(lc.rm_solo_points, 0)) as avg_solo_points,
                AVG(COALESCE(lc.rm_team_points, 0)) as avg_team_points,
                MAX(COALESCE(lc.rm_solo_points, 0)) as max_solo_points,
                MAX(COALESCE(lc.rm_team_points, 0)) as max_team_points,
                
                -- ✅ ESTATÍSTICAS REAIS DO CLAN (SEASON 12)
                COUNT(CASE WHEN lc.rm_solo_points >= 1400 THEN 1 END) as conquer_diamond_players,
                COUNT(CASE WHEN lc.rm_solo_points >= 1000 AND lc.rm_solo_points < 1400 THEN 1 END) as platinum_gold_players,
                COUNT(CASE WHEN lc.rm_solo_points >= 500 AND lc.rm_solo_points < 1000 THEN 1 END) as silver_bronze_players,
                COUNT(CASE WHEN lc.rm_solo_points < 500 AND lc.rm_solo_points > 0 THEN 1 END) as low_elo_players,
                COUNT(CASE WHEN lc.rm_solo_points IS NULL OR lc.rm_solo_points = 0 THEN 1 END) as unranked_players,
                
                STRING_AGG(
                    DISTINCT CASE 
                        WHEN lc.name IS NOT NULL AND lc.rm_solo_points > 0 
                        THEN lc.name || ' (' || lc.rm_solo_points || ' pts)'
                    END, 
                    ' | '
                ) as top_players_list
            FROM clans c
            LEFT JOIN clan_members cm ON c.id = cm.clan_id
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id AND lc.season_id = 12  -- ✅ FILTRO SEASON 12
            WHERE c.id = $1
            GROUP BY c.id
        `;
        
        const result = await pool.query(query, [clanId]);
        return result.rows[0] || null;
        
    } catch (error) {
        console.error('❌ Erro ao buscar detalhes do clan:', error);
        return null;
    }
}

// ✅ FUNÇÃO CORRIGIDA: Estatísticas gerais de clans
async function getClanStats() {
    try {
        const query = `
            SELECT 
                COUNT(DISTINCT c.id) as total_clans,
                COUNT(DISTINCT cm.discord_user_id) as total_clan_members,
                COUNT(DISTINCT lc.aoe4_world_id) as clan_members_with_data,
                AVG(clan_stats.avg_points) as overall_avg_points,
                MAX(clan_stats.max_points) as overall_max_points,
                AVG(clan_stats.member_count) as avg_members_per_clan
            FROM clans c
            LEFT JOIN clan_members cm ON c.id = cm.clan_id
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id
            CROSS JOIN LATERAL (
                SELECT 
                    COUNT(cm2.discord_user_id) as member_count,
                    AVG(COALESCE(lc2.rm_solo_points, 0)) as avg_points,
                    MAX(COALESCE(lc2.rm_solo_points, 0)) as max_points
                FROM clan_members cm2
                LEFT JOIN users u2 ON cm2.discord_user_id = u2.discord_user_id
                LEFT JOIN leaderboard_cache lc2 ON u2.aoe4_world_id = lc2.aoe4_world_id
                WHERE cm2.clan_id = c.id
            ) as clan_stats
            WHERE c.name IS NOT NULL
        `;
        
        const result = await pool.query(query);
        return result.rows[0] || null;
        
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas de clans:', error);
        return null;
    }
}

// ========== ROTAS DE CLANS CORRIGIDAS ==========

// ROTA: Clans em destaque (para a home)
app.get('/api/clans/featured', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 6;
        
        const featuredClans = await getPopularClans(limit);
        
        res.json({
            success: true,
            clans: featuredClans,
            featured_count: featuredClans.length
        });
        
    } catch (error) {
        console.error('❌ Erro na rota /api/clans/featured:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA: Todos os clans (paginação)
app.get('/api/clans', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 12;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;
        
        const clans = await getClansFromDatabase(limit);
        
        // Contar total de clans
        const totalQuery = await pool.query('SELECT COUNT(*) as count FROM clans WHERE name IS NOT NULL AND name != \'\'');
        const totalClans = parseInt(totalQuery.rows[0].count);
        
        res.json({
            success: true,
            clans: clans,
            pagination: {
                current_page: page,
                clans_per_page: limit,
                total_clans: totalClans,
                total_pages: Math.ceil(totalClans / limit)
            }
        });
        
    } catch (error) {
        console.error('❌ Erro na rota /api/clans:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA: Detalhes de um clan específico
app.get('/api/clans/:clanId', async (req, res) => {
    try {
        const clanId = parseInt(req.params.clanId);
        
        const clanDetails = await getClanDetails(clanId);
        const clanMembers = await getClanMembersFixed(clanId);
        
        if (!clanDetails) {
            return res.status(404).json({
                success: false,
                error: 'Clan não encontrado'
            });
        }
        
        res.json({
            success: true,
            clan: clanDetails,
            members: clanMembers,
            stats: {
                total_members: clanDetails.total_members || 0,
                players_with_data: clanDetails.players_with_data || 0,
                data_coverage: clanDetails.total_members > 0 ? 
                    Math.round((clanDetails.players_with_data / clanDetails.total_members) * 100) : 0,
                avg_solo_points: Math.round(clanDetails.avg_solo_points || 0),
                avg_team_points: Math.round(clanDetails.avg_team_points || 0),
                max_solo_points: clanDetails.max_solo_points || 0,
                max_team_points: clanDetails.max_team_points || 0,
                conquer_diamond_players: clanDetails.conquer_diamond_players || 0,
                platinum_gold_players: clanDetails.platinum_gold_players || 0
            }
        });
        
    } catch (error) {
        console.error('❌ Erro na rota /api/clans/:clanId:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA: Estatísticas de clans
app.get('/api/clans/stats/overview', async (req, res) => {
    try {
        const clanStats = await getClanStats();
        
        res.json({
            success: true,
            stats: clanStats
        });
        
    } catch (error) {
        console.error('❌ Erro na rota /api/clans/stats/overview:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========== ROTAS DE DIAGNÓSTICO ==========

// ROTA: Diagnóstico completo do sistema
app.get('/api/debug/system-status', async (req, res) => {
    try {
        // 1. Status das tabelas
        const tableStats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM clans) as total_clans,
                (SELECT COUNT(*) FROM clan_members) as total_clan_members,
                (SELECT COUNT(*) FROM leaderboard_cache) as total_cached_players,
                (SELECT COUNT(DISTINCT aoe4_world_id) FROM leaderboard_cache WHERE aoe4_world_id IS NOT NULL) as unique_cached_players
        `);
        
        // 2. Conexões entre tabelas
        const connectionStats = await pool.query(`
            SELECT 
                COUNT(DISTINCT cm.discord_user_id) as total_clan_members,
                COUNT(DISTINCT u.discord_user_id) as members_with_user_entry,
                COUNT(DISTINCT lc.aoe4_world_id) as members_with_leaderboard_data,
                ROUND((COUNT(DISTINCT u.discord_user_id)::decimal / COUNT(DISTINCT cm.discord_user_id) * 100), 1) as user_link_percentage,
                ROUND((COUNT(DISTINCT lc.aoe4_world_id)::decimal / COUNT(DISTINCT cm.discord_user_id) * 100), 1) as leaderboard_link_percentage
            FROM clan_members cm
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id
        `);
        
        // 3. Clans com mais dados
        const topClans = await pool.query(`
            SELECT 
                c.id,
                c.name,
                c.tag,
                COUNT(cm.discord_user_id) as member_count,
                COUNT(u.aoe4_world_id) as members_with_aoe4_id,
                COUNT(lc.aoe4_world_id) as members_with_data
            FROM clans c
            LEFT JOIN clan_members cm ON c.id = cm.clan_id
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id
            GROUP BY c.id, c.name, c.tag
            ORDER BY members_with_data DESC
            LIMIT 10
        `);
        
        res.json({
            success: true,
            system_status: {
                tables: tableStats.rows[0],
                connections: connectionStats.rows[0],
                top_clans: topClans.rows
            }
        });
        
    } catch (error) {
        console.error('❌ Erro no diagnóstico:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA: Diagnóstico completo dos vínculos do clan
app.get('/api/debug/clan-link-diagnosis/:clanId', async (req, res) => {
    try {
        const clanId = parseInt(req.params.clanId);
        
        console.log(`🔍 Diagnóstico completo para clan ${clanId}`);
        
        // 1. Clan básico
        const clan = await pool.query('SELECT * FROM clans WHERE id = $1', [clanId]);
        
        // 2. Membros no clan_members
        const clanMembers = await pool.query(
            'SELECT * FROM clan_members WHERE clan_id = $1', 
            [clanId]
        );
        
        // 3. Vínculos com users
        const userLinks = await pool.query(`
            SELECT 
                cm.discord_user_id,
                u.aoe4_world_id,
                u.created_at as user_created
            FROM clan_members cm
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            WHERE cm.clan_id = $1
        `, [clanId]);
        
        // 4. Dados completos via leaderboard_cache
        const fullData = await pool.query(`
            SELECT 
                cm.discord_user_id,
                u.aoe4_world_id,
                lc.name,
                lc.rm_solo_points,
                lc.rm_solo_elo
            FROM clan_members cm
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id
            WHERE cm.clan_id = $1
        `, [clanId]);
        
        res.json({
            success: true,
            diagnosis: {
                clan: clan.rows[0] || null,
                clan_members: {
                    total: clanMembers.rows.length,
                    members: clanMembers.rows.map(m => m.discord_user_id)
                },
                user_links: {
                    total_linked: userLinks.rows.filter(u => u.aoe4_world_id).length,
                    total_unlinked: userLinks.rows.filter(u => !u.aoe4_world_id).length,
                    details: userLinks.rows
                },
                leaderboard_data: {
                    total_with_data: fullData.rows.filter(f => f.name).length,
                    details: fullData.rows
                },
                summary: {
                    total_members: clanMembers.rows.length,
                    with_user_link: userLinks.rows.filter(u => u.aoe4_world_id).length,
                    with_leaderboard_data: fullData.rows.filter(f => f.name).length,
                    success_rate: `${((fullData.rows.filter(f => f.name).length / clanMembers.rows.length) * 100).toFixed(1)}%`
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Erro no diagnóstico:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========== ROTAS EXISTENTES ==========

// ROTA: Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend AOE4 Rankings está funcionando',
    timestamp: new Date().toISOString(),
    data_source: 'DATABASE_EXCLUSIVE',
    features: {
      seasons: true,
      local_players: true,
      multiple_seasons: true,
      auto_cache_update: AUTO_UPDATE_CONFIG.enabled,
      clans: true
    }
  });
});

// FUNÇÃO PRINCIPAL: APENAS BANCO LOCAL
async function getPlayersWithModeFilter(limit = 25, offset = 0, mode = 'rm_solo', season = '12') {
    try {
        const seasonId = season === 'current' ? 12 : parseInt(season);
        
        // Validar se a season existe (1-12)
        if (seasonId < 1 || seasonId > 12) {
            console.log(`❌ Season ${seasonId} inválida. Usando season 12.`);
            seasonId = 12;
        }
        
        console.log(`🎯 Buscando players - Season: ${seasonId}, Modo: ${mode}, Limit: ${limit}, Offset: ${offset}`);
        
        const dbPlayers = await getPlayersFromDatabase(limit, offset, mode, seasonId);
        
        if (dbPlayers.length > 0) {
            const total = await getTotalPlayersCount(mode, seasonId);
            console.log(`✅ ${dbPlayers.length} players da season ${seasonId}`);
            
            return {
                players: dbPlayers,
                total: total,
                _source: 'database'
            };
        }
        
        console.log('💥 Nenhum player encontrado para esta season');
        return { players: [], total: 0 };
        
    } catch (error) {
        console.error('💥 Erro crítico:', error);
        return { players: [], total: 0 };
    }
}

// ROTA PRINCIPAL: Buscar players
app.get('/api/players', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const season = req.query.season || 'current';
        const mode = req.query.mode || 'rm_solo';
        
        const offset = (page - 1) * limit;
        
        console.log(`📄 Requisição: season ${season}, página ${page}, limite ${limit}, modo ${mode}`);
        
        const { players, total } = await getPlayersWithModeFilter(limit, offset, mode, season);
        
        const totalPages = Math.ceil(total / limit);
        
        res.json({
            success: true,
            players: players,
            pagination: {
                current_page: page,
                total_pages: totalPages,
                total_players: total,
                players_per_page: limit,
                has_next: page < totalPages,
                has_prev: page > 1
            },
            filters: {
                season: season,
                mode: mode
            },
            data_source: 'database'
        });
        
    } catch (error) {
        console.error('❌ Erro na rota /api/players:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// ROTA: Seasons
app.get('/api/seasons', async (req, res) => {
  try {
    const seasons = await getSeasonsFromAoe4World();
    res.json({ success: true, seasons: seasons });
  } catch (error) {
    console.error('❌ Erro na rota /api/seasons:', error);
    res.status(500).json({ success: false, error: 'Erro ao carregar temporadas' });
  }
});

// ROTA: Game modes
app.get('/api/game-modes', (req, res) => {
  res.json({
    success: true,
    game_modes: [
      { id: 'rm_solo', name: 'Classificação solo', description: 'Ranked 1v1' },
      { id: 'rm_team', name: 'Classificação em equipe', description: 'Ranked em equipe' }
    ]
  });
});


// Rota raiz explícita
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>AOE4 Brasil</title>
        <meta http-equiv="refresh" content="0; url=/index.html">
    </head>
    <body>
        <p>Redirecionando para o site...</p>
    </body>
    </html>
  `);
});

// OU simplesmente sirva o index.html diretamente
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/frontend/index.html');
});

app.use(express.static('frontend'));


// Inicialização do servidor
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Backend AOE4 rodando na porta ${PORT}`);
    console.log(`🎯🎯🎯 CONFIGURAÇÃO: EXCLUSIVAMENTE BANCO DE DADOS LOCAL 🎯🎯🎯`);
    console.log(`🎮 Sistema de Seasons: ATIVADO`);
    console.log(`🏰 Sistema de Clans: ATIVADO`);
    console.log(`🔄 Atualização Automática: ${AUTO_UPDATE_CONFIG.enabled ? 'ATIVADA' : 'DESATIVADA'}`);
    console.log(`🏥 Health: http://localhost:${PORT}/health`);
    console.log(`🎮 Players: http://localhost:${PORT}/api/players`);
    console.log(`🏰 Clans: http://localhost:${PORT}/api/clans/featured`);
     console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🌐 URL: http://0.0.0.0:${PORT}`);
    
    // Testar conexão
    await testConnection();
    
    // Iniciar atualização automática
    if (AUTO_UPDATE_CONFIG.enabled) {
        console.log(`🔄 ATUALIZAÇÃO AUTOMÁTICA ATIVADA: ${AUTO_UPDATE_CONFIG.interval / 60000} minutos`);
        console.log(`⏰ Primeira atualização em 1 minuto...`);
        
        // Primeira execução em 1 minuto, depois a cada 30 minutos
        setTimeout(() => {
            startAutoCacheUpdate();
        }, 60000);
    }
    
    console.log('\n✅✅✅ Sistema configurado para usar APENAS BANCO DE DADOS LOCAL ✅✅✅');
    console.log('🎮 Sistema de Seasons totalmente funcional!');
    console.log('🏰 Sistema de Clans totalmente funcional!');
    console.log('🔄 Sistema de atualização automática configurado!');
});

// Testar conexão com o banco
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Conectado ao PostgreSQL:', result.rows[0].current_time);
    
    // Verificar quantos players temos no banco
    const countResult = await pool.query('SELECT COUNT(*) as count FROM leaderboard_cache WHERE name IS NOT NULL');
    console.log(`📊 Banco possui ${countResult.rows[0].count} players no total`);
    
    // Verificar por seasons
    const seasonsCount = await pool.query('SELECT season_id, COUNT(*) as count FROM leaderboard_cache WHERE name IS NOT NULL GROUP BY season_id ORDER BY season_id DESC');
    console.log('📊 Distribuição por seasons:');
    seasonsCount.rows.forEach(row => {
        console.log(`   Season ${row.season_id}: ${row.count} players`);
    });
    
    // Verificar clans
    const clansCount = await pool.query('SELECT COUNT(*) as count FROM clans WHERE name IS NOT NULL AND name != \'\'');
    console.log(`🏰 Banco possui ${clansCount.rows[0].count} clans`);
    
    const clanMembersCount = await pool.query('SELECT COUNT(*) as count FROM clan_members');
    console.log(`👥 Banco possui ${clanMembersCount.rows[0].count} membros de clans`);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com PostgreSQL:', error.message);
    return false;
  }
}

// Função para buscar temporadas
async function getSeasonsFromAoe4World() {
    try {
        console.log('🔄 Buscando temporadas do AOE4 World...');
        
        return [
            { id: 12, name: 'Temporada 12', kind: 'ranked', status: 'ongoing' },
            { id: 11, name: 'Temporada 11', kind: 'ranked', status: 'finished' },
            { id: 10, name: 'Temporada 10', kind: 'ranked', status: 'finished' },
            { id: 9, name: 'Temporada 9', kind: 'ranked', status: 'finished' },
            { id: 8, name: 'Temporada 8', kind: 'ranked', status: 'finished' },
            { id: 7, name: 'Temporada 7', kind: 'ranked', status: 'finished' },
            { id: 6, name: 'Temporada 6', kind: 'ranked', status: 'finished' },
            { id: 5, name: 'Temporada 5', kind: 'ranked', status: 'finished' },
            { id: 4, name: 'Temporada 4', kind: 'ranked', status: 'finished' },
            { id: 3, name: 'Temporada 3', kind: 'ranked', status: 'finished' },
            { id: 2, name: 'Temporada 2', kind: 'ranked', status: 'finished' },
            { id: 1, name: 'Temporada 1', kind: 'ranked', status: 'finished' }
        ];
        
    } catch (error) {
        console.error('💥 Erro ao buscar temporadas:', error);
        return [
            { id: 12, name: 'Temporada 12', kind: 'ranked', status: 'ongoing' },
            { id: 11, name: 'Temporada 11', kind: 'ranked', status: 'finished' },
            { id: 10, name: 'Temporada 10', kind: 'ranked', status: 'finished' },
            { id: 9, name: 'Temporada 9', kind: 'ranked', status: 'finished' },
            { id: 8, name: 'Temporada 8', kind: 'ranked', status: 'finished' },
            { id: 7, name: 'Temporada 7', kind: 'ranked', status: 'finished' },
            { id: 6, name: 'Temporada 6', kind: 'ranked', status: 'finished' },
            { id: 5, name: 'Temporada 5', kind: 'ranked', status: 'finished' },
            { id: 4, name: 'Temporada 4', kind: 'ranked', status: 'finished' },
            { id: 3, name: 'Temporada 3', kind: 'ranked', status: 'finished' },
            { id: 2, name: 'Temporada 2', kind: 'ranked', status: 'finished' },
            { id: 1, name: 'Temporada 1', kind: 'ranked', status: 'finished' }
        ];
    }
}

export default app;