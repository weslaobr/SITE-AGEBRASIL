const fs = require('fs');

function parseTournamentDates(dateStr) {
    try {
        const currentYear = new Date().getFullYear();
        let start, end;

        if (dateStr.includes('-')) {
            const parts = dateStr.split('-').map(s => s.trim());
            const hasYear1 = /\d{4}/.test(parts[0]);
            const hasYear2 = /\d{4}/.test(parts[1]);

            let d1 = parts[0];
            let d2 = parts[1];

            if (!hasYear2) d2 += `, ${currentYear}`;
            if (!hasYear1 && !d1.includes(',')) d1 += `, ${hasYear2 ? d2.match(/\d{4}/)[0] : currentYear}`;

            start = new Date(d1);
            end = new Date(d2);
        } else {
            start = new Date(dateStr);
            end = new Date(dateStr);
        }
        return { start, end };
    } catch (e) {
        return { start: null, end: null };
    }
}

function testScraping() {
    const html = fs.readFileSync('temp_aoe4.html', 'utf8');
    const tournaments = [];

    const ongoingSection = html.split('Ongoing tournaments')[1]?.split('Upcoming tournaments')[0] || '';
    const upcomingSection = html.split('Upcoming tournaments')[1]?.split('Past tournaments')[0] || '';
    const pastSection = html.split('Past tournaments')[1]?.split('<section')[0] || '';

    // Regex for Cards (Ongoing)
    const cardRegex = /<a[^>]+href="(\/esports\/tournaments\/[^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?<p[^>]*class="mb-2"[^>]*>([^<]+)<\/p>/g;

    // Regex for Rows (Upcoming/Past)
    const rowRegex = /<tr[\s\S]*?(?:src="([^"]+)")?[\s\S]*?<a[^>]+href="(\/esports\/tournaments\/[^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<div[^>]*class="text-gray-100"[^>]*>([^<]+)<\/div>/g;

    let match;
    while ((match = cardRegex.exec(ongoingSection)) !== null) {
        tournaments.push({
            status: 'ongoing',
            name: match[3].trim(),
            date: match[4].trim(),
            link: match[1],
            image: match[2]
        });
    }

    while ((match = rowRegex.exec(upcomingSection)) !== null) {
        tournaments.push({
            status: 'upcoming',
            name: match[3].trim(),
            date: match[4].trim(),
            link: match[2],
            image: match[1] || 'null'
        });
    }

    while ((match = rowRegex.exec(pastSection)) !== null) {
        tournaments.push({
            status: 'completed',
            name: match[3].trim(),
            date: match[4].trim(),
            link: match[2],
            image: match[1] || 'null'
        });
    }

    console.log(`Found ${tournaments.length} tournaments.`);
    if (tournaments.length > 0) {
        console.log('First 3:', tournaments.slice(0, 3));
    }
}

testScraping();
