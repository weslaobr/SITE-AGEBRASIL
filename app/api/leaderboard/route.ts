// app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { database } from '../../../lib/database';
export const dynamic = 'force-dynamic';  // 👈 força execução em runtime
export const revalidate = 1000;    

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season') || 'current';
    const mode = searchParams.get('mode') || 'solo';

    console.log(`\n🎯 API LEADERBOARD - Nova requisição:`, {
      season,
      mode,
      timestamp: new Date().toISOString()
    });

    // Validação dos parâmetros
    if (!['solo', 'team'].includes(mode)) {
      return NextResponse.json(
        { error: 'Modo inválido. Use "solo" ou "team".' },
        { status: 400 }
      );
    }

    console.log(`📊 Parâmetros: season=${season}, mode=${mode}`);

    // Buscar dados
    let players = [];
    let stats = null;

    try {
      console.log('🔄 Buscando players...');
      players = await database.getPlayers(season, mode);
      console.log(`✅ ${players.length} players encontrados`);
    } catch (playersError: any) {
      console.error('❌ Erro ao buscar players:', playersError.message);
      players = [];
    }

    try {
      console.log('🔄 Buscando stats...');
      stats = await database.getStats(season, mode);
      console.log('✅ Stats encontrados');
    } catch (statsError: any) {
      console.error('❌ Erro ao buscar stats:', statsError.message);
      stats = {
        totalPlayers: 0,
        totalWins: 0,
        highestPoints: 0,
        totalExperts: 0
      };
    }

    // Filtrar apenas jogadores com pontos para as estatísticas
    const playersWithPoints = players.filter(p => p.points > 0);
    
    console.log(`📊 API - Análise dos dados:`, {
      totalPlayers: players.length,
      playersWithPoints: playersWithPoints.length,
      playersWithoutPoints: players.length - playersWithPoints.length,
      requestedMode: mode,
      requestedSeason: season
    });

    return NextResponse.json({
      success: true,
      players: players,
      stats: stats || {
        totalPlayers: playersWithPoints.length,
        totalWins: playersWithPoints.reduce((sum, p) => sum + (p.wins || 0), 0),
        highestPoints: playersWithPoints.length > 0 ? Math.max(...playersWithPoints.map(p => p.points || 0)) : 0,
        totalExperts: playersWithPoints.filter(p => p.points >= 1400).length
      },
      filters: {
        season,
        mode
      },
      metadata: {
        source: "aoe4world_api",
        count: players.length,
        playersWithPoints: playersWithPoints.length,
        timestamp: new Date().toISOString(),
        cache: "no-cache"
      }
    });

  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO NA API LEADERBOARD:', {
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json({ 
      success: false,
      error: 'Erro ao carregar dados',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
    }, { status: 500 });
  }
}