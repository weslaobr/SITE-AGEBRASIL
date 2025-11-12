// app/api/players/route.ts
import { NextResponse } from "next/server";
import { getLeaderboardData } from "@/lib/aoe4world-api";

export async function GET() {
  try {
    console.log("🌐 Buscando leaderboard do AoE4World...");
    const players = await getLeaderboardData();

    // Remover avatar_url se existir
    const cleanedPlayers = players.map((player: any) => {
      const { avatar_url, ...cleanPlayer } = player;
      return cleanPlayer;
    });

    console.log(`✅ ${cleanedPlayers.length} jogadores obtidos do AoE4World`);

    return NextResponse.json({
      success: true,
      data: cleanedPlayers,
      count: cleanedPlayers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ Erro na API players:", error.message || error);

    // --- Fallback automático ---
    const fallbackData = [
      { name: "MarineLorD", rank: 1, points: 1800, civ: "HRE" },
      { name: "TheViper", rank: 2, points: 1750, civ: "English" },
      { name: "Beastyqt", rank: 3, points: 1720, civ: "Chinese" },
    ];

    console.warn("⚠️  Usando dados simulados de fallback (AOE4World offline)");

    return NextResponse.json({
      success: true,
      data: fallbackData,
      count: fallbackData.length,
      fallback: true,
      timestamp: new Date().toISOString(),
    });
  }
}
