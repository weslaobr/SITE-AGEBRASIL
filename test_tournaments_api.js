const http = require('http');

const ADMIN_USER = JSON.stringify({ id: '407624932101455873', username: 'Admin' });

function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-user': encodeURIComponent(ADMIN_USER)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('🚀 Starting Tournament API Tests...');

    // 1. CREATE
    console.log('\n1. Testing CREATE...');
    const newTournament = {
        name: 'Test Tournament',
        link: 'https://example.com',
        status: 'upcoming',
        start_date: new Date().toISOString()
    };
    const createRes = await request('POST', '/tournaments', newTournament);
    console.log('Status:', createRes.status);
    console.log('Body:', createRes.body);

    if (createRes.status !== 200 || !createRes.body.id) {
        console.error('❌ Create failed');
        return;
    }
    const tournamentId = createRes.body.id;
    console.log('✅ Created tournament with ID:', tournamentId);

    // 2. GET ALL
    console.log('\n2. Testing GET ALL...');
    const getRes = await request('GET', '/tournaments');
    console.log('Status:', getRes.status);
    const found = getRes.body.find(t => t.id === tournamentId);
    if (found) {
        console.log('✅ Found created tournament in list');
    } else {
        console.error('❌ Created tournament not found in list');
    }

    // 3. UPDATE
    console.log('\n3. Testing UPDATE...');
    const updateData = { ...newTournament, name: 'Updated Tournament Name' };
    const updateRes = await request('PUT', `/tournaments/${tournamentId}`, updateData);
    console.log('Status:', updateRes.status);
    console.log('Body:', updateRes.body);
    if (updateRes.body.name === 'Updated Tournament Name') {
        console.log('✅ Update successful');
    } else {
        console.error('❌ Update failed');
    }

    // 4. DELETE
    console.log('\n4. Testing DELETE...');
    const deleteRes = await request('DELETE', `/tournaments/${tournamentId}`);
    console.log('Status:', deleteRes.status);
    if (deleteRes.status === 200) {
        console.log('✅ Delete successful');
    } else {
        console.error('❌ Delete failed');
    }

    // 5. VERIFY DELETE
    const verifyRes = await request('GET', '/tournaments');
    const stillExists = verifyRes.body.find(t => t.id === tournamentId);
    if (!stillExists) {
        console.log('✅ Verified tournament is gone');
    } else {
        console.error('❌ Tournament still exists after delete');
    }
}

runTests();
