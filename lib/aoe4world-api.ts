// lib/aoe4world-api.ts — VERSÃO OTIMIZADA PARA PRODUÇÃO (Vercel + Retry + Cache)

export interface AoE4WorldTournament {
  id: number;
  name: string;
  description?: string;
  url: string;
  start_at: string;
  end_at: string;
  registration_ends_at?: string;
  participants_count: number;
  participants_max?: number;
  status: "upcoming" | "ongoing" | "completed";
  prize_pool?: string;
  organization?: string;
  website_url?: string;
  discord_url?: string;
  brackets_url?: string;
  liquipedia_url?: string;
  platforms: string[];
  game_versions: string[];
  type: string;
  ruleset: string;
}

/* =======================================================
   🔹 LEADERBOARD (com retry + fallback + cache 1h)
   ======================================================= */
export async function getLeaderboardData(retries = 3) {
  const url = "https://aoe4world.com/api/leaderboard/rm_1v1?count=100";

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🌐 [AoE4World] Tentativa ${attempt}/${retries}...`);

      const res = await fetch(url, {
        headers: { "User-Agent": "AGEBRASIL/1.0" },
        // ⚙️ cache por 1h
        next: { revalidate: 3600 },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data?.leaderboard?.length) {
        console.log(`✅ [AoE4World] ${data.leaderboard.length} jogadores`);
        return data.leaderboard;
      }

      throw new Error("Resposta vazia da API");
    } catch (err: any) {
      console.warn(`⚠️ Tentativa ${attempt} falhou: ${err.message}`);
      if (attempt === retries) {
        console.error("❌ API AOE4World offline — usando fallback.");
        return mockLeaderboard();
      }
      // Espera exponencial entre tentativas
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }

  return mockLeaderboard();
}

// ✅ Fallback mock (usado em caso de erro)
function mockLeaderboard() {
  return [
    {
      name: "PlayerOffline",
      rank_level: "Conqueror I",
      elo: 1710,
      points: 1636,
      wins: 30,
      losses: 12,
      win_rate: 71.4,
      profile_url: "https://aoe4world.com/players/1379401",
    },
  ];
}

/* =======================================================
   🔹 TORNEIOS
   ======================================================= */

export interface AoE4WorldApiResponse {
  tournaments: AoE4WorldTournament[];
  total: number;
}

class AoE4WorldAPI {
  private baseUrl = "https://aoe4world.com/api/v0";

  async getTournaments(params?: {
    status?: "upcoming" | "ongoing" | "completed";
    limit?: number;
    offset?: number;
  }): Promise<AoE4WorldTournament[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append("status", params.status);
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.offset) queryParams.append("offset", params.offset.toString());

      const response = await fetch(`${this.baseUrl}/tournaments?${queryParams}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "AGEBRASIL/1.0",
        },
        next: { revalidate: 3600 }, // cache 1h
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data: AoE4WorldApiResponse = await response.json();
      return data.tournaments || [];
    } catch (error) {
      console.error("❌ Erro ao buscar torneios:", error);
      return [];
    }
  }

  async getTournamentById(id: number): Promise<AoE4WorldTournament | null> {
    try {
      const response = await fetch(`${this.baseUrl}/tournaments/${id}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "AGEBRASIL/1.0",
        },
        next: { revalidate: 3600 },
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`❌ Erro ao buscar torneio ${id}:`, error);
      return null;
    }
  }

  /* =======================================================
     🔹 CONVERSÃO DE FORMATO
     ======================================================= */
  convertToOurFormat(tournaments: AoE4WorldTournament[]): any[] {
    return tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      organizer: t.organization || "AoE4 World",
      game: "Age of Empires IV",
      format: this.mapTournamentType(t.type),
      prize: t.prize_pool || "A confirmar",
      participants: t.participants_max || t.participants_count,
      registered: t.participants_count,
      start_date: t.start_at?.split("T")[0],
      end_date: t.end_at?.split("T")[0],
      status: this.mapStatus(t.status),
      bracket_url: t.brackets_url,
      registration_url: t.website_url,
      discord_url: t.discord_url,
      vod_url: t.liquipedia_url,
      thumbnail: this.generateThumbnail(t),
      featured: this.isFeatured(t),
    }));
  }

  private mapStatus(status: AoE4WorldTournament["status"]): "active" | "upcoming" | "completed" {
    const statusMap: Record<AoE4WorldTournament["status"], "active" | "upcoming" | "completed"> = {
      ongoing: "active",
      upcoming: "upcoming",
      completed: "completed",
    };
    return statusMap[status] ?? "upcoming";
  }

  private mapTournamentType(type: string): string {
    const typeMap: Record<string, string> = {
      "1v1": "1v1 Elimination",
      "2v2": "2v2 Teams",
      "3v3": "3v3 Teams",
      "4v4": "4v4 Teams",
      round_robin: "Round Robin",
      swiss: "Swiss System",
      double_elimination: "Eliminação Dupla",
      single_elimination: "Eliminação Simples",
    };
    return typeMap[type] || type || "Eliminação Simples";
  }

  private generateThumbnail(tournament: AoE4WorldTournament): string {
    const org = tournament.organization?.toLowerCase() || "";
    if (org.includes("red bull")) return "/tournaments/redbull.jpg";
    if (org.includes("esl")) return "/tournaments/esl.jpg";
    if (org.includes("weslao")) return "/tournaments/weslao.jpg";
    return `/tournaments/aoe4world-${tournament.id}.jpg`;
  }

  private isFeatured(tournament: AoE4WorldTournament): boolean {
    return (
      tournament.participants_count > 50 ||
      (tournament.prize_pool && parseInt(tournament.prize_pool) > 1000)
    );
  }
}

export const aoe4WorldAPI = new AoE4WorldAPI();
