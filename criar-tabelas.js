// criar-tabelas.js
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:ljPQHCOBFkYKHSAnZshLkQDmSWDZqBqW@mainline.proxy.rlwy.net:27194/railway',
  ssl: { rejectUnauthorized: false }
});

async function updateDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Atualizando estrutura da tabela leaderboard_cache...');
    
    // Adicionar colunas
    await client.query(`
      ALTER TABLE leaderboard_cache 
      ADD COLUMN IF NOT EXISTS discord_user_id TEXT;
    `);
    console.log('✅ Coluna discord_user_id adicionada/verificada');

    await client.query(`
      ALTER TABLE leaderboard_cache 
      ADD COLUMN IF NOT EXISTS last_game_timestamp BIGINT;
    `);
    console.log('✅ Coluna last_game_timestamp adicionada/verificada');

    // Criar índices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_updated 
      ON leaderboard_cache(updated_at);
    `);
    console.log('✅ Índice idx_leaderboard_cache_updated criado/verificado');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_points 
      ON leaderboard_cache(points DESC);
    `);
    console.log('✅ Índice idx_leaderboard_cache_points criado/verificado');

    console.log('🎉 Estrutura da tabela atualizada com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao atualizar banco:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

updateDatabase();