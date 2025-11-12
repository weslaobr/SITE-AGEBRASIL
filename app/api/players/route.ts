// app/api/players/route.ts - VERSÃO 100% CORRIGIDA
import { NextResponse } from 'next/server';
import { database } from '../../../lib/database';

export async function GET() {
  try {
    const players = await database.getLeaderboardData();
    
    // Remover avatar_url dos dados se existir
    const cleanedPlayers = players.map(player => {
      const { avatar_url, ...cleanPlayer } = player;
      return cleanPlayer;
    });
    
    return NextResponse.json({
      success: true,
      data: cleanedPlayers, // Usar dados limpos
      count: players.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    
    console.error('Erro na API players:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}