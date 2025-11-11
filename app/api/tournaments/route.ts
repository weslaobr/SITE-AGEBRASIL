import { NextResponse } from 'next/server';

// 🕐 Cache local (memória)
let cachedData: any = null;
let lastFetch = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora

// Função auxiliar para converter HTML da Liquipedia em objetos
function extractTournamentsFromHtml(html: string) {
  const tournaments: any[] = [];

  const rows = html.split('<li>');
  for (const row of rows) {
    const match = row.match(/<a[^>]+href="\/ageofempires\/([^"]+)"[^>]*>(.*?)<\/a>/);
    if (!match) continue;

    const link = match[1];
    const name = match[2].replace(/<[^>]+>/g, '').trim();

    // Extrair datas e status básicos
    const dateMatch = row.match(/(\d{4}-\d{2}-\d{2})/g);
    const start = dateMatch?.[0] ?? '';
    const end = dateMatch?.[1] ?? '';
    const now = new Date();
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;

    let status: 'active' | 'upcoming' | 'completed' = 'upcoming';
    if (startDate && endDate) {
      if (now < startDate) status = 'upcoming';
      else if (now > endDate) status = 'completed';
      else status = 'active';
    }

    tournaments.push({
      id: tournaments.length + 1,
      name,
      organizer: 'Liquipedia',
      game: 'Age of Empires IV',
      format: 'Desconhecido',
      prize: '—',
      participants: 0,
      start_date: start,
      end_date: end,
      status,
      thumbnail: `https://liquipedia.net/commons/images/thumb/8/8e/Age_of_Empires_IV_icon.png/64px-Age_of_Empires_IV_icon.png`,
      bracket_url: `https://liquipedia.net/ageofempires/${link}`,
    });
  }

  return tournaments;
}

// Rota principal da API
export async function GET(request: Request) {
  const url = new URL(request.url);
  const refresh = url.searchParams.get('refresh') === 'true';
  const now = Date.now();

  // 🔄 Cache local de 1h
  if (!refresh && cachedData && now - lastFetch < CACHE_DURATION) {
    return NextResponse.json(cachedData);
  }

  try {
    // 🔍 Buscar HTML bruto da Liquipedia API
    const res = await fetch(
      'https://liquipedia.net/ageofempires/api.php?action=parse&page=Age_of_Empires_IV/Tournaments&format=json'
    );

    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

    const json = await res.json();
    const html = json?.parse?.text?.['*'] ?? '';
    const allTournaments = extractTournamentsFromHtml(html);

    // Classificação por status
    const active = allTournaments.filter((t) => t.status === 'active');
    const upcoming = allTournaments.filter((t) => t.status === 'upcoming');
    const completed = allTournaments.filter((t) => t.status === 'completed');

    const result = { active, upcoming, completed };

    // 🧠 Cachear
    cachedData = result;
    lastFetch = now;

    return NextResponse.json(result);
  } catch (err) {
    console.error('Erro ao buscar torneios da Liquipedia:', err);
    return NextResponse.json(
      { active: [], upcoming: [], completed: [], error: String(err) },
      { status: 500 }
    );
  }
}
