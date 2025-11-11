// app/api/clans/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { database } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season') || 'current';
    const clanId = searchParams.get('id');

    console.log(`\n🏴 API CLANS - Nova requisição:`, {
      season,
      clanId,
      timestamp: new Date().toISOString()
    });

    // Se tem ID, buscar clan específico
    if (clanId) {
      const clan = await database.getClanById(parseInt(clanId));
      
      if (!clan) {
        return NextResponse.json(
          { success: false, error: 'Clan não encontrado' },
          { status: 404 }
        );
      }
      
      const members = await database.getClanMembers(parseInt(clanId));
      
      return NextResponse.json({
        success: true,
        clan: {
          ...clan,
          members: members
        },
        metadata: {
          timestamp: new Date().toISOString(),
          source: "agebrasil_db"
        }
      });
    }

    // Buscar todos os clans
    const clans = await database.getClans(season);
    
    // Calcular estatísticas dos clans
    const clanStats = {
      totalClans: clans.length,
      totalMembers: clans.reduce((sum, clan) => sum + (clan.total_members || 0), 0),
      activePlayers: clans.reduce((sum, clan) => sum + (clan.active_players || 0), 0),
      averageMembers: clans.length > 0 ? 
        Math.round(clans.reduce((sum, clan) => sum + (clan.total_members || 0), 0) / clans.length) : 0,
      highestElo: Math.max(...clans.map(clan => clan.average_elo || 0)),
      highestPoints: Math.max(...clans.map(clan => clan.total_points || 0))
    };

    console.log(`📊 API CLANS - Dados retornados:`, {
      totalClans: clans.length,
      totalMembers: clanStats.totalMembers,
      activePlayers: clanStats.activePlayers,
      clanStats,
      sampleClans: clans.slice(0, 3).map(c => ({ 
        name: c.name, 
        members: c.total_members,
        active: c.active_players,
        points: c.total_points 
      }))
    });

    return NextResponse.json({
      success: true,
      clans: clans,
      stats: clanStats,
      filters: { season },
      metadata: {
        count: clans.length,
        timestamp: new Date().toISOString(),
        source: "agebrasil_db"
      }
    });

  } catch (error: any) {
    console.error('❌ ERRO NA API CLANS:', error.message);
    
    // Retorna clans vazios para não quebrar o frontend
    return NextResponse.json({ 
      success: true,
      clans: [],
      stats: {
        totalClans: 0,
        totalMembers: 0,
        activePlayers: 0,
        averageMembers: 0,
        highestElo: 0,
        highestPoints: 0
      },
      filters: { season: 'current' },
      metadata: {
        count: 0,
        timestamp: new Date().toISOString(),
        source: "fallback"
      }
    });
  }
}

// 🆕 ENDPOINT PARA MEMBROS DE CLAN
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clanId = searchParams.get('id');
    
    if (!clanId) {
      return NextResponse.json(
        { success: false, error: 'ID do clan é obrigatório' },
        { status: 400 }
      );
    }
    
    const members = await database.getClanMembers(parseInt(clanId));
    
    return NextResponse.json({
      success: true,
      members: members,
      metadata: {
        count: members.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('❌ ERRO NA API CLANS MEMBERS:', error.message);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar membros do clan' },
      { status: 500 }
    );
  }
}