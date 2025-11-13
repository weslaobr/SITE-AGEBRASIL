// app/api/seasons/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { database } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('📅 API SEASONS - Buscando temporadas...');
    
    const seasons = await database.getSeasons();
    
    console.log(`✅ ${seasons.length} temporadas retornadas`);
    
    return NextResponse.json({
      success: true,
      seasons: seasons,
      count: seasons.length,
      metadata: {
        source: "aoe4world_api",
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ ERRO NA API SEASONS:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar temporadas',
      seasons: [],
      count: 0
    }, { status: 500 });
  }
}