// app/api/debug/players/route.ts
import { NextResponse } from 'next/server';
import { database } from '../../../../lib/database';

export async function GET() {
  try {
    const players = await database.getPlayers();
    
    // Debug dos avatares
    const playersWithAvatars = players.map(player => ({
      name: player.name,
      avatar_url: player.avatar_url,
      has_avatar: !!player.avatar_url,
      aoe4_world_id: player.aoe4_world_id
    }));

    return NextResponse.json({
      success: true,
      players: playersWithAvatars,
      total: players.length,
      with_avatars: players.filter(p => p.avatar_url).length
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}