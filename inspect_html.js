const https = require('https');

const url = 'https://aoe4world.com/esports/tournaments';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        // Find a specific tournament
        const target = 'Empires League 2';
        const index = data.indexOf(target);
        if (index !== -1) {
            console.log(`Found "${target}" at index`, index);
            // Print 500 chars before and after
            console.log(data.substring(index - 500, index + 500));
        } else {
            console.log(`"${target}" not found.`);
        }
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
