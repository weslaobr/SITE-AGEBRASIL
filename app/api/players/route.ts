// app/api/players/route.ts
import { NextResponse } from "next/server";
import { getLeaderboardData } from "@/lib/aoe4world-api"; // ✅ importa do arquivo certo

export async function GET() {
  try {
    const players = await getLeaderboardData(); // ✅ função vinda do aoe4world-api

    // Remover avatar_url se existir
    const cleanedPlayers = players.map((player) => {
      const { avatar_url, ...cleanPlayer } = player;
      return cleanPlayer;
    });

    return NextResponse.json({
      success: true,
      data: cleanedPlayers,
      count: players.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro na API players:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
