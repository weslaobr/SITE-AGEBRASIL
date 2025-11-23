const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const CREATORS = [
    { id: 1, name: "Gks", twitch: "gks_aoe", youtube: "https://youtube.com/@gks_aoe", youtubeId: "UC68u_vTF3ynM1plO_kihJ0Q" },
    { id: 2, name: "Utinowns", twitch: "utinowns", youtube: "https://youtube.com/@utinowns9776", youtubeId: "UClTZTtes7vCnMNbU_PTWFcQ" },
    { id: 3, name: "VicentiN", twitch: "vicentin", youtube: "https://youtube.com/@vitorvicentin", youtubeId: "UCrAbkIFpoh8EZWof6y6DfmA" },
    { id: 4, name: "CaioFora", twitch: "cai0fora", youtube: "https://youtube.com/@caiofora", youtubeId: "UCd54zjiewBgbTQHV_jbmM-Q" },
    { id: 5, name: "EricBR", twitch: "ericbr_", youtubeId: "UCqTMXy2p7tjyh4BbcOCNooA" },
    { id: 6, name: "Vitruvius TV", twitch: "vitruvius_tv" },
    { id: 7, name: "Nyxel TV", twitch: "nyxel_tv" },
    { id: 8, name: "LegoWzz", twitch: "legowzz" }
];

const FALLBACK_VIDEOS = {
    "Gks": {
        id: "pOldXIwGyrc", // Safe Fallback: AoE4 Gameplay Trailer
        title: "🔴AO VIVO - CAMPEONATO BRASILEIRO AGE OF CHAMPIONS",
        thumbnail_url: "https://i.ytimg.com/vi/pOldXIwGyrc/mqdefault.jpg",
        publishedAt: new Date().toISOString()
    },
    "Utinowns": {
        id: "ojFygYWUBWY",
        title: "Ego dos impérios - Campeonato BR Finais!",
        thumbnail_url: "https://i.ytimg.com/vi/ojFygYWUBWY/mqdefault.jpg",
        publishedAt: new Date().toISOString()
    },
    "VicentiN": {
        id: "hLzvpv3bv_Q", // Safe Fallback
        title: "Sofri Jogando de Horda Dourada contra Aiúbidas no Age of Empires 4",
        thumbnail_url: "https://i.ytimg.com/vi/hLzvpv3bv_Q/mqdefault.jpg",
        publishedAt: new Date().toISOString()
    },
    "CaioFora": {
        id: "yFHsiFHWrN4", // User provided ID
        title: "Não Tem Brasileiro em Campo - EGC Master Finals",
        thumbnail_url: "https://i.ytimg.com/vi/yFHsiFHWrN4/mqdefault.jpg",
        publishedAt: new Date().toISOString()
    },
    "EricBR": {
        id: "c3sxQBro8ng", // Safe Fallback
        title: "ANÁLISE e OPINIÕES Sobre as Novas Notícias do AOM HORRIVEL",
        thumbnail_url: "https://i.ytimg.com/vi/R9j0D_Q8fG8/mqdefault.jpg",
        publishedAt: new Date().toISOString()
    }
};

async function seed() {
    const client = await pool.connect();
    try {
        for (const creator of CREATORS) {
            const latestVideo = FALLBACK_VIDEOS[creator.name] || null;

            const creatorData = {
                ...creator,
                isLive: false, // Assuming offline for fallback
                avatar_url: `https://ui-avatars.com/api/?name=${creator.name}&background=random`,
                streamInfo: null,
                latestVideo: latestVideo
            };

            await client.query(`
                INSERT INTO stream (creator_id, data, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (creator_id) 
                DO UPDATE SET data = $2, updated_at = NOW()
            `, [creator.id, creatorData]);

            console.log(`✅ Seeded data for ${creator.name}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

seed();
