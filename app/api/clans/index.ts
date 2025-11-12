import { NextApiRequest, NextApiResponse } from 'next';
import { database } from '../../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('📋 API CLANS - Buscando clans');

    // Use a função do seu database que já está configurada
    // Você precisará criar esta função no seu lib/database.ts
    const clans = await database.getClans();

    console.log(`✅ ${clans.length} clans retornados`);

    res.status(200).json({
      success: true,
      clans: clans,
      metadata: {
        timestamp: new Date().toISOString(),
        total: clans.length
      }
    });

  } catch (error: any) {
    console.error('❌ ERRO NA API CLANS:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar clans',
      details: error.message
    });
  }
}