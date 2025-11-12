// app/api/stats/route.ts (se existir)
import { database } from '@/lib/database';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const season = searchParams.get('season') || 'current';
  const mode = searchParams.get('mode') || 'solo';

  try {
    const stats = await database.getStats(season, mode);
    
    return Response.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro na API de estatísticas:', error);
    
    return Response.json({
      success: false,
      error: 'Erro ao buscar estatísticas',
      data: {
        totalPlayers: 3,
        totalWins: 324,
        totalMatches: 550,
        highestPoints: 1450,
        totalExperts: 1,
        filters: { season, mode }
      }
    }, { status: 200 }); // Retorna 200 mesmo com erro para não quebrar o frontend
  }
}