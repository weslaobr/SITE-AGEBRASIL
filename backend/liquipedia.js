import * as cheerio from "cheerio";
import { LRUCache } from "lru-cache";

const fetch = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));

const UA = "AgeBrasilApp/1.0 (https://aoe4.com.br)";
const TOURNAMENTS_PAGE = "https://liquipedia.net/ageofempires/Age_of_Empires_IV/Tournaments";

const cache = new LRUCache({
    max: 1,
    ttl: 10 * 60 * 1000,
});


export async function getTournaments() {
    const cached = cache.get("tournaments_v1");
    if (cached) return cached;

    try {
        const apiUrl =
            "https://liquipedia.net/ageofempires/api.php?action=parse&page=Age_of_Empires_IV%2FTournaments&prop=text&format=json";

        const res = await fetch(apiUrl, {
            headers: { "User-Agent": UA },
        });

        if (!res.ok) throw new Error("API parse retornou status " + res.status);

        const j = await res.json();
        if (j?.parse?.text?.["*"]) {
            const html = j.parse.text["*"];
            const $ = cheerio.load(html);

            const tournaments = extractFromCheerio($);
            if (tournaments.length > 0) {
                cache.set("tournaments_v1", tournaments);
                return tournaments;
            }
        }
    } catch (err) {
        console.warn("Erro no parse API, tentando fallback:", err.message);
    }

    // FALLBACK — baixar o HTML direto
    try {
        const raw = await fetch(TOURNAMENTS_PAGE, {
            headers: { "User-Agent": UA },
        });

        const html = await raw.text();
        const $ = cheerio.load(html);

        const tournaments = extractFromCheerio($);
        cache.set("tournaments_v1", tournaments);

        return tournaments;
    } catch (err) {
        throw new Error("Falha completa ao obter torneios: " + err.message);
    }
}

function extractFromCheerio($) {
    const out = [];

    const tables = $("table.wikitable");

    tables.each((_, table) => {
        $(table)
            .find("tbody tr")
            .each((_, tr) => {
                const cols = $(tr).find("td");
                if (cols.length < 2) return;

                const name = $(cols[0]).text().trim();
                const prize = $(cols[1]).text().trim();
                const tier = $(cols[2])?.text()?.trim() || "—";
                const start = $(cols[3])?.text()?.trim() || "—";
                const end = $(cols[4])?.text()?.trim() || "—";

                if (name.length < 3) return;

                const link =
                    $(cols[0]).find("a").attr("href") ??
                    "/ageofempires/Age_of_Empires_IV/Tournaments";

                out.push({
                    name,
                    prize: prize || "—",
                    tier,
                    startDate: start,
                    endDate: end,
                    liquipediaUrl:
                        link.startsWith("http")
                            ? link
                            : "https://liquipedia.net" + link,
                });
            });
    });

    return out;
}
