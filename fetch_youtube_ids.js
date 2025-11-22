require('dotenv').config();

const CREATORS = [
    { name: "Gks", query: "Gks AoE" },
    { name: "Utinowns", query: "Utinowns" },
    { name: "VicentiN", query: "VicentiN AoE" },
    { name: "CaioFora", query: "CaioFora" },
    { name: "EricBR", query: "EricBR Age of Empires" },
    { name: "Vitruvius TV", query: "Vitruvius TV" },
    { name: "Nyxel TV", query: "Nyxel TV" },
    { name: "LegoWzz", query: "LegoWzz" }
];

async function fetchChannelId(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        console.error("❌ YOUTUBE_API_KEY not found in .env");
        return null;
    }

    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            return {
                id: data.items[0].snippet.channelId,
                title: data.items[0].snippet.channelTitle,
                description: data.items[0].snippet.description
            };
        }
        return null;
    } catch (error) {
        console.error(`Error fetching for ${query}:`, error.message);
        return null;
    }
}

async function run() {
    console.log("🔍 Searching for YouTube Channel IDs...");

    for (const creator of CREATORS) {
        const result = await fetchChannelId(creator.query);
        if (result) {
            console.log(`✅ ${creator.name}: ${result.id} (${result.title})`);
        } else {
            console.log(`❌ ${creator.name}: Not found`);
        }
    }
}

run();
