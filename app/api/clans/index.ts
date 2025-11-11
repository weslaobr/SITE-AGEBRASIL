import { NextApiRequest, NextApiResponse } from 'next';
import sqlite3 from 'sqlite3';
import path from 'path';

// Caminho correto do seu banco de dados
const dbPath = 'F:/Downloads/BOT-AGE-BRASIL/agebrasil.db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  let db: sqlite3.Database | null = null;

  try {
    db = new sqlite3.Database(dbPath);

    // Buscar clans com estatísticas básicas
    const clans = await new Promise<any[]>((resolve, reject) => {
      db!.all(`
        SELECT 
          c.id,
          c.name,
          c.tag,
          c.description,
          c.owner_id,
          COUNT(DISTINCT cm.discord_user_id) as total_members,
          COUNT(DISTINCT cm.discord_user_id) as active_players,
          1500 as average_elo, -- Vou ajustar quando ver a estrutura
          1000 as total_points, -- Vou ajustar quando ver a estrutura
          0 as rank
        FROM clans c
        LEFT JOIN clan_members cm ON c.id = cm.clan_id
        GROUP BY c.id, c.name, c.tag, c.description, c.owner_id
        ORDER BY total_members DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Adicionar ranking
    const clansWithRank = clans.map((clan, index) => ({
      ...clan,
      rank: index + 1
    }));

    res.status(200).json({ 
      success: true, 
      clans: clansWithRank 
    });

  } catch (error) {
    console.error('Erro ao buscar clans:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    if (db) {
      db.close();
    }
  }
}