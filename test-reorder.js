const http = require('http');

const ADMIN_USER = {
    id: '407624932101455873',
    username: 'BRO.WESLAO',
    discriminator: '0000',
    avatar: 'fake_avatar'
};

function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-user': encodeURIComponent(JSON.stringify(ADMIN_USER))
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });

        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function testReorder() {
    try {
        // 1. Get categories
        const listRes = await request('GET', '/api/forum/categories');
        const categories = JSON.parse(listRes.body);
        console.log('Current categories:', categories.map(c => ({ id: c.id, pos: c.position })));

        if (categories.length === 0) {
            console.log('No categories to reorder.');
            return;
        }

        // 2. Create new order
        const order = categories.map(c => c.id).reverse();
        console.log('Sending new order:', order);

        // 3. Send PUT
        const res = await request('PUT', '/api/forum/categories/reorder', { order });

        if (res.status === 200) {
            console.log('✅ Reorder successful');
        } else {
            console.error('❌ Reorder failed:', res.status, res.body);
        }

    } catch (err) {
        console.error('❌ Test failed:', err);
    }
}

testReorder();
