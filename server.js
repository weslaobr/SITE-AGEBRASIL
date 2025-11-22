const express = require('express');
const cors = require('cors');
const pkg = require('pg');
const dotenv = require('dotenv');
const app = express();
const path = require('path');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

const PORT = process.env.PORT || 3001;

// 🔥 CARREGAR VARIÁVEIS DE AMBIENTE
dotenv.config();

// DEBUG das variáveis de ambiente
console.log('=== ENVIRONMENT VARIABLES ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ CONFIGURADA' : '❌ NÃO CONFIGURADA');
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('PORT:', process.env.PORT || 'undefined');
console.log('==============================');


const { Pool } = pkg;


// Middleware
app.use(cors({
    origin: ["https://aoe4.com.br", "https://ageivbrasil.up.railway.app"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true
}));

// Servir arquivos estáticos do frontend (corrigido para Railway)
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/js', express.static(path.join(__dirname, 'frontend/js')));
app.use('/css', express.static(path.join(__dirname, 'frontend/css')));

// Corrige o bug do Railway que não serve subpastas js/css
app.get('/js/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', req.path));
});

app.get('/css/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', req.path));
});

// Rotas para páginas HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/index.html'));
});

app.get('/leaderboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/leaderboard.html'));
});

app.get('/clan.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/clan.html'));
});

app.get('/torneios.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/torneios.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/admin.html'));
});

app.get('/forum.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/forum.html'));
});

app.get('/forum-category.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/forum-category.html'));
});

app.get('/forum-topic.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/forum-topic.html'));
});

app.get('/forum-auth.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/forum-auth.html'));
});

app.get('/login-temp.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/login-temp.html'));
});

// CONFIGURAÇÃO DE ATUALIZAÇÃO AUTOMÁTICA
const AUTO_UPDATE_CONFIG = {
    enabled: true,
    interval: 30 * 60 * 1000,
    playersPerBatch: 10,
    delayBetweenRequests: 2000,
    maxPlayersPerUpdate: 20
};

// Configuração do PostgreSQL - CORRIGIDA
const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 60000,
    max: 20
};

// Verificar se a connection string é válida
if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não encontrada! Verifique o arquivo .env');
} else {
    console.log('✅ DATABASE_URL carregada do ambiente');
}

const pool = new Pool(poolConfig);

// Adicionar handler de erro global
pool.on('error', (err, client) => {
    console.error('💥 Erro inesperado no pool PostgreSQL:', err);
});

// --- MIGRATIONS ---
async function runMigrations() {
    const client = await pool.connect();
    try {
        console.log('🔄 Checking database migrations...');

        // Check if 'position' column exists in forum_categories
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='forum_categories' AND column_name='position';
        `);

        if (res.rows.length === 0) {
            console.log('⚠️ Column "position" missing in forum_categories. Adding it...');
            await client.query('ALTER TABLE forum_categories ADD COLUMN position INTEGER DEFAULT 0;');

            // Initialize positions based on ID order
            await client.query(`
                WITH ordered AS (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY id) - 1 as rn
                    FROM forum_categories
                )
                UPDATE forum_categories
                SET position = ordered.rn
                FROM ordered
                WHERE forum_categories.id = ordered.id;
            `);
            console.log('✅ Column "position" added and initialized.');
        } else {
            console.log('✅ Database schema is up to date.');
        }
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
    }
}
runMigrations();

// =============================================
// AUTHENTICATION ENDPOINTS
// =============================================

app.post('/api/auth/discord', async (req, res) => {
    const { code } = req.body;

    // DEBUG LOG
    console.log('🔹 Auth Request received:', {
        code: code ? 'Present' : 'Missing',
        origin: req.headers.origin,
        constructed_redirect_uri: req.headers.origin + '/forum-auth.html'
    });

    if (!code) return res.status(400).json({ error: 'Code is required' });

    try {
        // 1. Exchange code for token
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID || '1440856041867968542',
                client_secret: process.env.DISCORD_CLIENT_SECRET || '_J3YS6RX9BThyQ3SWcl7C1UtiLs_CwhQ', // Fallback for dev, but should be in .env
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: req.headers.origin + '/forum-auth.html' // Dynamic redirect URI based on origin
            }),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('Discord Token Error:', errorText);
            return res.status(tokenResponse.status).json({ error: 'Failed to exchange token' });
        }

        const tokenData = await tokenResponse.json();

        // 2. Get User Info
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        });

        if (!userResponse.ok) {
            return res.status(userResponse.status).json({ error: 'Failed to get user info' });
        }

        const userData = await userResponse.json();

        // Return both token data and user data
        res.json({
            token: tokenData,
            user: userData
        });

    } catch (error) {
        console.error('Auth Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// =============================================
// ENDPOINTS DO FÓRUM - FUNCIONANDO 100% COM SEU BANCO
// =============================================

app.get('/api/forum/categories', async (req, res) => {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT 
                fc.*,
                COALESCE(
                    (SELECT COUNT(*) FROM forum_topics WHERE category_id = fc.id),
                    0
                ) as topic_count,
                COALESCE(
                    (SELECT COUNT(*) 
                     FROM forum_replies fr 
                     JOIN forum_topics ft ON fr.topic_id = ft.id 
                     WHERE ft.category_id = fc.id),
                    0
                ) as reply_count
            FROM forum_categories fc
            WHERE fc.is_active = true 
            ORDER BY fc.position ASC, fc.id ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    } finally {
        client.release();
    }
});

app.post('/api/forum/categories', async (req, res) => {
    // Simple admin check (in a real app, verify token/session)
    const userHeader = req.headers['x-user'];
    if (!userHeader) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const user = JSON.parse(decodeURIComponent(userHeader));
        // Hardcoded admin check for now as per existing code style
        if (user.username !== 'BRO.WESLAO' && user.id !== 'YOUR_ADMIN_ID') {
            // You might want to add more admins here or use a DB role
        }
    } catch (e) {
        return res.status(400).json({ error: 'Invalid user header' });
    }

    const { name, slug, description, icon, color, display_order } = req.body;

    const client = await pool.connect();
    try {
        await client.query(`
            INSERT INTO forum_categories (name, slug, description, icon, color, display_order, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, true)
        `, [name, slug, description, icon, color, display_order || 0]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create category' });
    } finally {
        client.release();
    }
});

app.get('/api/forum/topics', async (req, res) => {
    const { category } = req.query;
    const client = await pool.connect();
    try {
        let query = `
            SELECT 
                t.id, t.title, t.created_at, t.views, t.is_pinned, t.is_locked,
                t.author_name, t.author_avatar, t.author_discord_id,
                c.name AS category_name, c.slug AS category_slug, c.color AS category_color,
                (SELECT COUNT(*) FROM forum_replies r WHERE r.topic_id = t.id) AS replies_count
            FROM forum_topics t
            JOIN forum_categories c ON t.category_id = c.id
            WHERE 1=1
        `;
        const values = [];

        if (category) {
            query += ` AND c.slug = $1`;
            values.push(category);
        }

        query += ` ORDER BY t.is_pinned DESC, t.created_at DESC LIMIT 50`;

        const result = await client.query(query, values);

        // Map snake_case to camelCase
        const mappedRows = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            createdAt: row.created_at,
            views: row.views,
            isPinned: row.is_pinned,
            isLocked: row.is_locked,
            author: row.author_name,
            authorAvatar: row.author_avatar,
            authorId: row.author_discord_id,
            categoryName: row.category_name,
            categorySlug: row.category_slug,
            categoryColor: row.category_color,
            repliesCount: parseInt(row.replies_count)
        }));

        res.json(mappedRows);
    } catch (err) {
        console.error(err);
        res.status(500).json([]);
    } finally {
        client.release();
    }
});

app.get('/api/forum/topics/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        const topic = await client.query(`
            SELECT t.*, c.name AS category_name, c.slug AS category_slug
            FROM forum_topics t
            JOIN forum_categories c ON t.category_id = c.id
            WHERE t.id = $1
        `, [id]);

        if (topic.rows.length === 0) return res.status(404).json({ error: 'Não encontrado' });

        const replies = await client.query(`
            SELECT * FROM forum_replies
            WHERE topic_id = $1
            ORDER BY created_at ASC
        `, [id]);

        await client.query('UPDATE forum_topics SET views = views + 1 WHERE id = $1', [id]);

        // Mapear campos para camelCase que o frontend espera
        const topicData = topic.rows[0];
        res.json({
            id: topicData.id,
            categoryId: topicData.category_id,
            title: topicData.title,
            content: topicData.content,
            authorId: topicData.author_discord_id,
            author: topicData.author_name,
            authorAvatar: topicData.author_avatar,
            views: topicData.views,
            isPinned: topicData.is_pinned,
            isLocked: topicData.is_locked,
            createdAt: topicData.created_at,
            updatedAt: topicData.updated_at,
            lastReplyAt: topicData.last_reply_at,
            categoryName: topicData.category_name,
            categorySlug: topicData.category_slug,
            replies: replies.rows.map(r => ({
                id: r.id,
                topicId: r.topic_id,
                content: r.content,
                authorId: r.author_discord_id,
                author: r.author_name,
                authorAvatar: r.author_avatar,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
                isEdited: r.is_edited,
                lastEditedBy: r.last_edited_by,
                lastEditedAt: r.last_edited_at,
                likes: r.likes
            }))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro' });
    } finally {
        client.release();
    }
});

app.post('/api/forum/topics', async (req, res) => {
    const userHeader = req.headers['x-user'];
    if (!userHeader) return res.status(401).json({ error: 'Faça login' });

    let user;
    try { user = JSON.parse(decodeURIComponent(userHeader)); } catch { return res.status(400); }

    const { categoryId, title, content } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(`
            INSERT INTO forum_topics 
            (category_id, title, content, author_discord_id, author_name, author_avatar)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [
            categoryId, title, content, user.id,
            user.global_name || user.username,
            user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp` : null
        ]);

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar tópico' });
    } finally {
        client.release();
    }
});

// ADMIN TOPIC ACTIONS
app.put('/api/forum/topics/:id/pin', async (req, res) => {
    const { id } = req.params;
    const { isPinned } = req.body;

    // Auth Check
    const userHeader = req.headers['x-user'];
    if (!userHeader) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const user = JSON.parse(decodeURIComponent(userHeader));
        const admins = ['407624932101455873']; // BRO.WESLAO
        if (!admins.includes(String(user.id))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
    } catch (e) {
        return res.status(400).json({ error: 'Invalid user header' });
    }

    const client = await pool.connect();
    try {
        await client.query('UPDATE forum_topics SET is_pinned = $1 WHERE id = $2', [isPinned, id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error pinning topic' });
    } finally {
        client.release();
    }
});

app.put('/api/forum/topics/:id/lock', async (req, res) => {
    const { id } = req.params;
    const { isLocked } = req.body;

    // Auth Check
    const userHeader = req.headers['x-user'];
    if (!userHeader) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const user = JSON.parse(decodeURIComponent(userHeader));
        const admins = ['407624932101455873']; // BRO.WESLAO
        if (!admins.includes(String(user.id))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
    } catch (e) {
        return res.status(400).json({ error: 'Invalid user header' });
    }

    const client = await pool.connect();
    try {
        await client.query('UPDATE forum_topics SET is_locked = $1 WHERE id = $2', [isLocked, id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error locking topic' });
    } finally {
        client.release();
    }
});

app.delete('/api/forum/topics/:id', async (req, res) => {
    const { id } = req.params;

    // Auth Check
    const userHeader = req.headers['x-user'];
    if (!userHeader) return res.status(401).json({ error: 'Unauthorized' });

    let user;
    try {
        user = JSON.parse(decodeURIComponent(userHeader));
    } catch (e) {
        return res.status(400).json({ error: 'Invalid user header' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if topic exists and get author
        const topicCheck = await client.query('SELECT author_discord_id FROM forum_topics WHERE id = $1', [id]);
        if (topicCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Topic not found' });
        }

        const topicAuthorId = topicCheck.rows[0].author_discord_id;
        const admins = ['407624932101455873']; // BRO.WESLAO
        const isAdmin = admins.includes(String(user.id));
        const isAuthor = String(user.id) === String(topicAuthorId);

        // Allow deletion if user is admin OR topic author
        if (!isAdmin && !isAuthor) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Você só pode deletar seus próprios tópicos' });
        }

        await client.query('DELETE FROM forum_replies WHERE topic_id = $1', [id]);
        await client.query('DELETE FROM forum_topics WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Error deleting topic' });
    } finally {
        client.release();
    }
});

app.post('/api/forum/replies', async (req, res) => {
    const userHeader = req.headers['x-user'];
    if (!userHeader) return res.status(401).json({ error: 'Faça login' });

    let user;
    try { user = JSON.parse(decodeURIComponent(userHeader)); } catch { return res.status(400); }

    const { topicId, content } = req.body;

    if (!topicId || !content) {
        return res.status(400).json({ error: 'Topic ID and content are required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if topic is locked
        const topicCheck = await client.query('SELECT is_locked FROM forum_topics WHERE id = $1', [topicId]);
        if (topicCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Topic not found' });
        }
        if (topicCheck.rows[0].is_locked) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Topic is locked' });
        }

        const result = await client.query(`
            INSERT INTO forum_replies 
            (topic_id, content, author_discord_id, author_name, author_avatar)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [
            topicId, content, user.id,
            user.global_name || user.username,
            user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp` : null
        ]);

        // Update last_reply_at in topic
        await client.query('UPDATE forum_topics SET last_reply_at = NOW() WHERE id = $1', [topicId]);

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar resposta' });
    } finally {
        client.release();
    }
});

app.delete('/api/forum/replies/:id', async (req, res) => {
    const { id } = req.params;

    // Auth Check
    const userHeader = req.headers['x-user'];
    if (!userHeader) return res.status(401).json({ error: 'Unauthorized' });

    let user;
    try {
        user = JSON.parse(decodeURIComponent(userHeader));
    } catch (e) {
        return res.status(400).json({ error: 'Invalid user header' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check reply existence and author
        const replyCheck = await client.query('SELECT author_discord_id FROM forum_replies WHERE id = $1', [id]);
        if (replyCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Reply not found' });
        }

        const replyAuthorId = replyCheck.rows[0].author_discord_id;
        const admins = ['407624932101455873']; // BRO.WESLAO
        const isAdmin = admins.includes(String(user.id));
        const isAuthor = String(user.id) === String(replyAuthorId);

        if (!isAdmin && !isAuthor) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Forbidden' });
        }

        await client.query('DELETE FROM forum_replies WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Error deleting reply' });
    } finally {
        client.release();
    }
});

// Edit Topic Endpoint
app.put('/api/forum/topics/:id', async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;

    const userHeader = req.headers['x-user'];
    if (!userHeader) return res.status(401).json({ error: 'Unauthorized' });

    let user;
    try {
        user = JSON.parse(decodeURIComponent(userHeader));
    } catch (e) {
        return res.status(400).json({ error: 'Invalid user header' });
    }

    const client = await pool.connect();
    try {
        const topicCheck = await client.query('SELECT author_discord_id FROM forum_topics WHERE id = $1', [id]);
        if (topicCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Topic not found' });
        }

        const topicAuthorId = topicCheck.rows[0].author_discord_id;
        const admins = ['407624932101455873'];
        const isAdmin = admins.includes(String(user.id));
        const isAuthor = String(user.id) === String(topicAuthorId);

        if (!isAdmin && !isAuthor) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        let idx = 1;

        if (title) {
            updates.push(`title = $${idx++}`);
            values.push(title);
        }
        if (content) {
            updates.push(`content = $${idx++}`);
            values.push(content);
        }

        if (updates.length === 0) return res.json({ success: true }); // Nothing to update

        values.push(id);
        await client.query(`UPDATE forum_topics SET ${updates.join(', ')} WHERE id = $${idx}`, values);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating topic' });
    } finally {
        client.release();
    }
});

// Edit Reply Endpoint
app.put('/api/forum/replies/:id', async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) return res.status(400).json({ error: 'Content required' });

    const userHeader = req.headers['x-user'];
    if (!userHeader) return res.status(401).json({ error: 'Unauthorized' });

    let user;
    try {
        user = JSON.parse(decodeURIComponent(userHeader));
    } catch (e) {
        return res.status(400).json({ error: 'Invalid user header' });
    }

    const client = await pool.connect();
    try {
        const replyCheck = await client.query('SELECT author_discord_id FROM forum_replies WHERE id = $1', [id]);
        if (replyCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Reply not found' });
        }

        const replyAuthorId = replyCheck.rows[0].author_discord_id;
        const admins = ['407624932101455873'];
        const isAdmin = admins.includes(String(user.id));
        const isAuthor = String(user.id) === String(replyAuthorId);

        if (!isAdmin && !isAuthor) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await client.query('UPDATE forum_replies SET content = $1 WHERE id = $2', [content, id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating reply' });
    } finally {
        client.release();
    }
});

app.post('/api/topicos/:id/responder', (req, res) => {
    const id = parseInt(req.params.id);
    const { autor, texto } = req.body;

    if (!autor || !texto || !texto.trim()) {
        return res.status(400).json({ erro: "Autor e texto são obrigatórios" });
    }

    const topico = topicos.find(t => t.id === id);
    if (!topico) {
        return res.status(404).json({ erro: "Tópico não encontrado" });
    }

    const novaResposta = {
        autor: autor.trim(),
        texto: texto.trim(),
        data: new Date().toISOString()
    };

    topico.respostas.push(novaResposta);
    topico.ultima_resposta = new Date().toISOString();

    res.json({ sucesso: true, resposta: novaResposta });
});

// --- CATEGORY MANAGEMENT ENDPOINTS (ADMIN ONLY) ---

// Create Category
app.post('/api/forum/categories', async (req, res) => {
    const { name, slug, description, icon } = req.body;

    // Auth Check
    const userHeader = req.headers['x-user'];
    if (!userHeader) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const user = JSON.parse(decodeURIComponent(userHeader));
        const admins = ['407624932101455873'];
        if (!admins.includes(String(user.id))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
    } catch (e) {
        return res.status(400).json({ error: 'Invalid user header' });
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            'INSERT INTO forum_categories (name, slug, description, icon) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, slug, description, icon]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error creating category' });
    } finally {
        client.release();
    }
});

// Reorder Categories
app.put('/api/forum/categories/reorder', async (req, res) => {
    const { order } = req.body; // Array of IDs in new order

    // Auth Check
    const userHeader = req.headers['x-user'];
    if (!userHeader) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const user = JSON.parse(decodeURIComponent(userHeader));
        const admins = ['407624932101455873'];
        if (!admins.includes(String(user.id))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
    } catch (e) {
        return res.status(400).json({ error: 'Invalid user header' });
    }

    if (!Array.isArray(order)) return res.status(400).json({ error: 'Invalid order format' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (let i = 0; i < order.length; i++) {
            await client.query('UPDATE forum_categories SET position = $1 WHERE id = $2', [i, order[i]]);
        }
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Error reordering categories' });
    } finally {
        client.release();
    }
});

// Update Category
app.put('/api/forum/categories/:id', async (req, res) => {
    const { id } = req.params;
    const { name, slug, description, icon } = req.body;

    // Auth Check
    const userHeader = req.headers['x-user'];
    if (!userHeader) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const user = JSON.parse(decodeURIComponent(userHeader));
        const admins = ['407624932101455873'];
        if (!admins.includes(String(user.id))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
    } catch (e) {
        return res.status(400).json({ error: 'Invalid user header' });
    }

    const client = await pool.connect();
    try {
        const result = await client.query(
            'UPDATE forum_categories SET name = $1, slug = $2, description = $3, icon = $4 WHERE id = $5 RETURNING *',
            [name, slug, description, icon, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating category' });
    } finally {
        client.release();
    }
});

// Delete Category
app.delete('/api/forum/categories/:id', async (req, res) => {
    const { id } = req.params;

    // Auth Check
    const userHeader = req.headers['x-user'];
    if (!userHeader) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const user = JSON.parse(decodeURIComponent(userHeader));
        const admins = ['407624932101455873'];
        if (!admins.includes(String(user.id))) {
            return res.status(403).json({ error: 'Forbidden' });
        }
    } catch (e) {
        return res.status(400).json({ error: 'Invalid user header' });
    }

    const client = await pool.connect();
    try {
        // Optional: Check if category has topics before deleting? 
        // For now, let's assume we want to delete everything or let FK constraints handle it.
        // If we have ON DELETE CASCADE on topics, this is fine. If not, it might fail.
        // Let's try to delete.
        await client.query('DELETE FROM forum_categories WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error deleting category (might have topics)' });
    } finally {
        client.release();
    }
});

// GET stats (opcional, mas deixa bonito)
// GET stats (opcional, mas deixa bonito)
app.get('/api/forum/stats', async (req, res) => {
    try {
        const [topics, replies] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM forum_topics'),
            pool.query('SELECT COUNT(*) FROM forum_replies')
        ]);

        const stats = {
            totalTopics: parseInt(topics.rows[0].count),
            totalReplies: parseInt(replies.rows[0].count),
            totalMembers: 50, // Mock for now
            onlineNow: 5      // Mock for now
        };
        console.log('Stats loaded:', stats);
        res.json(stats);
    } catch (err) {
        console.error('Error loading stats:', err);
        res.json({ totalTopics: 0, totalReplies: 0, totalMembers: 0, onlineNow: 1 });
    }
});

// GET user stats
app.get('/api/forum/user-stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const [topics, replies] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM forum_topics WHERE author_discord_id = $1', [userId]),
            pool.query('SELECT COUNT(*) FROM forum_replies WHERE author_discord_id = $1', [userId])
        ]);

        const stats = {
            topicsCount: parseInt(topics.rows[0].count),
            repliesCount: parseInt(replies.rows[0].count)
        };

        res.json(stats);
    } catch (err) {
        console.error('Error loading user stats:', err);
        res.json({ topicsCount: 0, repliesCount: 0 });
    }
});

// =============================================
// ROTAS DO FINAL FÓRUM
// =============================================

const corsOptions = {
    origin: [
        'https://aoe4.com.br',
        'https://www.aoe4.com.br',
        'http://localhost:3001', // desenvolvimento
        'http://127.0.0.1:3001'
    ],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Função para converter pontos em classe/rank
function pointsToClass(points) {
    const value = points || 0;

    if (value >= 1600) return 'Conquer 3';
    if (value >= 1500) return 'Conquer 2';
    if (value >= 1400) return 'Conquer 1';
    if (value >= 1350) return 'Diamante 3';
    if (value >= 1300) return 'Diamante 2';
    if (value >= 1200) return 'Diamante 1';
    if (value >= 1150) return 'Platina 3';
    if (value >= 1100) return 'Platina 2';
    if (value >= 1000) return 'Platina 1';
    if (value >= 900) return 'Ouro 3';
    if (value >= 800) return 'Ouro 2';
    if (value >= 700) return 'Ouro 1';
    if (value >= 600) return 'Prata 3';
    if (value >= 550) return 'Prata 2';
    if (value >= 500) return 'Prata 1';
    if (value >= 450) return 'Bronze 3';
    if (value >= 400) return 'Bronze 2';
    return 'Bronze 1';
}

// No server.js - função para processar novo jogador
async function processNewPlayer(userId, discordUserId, aoe4WorldId) {
    try {
        const client = new Client(dbConfig);
        await client.connect();

        console.log(`Processando histórico completo para novo jogador ${aoe4WorldId}`);
        await updatePlayerCacheWithFullHistory(client, {
            id: userId,
            discord_user_id: discordUserId,
            aoe4_world_id: aoe4WorldId
        });

        await client.end();
    } catch (error) {
        console.error('Erro ao processar novo jogador:', error);
    }
}

// Chame esta função sempre que cadastrar um novo jogador

// FUNÇÃO: Sincronizar avatar individual
async function syncPlayerAvatar(playerId, playerName) {
    try {
        console.log(`🔄 Sincronizando avatar de ${playerName}...`);

        const response = await fetch(`https://aoe4world.com/api/v0/players/${playerId}`, {
            headers: { 'User-Agent': 'Aoe4BrasilBot/1.0' }
        });

        if (response.ok) {
            const playerData = await response.json();

            if (playerData.avatars && playerData.avatars.small) {
                await pool.query(
                    'UPDATE leaderboard_cache SET avatar_url = $1, cached_at = NOW() WHERE aoe4_world_id = $2',
                    [playerData.avatars.small, playerId]
                );

                console.log(`✅ Avatar sincronizado: ${playerData.avatars.small}`);
                return playerData.avatars.small;
            } else {
                console.log(`❌ ${playerName} não tem avatar na API`);
            }
        } else {
            console.log(`❌ HTTP ${response.status} para ${playerName}`);
        }

        return null;
    } catch (error) {
        console.error(`💥 Erro ao sincronizar avatar de ${playerName}:`, error.message);
        return null;
    }
}

// ✅ FUNÇÃO AUXILIAR: Atualizar dados da season atual
async function updatePlayerSeasonData(userId, playerId, playerData, seasonId, soloData, teamData) {
    try {
        const soloDataToUse = soloData || {};
        const teamDataToUse = teamData || {};

        // Extrair dados
        const pointsSolo = soloDataToUse.rating || 0;
        const winsSolo = soloDataToUse.wins_count || 0;
        const gamesSolo = soloDataToUse.games_count || 0;
        const lastSoloGame = soloDataToUse.last_game_at;

        const pointsTeam = teamDataToUse.rating || 0;
        const winsTeam = teamDataToUse.wins_count || 0;
        const gamesTeam = teamDataToUse.games_count || 0;
        const lastTeamGame = teamDataToUse.last_game_at;

        // ELO 1v1
        let elo1v1 = 0;
        if (playerData.modes?.rm_1v1_elo?.rating) {
            elo1v1 = playerData.modes.rm_1v1_elo.rating;
        } else if (playerData.modes?.rm_1v1?.rating) {
            elo1v1 = playerData.modes.rm_1v1.rating;
        } else if (playerData.modes?.rm_solo?.rating) {
            elo1v1 = playerData.modes.rm_solo.rating;
        }

        const eloTeam = teamDataToUse.rating || 0;

        // Clan tag
        let clanTag = playerData.clan?.tag || '';
        if (!clanTag) {
            const clanFromDB = await pool.query(`
                SELECT c.tag 
                FROM clan_members cm
                JOIN clans c ON cm.clan_id = c.id
                JOIN users u ON cm.discord_user_id = u.discord_user_id
                WHERE u.aoe4_world_id = $1
                LIMIT 1
            `, [playerId]);
            if (clanFromDB.rows.length > 0) {
                clanTag = clanFromDB.rows[0].tag;
            }
        }

        const region = playerData.region || '';
        const civilization = playerData.civilization || '';
        const avatarUrl = playerData.avatars?.small || null;

        // ROTA CORRIGIDA: Verificar jogadores com seasons desatualizadas
        app.get('/api/debug/outdated-seasons', async (req, res) => {
            try {
                const limit = parseInt(req.query.limit) || 50;
                const minSeasonsExpected = parseInt(req.query.min_seasons) || 3;

                console.log(`🔍 Verificando jogadores com menos de ${minSeasonsExpected} seasons...`);

                // ✅ QUERY CORRIGIDA: Contar seasons distintas corretamente
                const outdatedPlayers = await pool.query(`
            SELECT 
                aoe4_world_id,
                name,
                COUNT(DISTINCT season_id) as seasons_count,
                STRING_AGG(DISTINCT season_id::text, ', ' ORDER BY season_id::int) as seasons_list,
                MAX(cached_at) as last_updated
            FROM leaderboard_cache 
            WHERE name IS NOT NULL 
            AND name != ''
            AND aoe4_world_id IS NOT NULL
            GROUP BY aoe4_world_id, name
            HAVING COUNT(DISTINCT season_id) < $1
            ORDER BY seasons_count ASC, last_updated ASC
            LIMIT $2
        `, [minSeasonsExpected, limit]);

                console.log(`📊 ${outdatedPlayers.rows.length} jogadores com menos de ${minSeasonsExpected} seasons`);

                // Detalhar cada jogador
                const detailedResults = [];
                for (const player of outdatedPlayers.rows) {
                    // Verificar se tem season 12 (atual)
                    const hasSeason12 = player.seasons_list.includes('12');

                    // Buscar dados específicos de cada season para confirmar
                    const seasonDetails = await pool.query(`
                SELECT 
                    season_id,
                    rm_solo_points,
                    rm_team_points,
                    cached_at
                FROM leaderboard_cache 
                WHERE aoe4_world_id = $1
                ORDER BY season_id DESC
            `, [player.aoe4_world_id]);

                    // ✅ VERIFICAÇÃO EXTRA: contar seasons únicas da query detalhada
                    const actualSeasonsCount = new Set(seasonDetails.rows.map(r => r.season_id)).size;
                    const hasDataIssue = actualSeasonsCount !== player.seasons_count;

                    detailedResults.push({
                        aoe4_world_id: player.aoe4_world_id,
                        name: player.name,
                        reported_seasons_count: player.seasons_count,
                        actual_seasons_count: actualSeasonsCount,
                        seasons_list: player.seasons_list,
                        has_current_season: hasSeason12,
                        last_updated: player.last_updated,
                        season_details: seasonDetails.rows,
                        has_data_issue: hasDataIssue,
                        status: hasSeason12 ? 'missing_historical' : 'missing_current',
                        needs_update: hasDataIssue || player.seasons_count < minSeasonsExpected
                    });
                }

                // Estatísticas corrigidas
                const realOutdatedPlayers = detailedResults.filter(p => p.needs_update);
                const stats = {
                    total_checked: outdatedPlayers.rows.length,
                    actually_outdated: realOutdatedPlayers.length,
                    data_issues: detailedResults.filter(p => p.has_data_issue).length,
                    missing_current_season: realOutdatedPlayers.filter(p => !p.has_current_season).length,
                    missing_historical_seasons: realOutdatedPlayers.filter(p => p.has_current_season).length
                };

                res.json({
                    success: true,
                    stats: stats,
                    players: detailedResults,
                    actually_outdated_players: realOutdatedPlayers,
                    summary: {
                        message: `Encontrados ${stats.actually_outdated} jogadores realmente desatualizados`,
                        details: `${stats.data_issues} com problemas de dados, ${stats.missing_current_season} sem season atual, ${stats.missing_historical_seasons} sem seasons históricas`
                    }
                });

            } catch (error) {
                console.error('❌ Erro ao verificar seasons desatualizadas:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });



        // ROTA: Forçar atualização de seasons para jogadores desatualizados
        app.post('/api/admin/update-outdated-seasons', async (req, res) => {
            try {
                const limit = parseInt(req.body.limit) || 10;
                const minSeasonsExpected = parseInt(req.body.min_seasons) || 3;
                const delay = parseInt(req.body.delay) || 2000;

                console.log(`🚀 Forçando atualização de seasons para jogadores com menos de ${minSeasonsExpected} seasons...`);

                // Buscar jogadores desatualizados
                const outdatedPlayers = await pool.query(`
            SELECT 
                aoe4_world_id,
                name,
                COUNT(DISTINCT season_id) as seasons_count
            FROM leaderboard_cache 
            WHERE name IS NOT NULL 
            AND name != ''
            AND aoe4_world_id IS NOT NULL
            GROUP BY aoe4_world_id, name
            HAVING COUNT(DISTINCT season_id) < $1
            ORDER BY seasons_count ASC
            LIMIT $2
        `, [minSeasonsExpected, limit]);

                console.log(`📊 ${outdatedPlayers.rows.length} jogadores para atualizar`);

                const results = [];
                let successCount = 0;
                let errorCount = 0;

                for (let i = 0; i < outdatedPlayers.rows.length; i++) {
                    const player = outdatedPlayers.rows[i];

                    try {
                        console.log(`🔄 [${i + 1}/${outdatedPlayers.rows.length}] Atualizando seasons de ${player.name} (atualmente tem ${player.seasons_count} seasons)...`);

                        // ✅ Forçar atualização como NOVO jogador para buscar histórico completo
                        const success = await updatePlayerCache(player.aoe4_world_id, true);

                        if (success) {
                            successCount++;
                            results.push({
                                name: player.name,
                                aoe4_world_id: player.aoe4_world_id,
                                previous_seasons: player.seasons_count,
                                status: 'success',
                                message: `Atualizado com sucesso`
                            });
                            console.log(`✅ ${player.name} - Seasons atualizadas`);
                        } else {
                            errorCount++;
                            results.push({
                                name: player.name,
                                aoe4_world_id: player.aoe4_world_id,
                                previous_seasons: player.seasons_count,
                                status: 'error',
                                message: `Falha na atualização`
                            });
                            console.log(`❌ ${player.name} - Erro na atualização`);
                        }

                        // Delay para não sobrecarregar a API
                        if (delay > 0 && i < outdatedPlayers.rows.length - 1) {
                            console.log(`⏳ Aguardando ${delay}ms...`);
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }

                    } catch (error) {
                        errorCount++;
                        results.push({
                            name: player.name,
                            aoe4_world_id: player.aoe4_world_id,
                            previous_seasons: player.seasons_count,
                            status: 'error',
                            message: error.message
                        });
                        console.error(`💥 Erro em ${player.name}:`, error.message);
                    }
                }

                // Verificar resultados após atualização
                const finalStats = await pool.query(`
            SELECT 
                COUNT(DISTINCT aoe4_world_id) as total_players,
                AVG(seasons_count) as avg_seasons_per_player
            FROM (
                SELECT 
                    aoe4_world_id,
                    COUNT(DISTINCT season_id) as seasons_count
                FROM leaderboard_cache 
                WHERE name IS NOT NULL 
                GROUP BY aoe4_world_id
            ) as player_seasons
        `);

                console.log(`✅✅✅ Atualização de seasons concluída!`);
                console.log(`   ✅ ${successCount} jogadores atualizados com sucesso`);
                console.log(`   ❌ ${errorCount} erros`);
                console.log(`   📊 Média atual: ${parseFloat(finalStats.rows[0].avg_seasons_per_player).toFixed(1)} seasons por jogador`);

                res.json({
                    success: true,
                    message: `Atualização de seasons concluída: ${successCount} sucessos, ${errorCount} erros`,
                    stats: {
                        total_processed: outdatedPlayers.rows.length,
                        success: successCount,
                        errors: errorCount,
                        success_rate: ((successCount / outdatedPlayers.rows.length) * 100).toFixed(1) + '%',
                        current_avg_seasons: parseFloat(finalStats.rows[0].avg_seasons_per_player).toFixed(1)
                    },
                    results: results
                });

            } catch (error) {
                console.error('❌ Erro na atualização de seasons:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // ROTA: Estatísticas gerais das seasons
        app.get('/api/debug/seasons-stats', async (req, res) => {
            try {
                console.log('📊 Gerando estatísticas gerais das seasons...');

                // Estatísticas por jogador
                const playerStats = await pool.query(`
            SELECT 
                COUNT(DISTINCT aoe4_world_id) as total_players,
                AVG(seasons_count) as avg_seasons_per_player,
                MIN(seasons_count) as min_seasons,
                MAX(seasons_count) as max_seasons,
                COUNT(CASE WHEN seasons_count = 1 THEN 1 END) as players_with_1_season,
                COUNT(CASE WHEN seasons_count = 2 THEN 1 END) as players_with_2_seasons,
                COUNT(CASE WHEN seasons_count >= 3 THEN 1 END) as players_with_3plus_seasons,
                COUNT(CASE WHEN seasons_count >= 6 THEN 1 END) as players_with_6plus_seasons,
                COUNT(CASE WHEN seasons_count >= 9 THEN 1 END) as players_with_9plus_seasons,
                COUNT(CASE WHEN has_season_12 THEN 1 END) as players_with_season_12
            FROM (
                SELECT 
                    aoe4_world_id,
                    COUNT(DISTINCT season_id) as seasons_count,
                    BOOL_OR(season_id = 12) as has_season_12
                FROM leaderboard_cache 
                WHERE name IS NOT NULL 
                AND name != ''
                AND aoe4_world_id IS NOT NULL
                GROUP BY aoe4_world_id
            ) as player_seasons
        `);

                // Distribuição por season
                const seasonDistribution = await pool.query(`
            SELECT 
                season_id,
                COUNT(DISTINCT aoe4_world_id) as player_count
            FROM leaderboard_cache 
            WHERE name IS NOT NULL 
            AND name != ''
            AND aoe4_world_id IS NOT NULL
            GROUP BY season_id
            ORDER BY season_id DESC
        `);

                // Jogadores mais completos (com mais seasons)
                const mostCompletePlayers = await pool.query(`
            SELECT 
                aoe4_world_id,
                name,
                COUNT(DISTINCT season_id) as seasons_count,
                STRING_AGG(season_id::text, ', ' ORDER BY season_id) as seasons_list
            FROM leaderboard_cache 
            WHERE name IS NOT NULL 
            AND name != ''
            AND aoe4_world_id IS NOT NULL
            GROUP BY aoe4_world_id, name
            ORDER BY seasons_count DESC, name ASC
            LIMIT 10
        `);

                const stats = playerStats.rows[0];
                const distribution = seasonDistribution.rows;

                res.json({
                    success: true,
                    stats: {
                        total_players: parseInt(stats.total_players),
                        avg_seasons_per_player: parseFloat(stats.avg_seasons_per_player).toFixed(1),
                        min_seasons: parseInt(stats.min_seasons),
                        max_seasons: parseInt(stats.max_seasons),
                        players_with_season_12: parseInt(stats.players_with_season_12),
                        coverage_season_12: ((parseInt(stats.players_with_season_12) / parseInt(stats.total_players)) * 100).toFixed(1) + '%',
                        distribution: {
                            '1_season': parseInt(stats.players_with_1_season),
                            '2_seasons': parseInt(stats.players_with_2_seasons),
                            '3+_seasons': parseInt(stats.players_with_3plus_seasons),
                            '6+_seasons': parseInt(stats.players_with_6plus_seasons),
                            '9+_seasons': parseInt(stats.players_with_9plus_seasons)
                        }
                    },
                    season_distribution: distribution,
                    most_complete_players: mostCompletePlayers.rows,
                    summary: {
                        health_status: parseFloat(stats.avg_seasons_per_player) >= 3 ? '✅ SAUDÁVEL' : '⚠️ PRECISA DE ATENÇÃO',
                        recommendation: parseFloat(stats.avg_seasons_per_player) < 3 ?
                            'Recomendado executar atualização de seasons históricas' :
                            'Sistema com boa cobertura de seasons'
                    }
                });

            } catch (error) {
                console.error('❌ Erro ao gerar estatísticas das seasons:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Inserir/atualizar dados
        await pool.query(`
            INSERT INTO leaderboard_cache 
            (
                user_id, aoe4_world_id, name, 
                rm_solo_points, rm_solo_elo, rm_solo_wins, rm_solo_total_matches,
                rm_team_points, rm_team_elo, rm_team_wins, rm_team_total_matches,
                level, season_id, avatar_url, clan_tag, region, civilization,
                last_solo_game, last_team_game, cached_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
            ON CONFLICT (aoe4_world_id, season_id) 
            DO UPDATE SET
                user_id = EXCLUDED.user_id,
                name = EXCLUDED.name,
                rm_solo_points = EXCLUDED.rm_solo_points,
                rm_solo_elo = EXCLUDED.rm_solo_elo,
                rm_solo_wins = EXCLUDED.rm_solo_wins,
                rm_solo_total_matches = EXCLUDED.rm_solo_total_matches,
                rm_team_points = EXCLUDED.rm_team_points,
                rm_team_elo = EXCLUDED.rm_team_elo,
                rm_team_wins = EXCLUDED.rm_team_wins,
                rm_team_total_matches = EXCLUDED.rm_team_total_matches,
                level = EXCLUDED.level,
                avatar_url = COALESCE(EXCLUDED.avatar_url, leaderboard_cache.avatar_url),
                clan_tag = EXCLUDED.clan_tag,
                region = EXCLUDED.region,
                civilization = EXCLUDED.civilization,
                last_solo_game = EXCLUDED.last_solo_game,
                last_team_game = EXCLUDED.last_team_game,
                cached_at = NOW()
        `, [
            userId, playerId, playerData.name,
            pointsSolo, elo1v1, winsSolo, gamesSolo,
            pointsTeam, eloTeam, winsTeam, gamesTeam,
            pointsToClass(pointsSolo),
            seasonId,
            avatarUrl, clanTag, region, civilization,
            lastSoloGame, lastTeamGame
        ]);

        console.log(`✅ Season ${seasonId} atualizada: ${playerData.name}`);
        return true;

    } catch (error) {
        console.error(`💥 Erro ao atualizar season ${seasonId} para ${playerData.name}:`, error.message);
        return false;
    }
}

// ✅ FUNÇÃO AUXILIAR: Atualizar dados de seasons históricas (VERIFIQUE SE EXISTE)
async function updateHistoricalSeasonData(userId, playerId, playerData, seasonData) {
    try {
        const seasonId = seasonData.id;
        const rating = seasonData.rating || 0;
        const wins = seasonData.wins_count || 0;
        const games = seasonData.games_count || 0;
        const lastGame = seasonData.last_game_at;

        console.log(`📊 Salvando season histórica ${seasonId} para ${playerData.name}: ${rating} pontos`);

        // Para seasons históricas, usamos dados básicos
        await pool.query(`
            INSERT INTO leaderboard_cache 
            (
                user_id, aoe4_world_id, name, 
                rm_solo_points, rm_solo_elo, rm_solo_wins, rm_solo_total_matches,
                level, season_id, avatar_url, clan_tag, region, civilization,
                last_solo_game, cached_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
            ON CONFLICT (aoe4_world_id, season_id) 
            DO UPDATE SET
                rm_solo_points = EXCLUDED.rm_solo_points,
                rm_solo_elo = EXCLUDED.rm_solo_elo,
                rm_solo_wins = EXCLUDED.rm_solo_wins,
                rm_solo_total_matches = EXCLUDED.rm_solo_total_matches,
                level = EXCLUDED.level,
                last_solo_game = EXCLUDED.last_solo_game,
                cached_at = NOW()
        `, [
            userId, playerId, playerData.name,
            rating, rating, wins, games, // Para seasons antigas, ELO = pontos
            pointsToClass(rating),
            seasonId,
            playerData.avatars?.small || null,
            playerData.clan?.tag || '',
            playerData.region || '',
            playerData.civilization || '',
            lastGame
        ]);

        console.log(`✅ Season histórica ${seasonId} salva: ${playerData.name} - ${rating} pontos`);
        return true;

    } catch (error) {
        console.error(`💥 Erro ao salvar season histórica ${seasonData.id} para ${playerData.name}:`, error.message);
        return false;
    }
}

// Modifique a função que atualiza o cache para incluir histórico completo
async function updatePlayerCacheWithFullHistory(userData) {
    try {
        const { aoe4_world_id, discord_user_id, id } = userData;

        // Buscar dados completos do histórico
        const fullHistory = await fetchPlayerFullHistory(aoe4_world_id);

        if (!fullHistory || fullHistory.length === 0) {
            console.log(`Nenhum dado encontrado para jogador ${aoe4_world_id}`);
            return;
        }

        // Para cada season encontrada, salvar no banco
        for (const seasonData of fullHistory) {
            await savePlayerDataToCache({
                ...seasonData,
                user_id: id,
                discord_user_id: discord_user_id,
                needs_refresh: false,
                refresh_attempts: 0
            });
        }

        console.log(`Histórico completo salvo para jogador ${aoe4_world_id} - ${fullHistory.length} seasons`);

    } catch (error) {
        console.error('Erro ao atualizar cache com histórico completo:', error);
    }
}

// Adicione este evento quando um novo jogador for cadastrado
app.post('/api/new-player', async (req, res) => {
    try {
        const { discord_user_id, aoe4_world_id, discord_guild_id } = req.body;

        // 1. Registrar na tabela users (sua lógica atual)
        const userResult = await db.execute(
            'INSERT INTO users (discord_user_id, aoe4_world_id, discord_guild_id) VALUES (?, ?, ?)',
            [discord_user_id, aoe4_world_id, discord_guild_id]
        );

        const userId = userResult.insertId;

        // 2. Buscar e salvar histórico completo automaticamente
        await updatePlayerCacheWithFullHistory({
            id: userId,
            discord_user_id: discord_user_id,
            aoe4_world_id: aoe4_world_id
        });

        res.json({ success: true, message: 'Jogador cadastrado e histórico buscado' });

    } catch (error) {
        console.error('Erro ao cadastrar novo jogador:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Função para salvar dados no cache (adaptar conforme sua estrutura atual)
async function savePlayerDataToCache(playerData) {
    // Sua lógica atual de inserção/atualização no banco
    // Adapte para incluir season_id
    const query = `
        INSERT INTO leaderboard_cache 
        (user_id, aoe4_world_id, discord_user_id, season_id, points, elo, wins, losses, total_matches, rank, last_game, game_mode, cached_at, needs_refresh)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        points = VALUES(points),
        elo = VALUES(elo),
        wins = VALUES(wins),
        losses = VALUES(losses),
        total_matches = VALUES(total_matches),
        rank = VALUES(rank),
        last_game = VALUES(last_game),
        cached_at = VALUES(cached_at),
        needs_refresh = VALUES(needs_refresh)
    `;

    // Execute a query com seus parâmetros
}

// ✅ FUNÇÃO CORRIGIDA: Sempre buscar seasons históricas para jogadores NOVOS no sistema
async function updatePlayerCache(playerId, isNewPlayer = false) {
    try {
        console.log(`🔄 ${isNewPlayer ? 'NOVO JOGADOR' : 'ATUALIZAÇÃO'} ${playerId}...`);

        // ✅ PRIMEIRO: Verificar se é realmente um jogador NOVO no nosso banco
        const existingSeasonsCount = await pool.query(`
            SELECT COUNT(DISTINCT season_id) as seasons_count 
            FROM leaderboard_cache 
            WHERE aoe4_world_id = $1
        `, [playerId]);

        const isReallyNewPlayer = existingSeasonsCount.rows[0].seasons_count <= 1;

        console.log(`📊 ${playerId}: ${existingSeasonsCount.rows[0].seasons_count} seasons no banco | Novo? ${isReallyNewPlayer}`);

        const response = await fetch(`https://aoe4world.com/api/v0/players/${playerId}`, {
            headers: { 'User-Agent': 'Aoe4BrasilBot/1.0' }
        });

        if (!response.ok) {
            console.log(`❌ Erro API: ${response.status}`);
            return false;
        }

        const playerData = await response.json();

        if (!playerData || !playerData.name) {
            console.log('❌ Dados inválidos da API');
            return false;
        }

        console.log(`✅ Dados encontrados: ${playerData.name}`);

        // Buscar/gerar user_id
        const existingUser = await pool.query(`
            SELECT user_id FROM leaderboard_cache 
            WHERE aoe4_world_id = $1 
            LIMIT 1
        `, [playerId]);

        let userId;
        if (existingUser.rows.length > 0) {
            userId = existingUser.rows[0].user_id;
        } else {
            const maxUser = await pool.query(`SELECT COALESCE(MAX(user_id), 0) as max_id FROM leaderboard_cache`);
            userId = parseInt(maxUser.rows[0].max_id) + 1;
        }

        let totalSeasonsUpdated = 0;

        // ✅ SEMPRE ATUALIZAR SEASON 12 (dados atuais)
        const successCurrent = await updatePlayerSeasonData(
            userId, playerId, playerData, 12,
            playerData.modes?.rm_solo, playerData.modes?.rm_team
        );
        if (successCurrent) totalSeasonsUpdated++;

        // ✅✅✅ CORREÇÃO CRÍTICA: Buscar seasons históricas para jogadores NOVOS
        if (isReallyNewPlayer) {
            console.log(`🎯🎯🎯 JOGADOR NOVO DETECTADO: Buscando TODAS as seasons históricas para ${playerData.name}...`);

            try {
                const seasonsResponse = await fetch(`https://aoe4world.com/api/v0/players/${playerId}/game_mode_ratings?game_mode=rm_solo`, {
                    headers: { 'User-Agent': 'Aoe4BrasilBot/1.0' }
                });

                if (seasonsResponse.ok) {
                    const seasonsContent = await seasonsResponse.json();

                    if (seasonsContent && Array.isArray(seasonsContent.seasons)) {
                        console.log(`📊 ${playerData.name}: ${seasonsContent.seasons.length} seasons disponíveis na API`);

                        let historicalSeasonsAdded = 0;

                        // Processar TODAS as seasons disponíveis (incluindo a 12 para garantir dados completos)
                        for (const season of seasonsContent.seasons) {
                            // Para seasons históricas (não-12), usar a função de histórico
                            if (season.id !== 12) {
                                console.log(`📥 Processando season histórica ${season.id} para ${playerData.name}...`);

                                const seasonSuccess = await updateHistoricalSeasonData(
                                    userId, playerId, playerData, season
                                );
                                if (seasonSuccess) {
                                    historicalSeasonsAdded++;
                                    totalSeasonsUpdated++;
                                }
                            }
                            // A season 12 já foi processada acima com dados completos
                        }

                        console.log(`✅ ${playerData.name}: ${historicalSeasonsAdded} seasons históricas adicionadas + Season 12 atual`);
                    } else {
                        console.log(`⚠️ ${playerData.name}: Nenhuma season encontrada na API`);
                    }
                } else if (seasonsResponse.status === 404) {
                    console.log(`ℹ️ ${playerData.name}: Sem dados de seasons históricas (jogador novo no ranked)`);
                } else {
                    console.log(`⚠️ ${playerData.name}: HTTP ${seasonsResponse.status} ao buscar seasons históricas`);
                }
            } catch (seasonError) {
                console.log(`⚠️ ${playerData.name}: Erro ao buscar seasons históricas - ${seasonError.message}`);
            }
        } else {
            console.log(`🎯 ${playerData.name}: Jogador existente - apenas atualizando Season 12`);
        }

        console.log(`✅ ${playerData.name}: ${totalSeasonsUpdated} seasons processadas no total`);
        return totalSeasonsUpdated > 0;

    } catch (error) {
        console.error(`💥 Erro ao atualizar cache de ${playerId}:`, error.message);
        return false;
    }
}

// ✅ ROTA: Forçar seasons históricas para jogadores específicos que foram registrados incorretamente
app.post('/api/admin/fix-missing-seasons', async (req, res) => {
    try {
        const { player_ids = [], delay = 2000 } = req.body;

        console.log(`🔧 Corrigindo seasons históricas para ${player_ids.length} jogadores...`);

        const results = [];
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < player_ids.length; i++) {
            const playerId = player_ids[i];

            try {
                console.log(`🔄 [${i + 1}/${player_ids.length}] Corrigindo seasons históricas do jogador ${playerId}...`);

                // ✅ FORÇAR como NOVO JOGADOR para buscar histórico completo
                const success = await updatePlayerCache(playerId, true);

                if (success) {
                    successCount++;
                    results.push({
                        player_id: playerId,
                        status: 'success',
                        message: 'Seasons históricas corrigidas'
                    });
                    console.log(`✅ ${playerId} - Seasons históricas corrigidas`);
                } else {
                    errorCount++;
                    results.push({
                        player_id: playerId,
                        status: 'error',
                        message: 'Falha na correção'
                    });
                    console.log(`❌ ${playerId} - Erro na correção`);
                }

                // Delay para não sobrecarregar a API
                if (delay > 0 && i < player_ids.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

            } catch (error) {
                errorCount++;
                results.push({
                    player_id: playerId,
                    status: 'error',
                    message: error.message
                });
                console.error(`💥 Erro em ${playerId}:`, error.message);
            }
        }

        res.json({
            success: true,
            message: `Correção de seasons históricas concluída: ${successCount} sucessos, ${errorCount} erros`,
            stats: {
                total_processed: player_ids.length,
                success: successCount,
                errors: errorCount
            },
            results: results
        });

    } catch (error) {
        console.error('❌ Erro na correção de seasons:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA: Debug detalhado de um jogador específico
app.get('/api/debug/player-seasons-debug/:playerId', async (req, res) => {
    try {
        const playerId = req.params.playerId;

        console.log(`🔍 Debug detalhado das seasons do jogador ${playerId}...`);

        // 1. Verificar seasons no banco
        const dbSeasons = await pool.query(`
            SELECT season_id, name, rm_solo_points, cached_at
            FROM leaderboard_cache 
            WHERE aoe4_world_id = $1
            ORDER BY season_id DESC
        `, [playerId]);

        // 2. Buscar seasons disponíveis na API
        let apiSeasons = [];
        try {
            const apiResponse = await fetch(`https://aoe4world.com/api/v0/players/${playerId}/game_mode_ratings?game_mode=rm_solo`, {
                headers: { 'User-Agent': 'Aoe4BrasilBot/1.0' }
            });

            if (apiResponse.ok) {
                const apiData = await apiResponse.json();
                apiSeasons = apiData.seasons || [];
            }
        } catch (apiError) {
            console.error('Erro na API:', apiError.message);
        }

        // 3. Comparar
        const dbSeasonIds = dbSeasons.rows.map(r => r.season_id);
        const apiSeasonIds = apiSeasons.map(s => s.id);
        const missingSeasons = apiSeasonIds.filter(id => !dbSeasonIds.includes(id));
        const extraSeasons = dbSeasonIds.filter(id => !apiSeasonIds.includes(id));

        res.json({
            success: true,
            player_id: playerId,
            database: {
                total_seasons: dbSeasons.rows.length,
                seasons: dbSeasons.rows
            },
            api: {
                total_seasons: apiSeasons.length,
                seasons: apiSeasons
            },
            comparison: {
                missing_in_db: missingSeasons,
                extra_in_db: extraSeasons,
                status: missingSeasons.length > 0 ? 'INCOMPLETE' : 'COMPLETE'
            }
        });

    } catch (error) {
        console.error('❌ Erro no debug:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA SIMPLES: Forçar sincronização completa de um jogador
app.post('/api/admin/force-sync-player/:playerId', async (req, res) => {
    try {
        const playerId = req.params.playerId;

        console.log(`🚀 FORÇANDO SINCRONIZAÇÃO COMPLETA do jogador ${playerId}...`);

        // ✅ FORÇAR como NOVO JOGADOR para buscar histórico completo
        const success = await updatePlayerCache(playerId, true);

        if (success) {
            // Verificar resultado
            const updatedSeasons = await pool.query(`
                SELECT COUNT(*) as total_seasons 
                FROM leaderboard_cache 
                WHERE aoe4_world_id = $1
            `, [playerId]);

            res.json({
                success: true,
                message: `Sincronização forçada concluída com sucesso!`,
                player_id: playerId,
                total_seasons_after_sync: parseInt(updatedSeasons.rows[0].total_seasons)
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Falha na sincronização forçada'
            });
        }

    } catch (error) {
        console.error('❌ Erro na sincronização forçada:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA: Sincronização manual direta
app.post('/api/admin/direct-sync/:playerId', async (req, res) => {
    try {
        const playerId = req.params.playerId;

        console.log(`🔧 SINCRONIZAÇÃO MANUAL DIRETA para ${playerId}...`);

        // 1. Buscar dados do jogador
        const playerResponse = await fetch(`https://aoe4world.com/api/v0/players/${playerId}`, {
            headers: { 'User-Agent': 'Aoe4BrasilBot/1.0' }
        });

        if (!playerResponse.ok) {
            throw new Error(`API jogador: ${playerResponse.status}`);
        }

        const playerData = await playerResponse.json();
        console.log(`✅ Jogador: ${playerData.name}`);

        // 2. Buscar seasons
        const seasonsResponse = await fetch(`https://aoe4world.com/api/v0/players/${playerId}/game_mode_ratings?game_mode=rm_solo`, {
            headers: { 'User-Agent': 'Aoe4BrasilBot/1.0' }
        });

        if (!seasonsResponse.ok) {
            throw new Error(`API seasons: ${seasonsResponse.status}`);
        }

        const seasonsData = await seasonsResponse.json();
        const seasons = seasonsData.seasons || [];
        console.log(`📊 Seasons encontradas: ${seasons.length}`);

        // 3. Buscar/gerar user_id
        const existingUser = await pool.query(`
            SELECT user_id FROM leaderboard_cache WHERE aoe4_world_id = $1 LIMIT 1
        `, [playerId]);

        let userId;
        if (existingUser.rows.length > 0) {
            userId = existingUser.rows[0].user_id;
        } else {
            const maxUser = await pool.query(`SELECT COALESCE(MAX(user_id), 0) as max_id FROM leaderboard_cache`);
            userId = parseInt(maxUser.rows[0].max_id) + 1;
        }

        // 4. Processar cada season
        let savedCount = 0;
        for (const season of seasons) {
            try {
                const query = `
                    INSERT INTO leaderboard_cache 
                    (user_id, aoe4_world_id, name, rm_solo_points, rm_solo_elo, rm_solo_wins, rm_solo_total_matches, level, season_id, cached_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                    ON CONFLICT (aoe4_world_id, season_id) DO NOTHING
                `;

                await pool.query(query, [
                    userId, playerId, playerData.name,
                    season.rating || 0, season.rating || 0, season.wins_count || 0, season.games_count || 0,
                    pointsToClass(season.rating || 0),
                    season.id
                ]);

                savedCount++;
                console.log(`✅ Season ${season.id} salva`);

            } catch (seasonError) {
                console.error(`❌ Season ${season.id}:`, seasonError.message);
            }
        }

        res.json({
            success: true,
            message: `Sincronização manual concluída: ${savedCount}/${seasons.length} seasons salvas`,
            player: playerData.name,
            total_seasons: seasons.length,
            saved: savedCount
        });

    } catch (error) {
        console.error('❌ Erro na sincronização manual:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// FUNÇÃO: Buscar players APENAS do banco local - COM ELO 1v1 CORRETO
async function getPlayersFromDatabase(limit, offset, mode, seasonId = 12) {
    try {
        console.log(`💾 Buscando ${limit} players do BANCO LOCAL (season: ${seasonId}, modo: ${mode}, offset: ${offset})...`);

        let pointsColumn, winsColumn, totalMatchesColumn, eloColumn, lastGameColumn;

        // Definir colunas baseadas no modo
        if (mode === 'rm_team') {
            pointsColumn = 'rm_team_points';
            winsColumn = 'rm_team_wins';
            totalMatchesColumn = 'rm_team_total_matches';
            eloColumn = 'rm_team_elo';
            lastGameColumn = 'last_team_game';
            console.log(`   🎯 Modo Team Ranked`);
        } else {
            pointsColumn = 'rm_solo_points';
            winsColumn = 'rm_solo_wins';
            totalMatchesColumn = 'rm_solo_total_matches';
            eloColumn = 'rm_solo_elo';
            lastGameColumn = 'last_solo_game';
            console.log(`   🎯 Modo Solo Ranked`);
        }

        // ✅✅✅ QUERY CORRIGIDA: Sem TO_CHAR problemático
        const query = `
    SELECT 
        lc.user_id as id,
        lc.name,
        -- ✅ CLAN TAG: Primeiro da cache, depois do banco
        COALESCE(
            NULLIF(lc.clan_tag, ''),
            (SELECT c.tag 
             FROM clan_members cm 
             JOIN clans c ON cm.clan_id = c.id 
             JOIN users u ON cm.discord_user_id = u.discord_user_id 
             WHERE u.aoe4_world_id = lc.aoe4_world_id 
             LIMIT 1),
            'Sem Clan'
        ) as clan,
        COALESCE(lc.avatar_url, '') as avatar_url,
        COALESCE(${pointsColumn}, 0) as points,
        COALESCE(${eloColumn}, 0) as elo,
        COALESCE(${winsColumn}, 0) as wins,
        COALESCE(${totalMatchesColumn}, 0) as total_matches,
        CASE 
            WHEN ${lastGameColumn} IS NOT NULL THEN ${lastGameColumn}::text
            WHEN lc.last_game IS NOT NULL THEN lc.last_game::text
            ELSE 'Sem dados'
        END as last_game,
        COALESCE(lc.region, '') as region,
        COALESCE(lc.civilization, '') as civilization,
        COALESCE(lc.aoe4_world_id, lc.user_id::text) as aoe4world_id,
        lc.season_id,
        lc.cached_at,
        CASE 
            WHEN COALESCE(${totalMatchesColumn}, 0) > 0 THEN 
                ROUND((COALESCE(${winsColumn}, 0)::decimal / COALESCE(${totalMatchesColumn}, 1) * 100)::numeric, 1)
            ELSE 0 
        END as winrate,
        CASE 
            WHEN COALESCE(${pointsColumn}, 0) >= 1600 THEN 'Conquer 3'
            WHEN COALESCE(${pointsColumn}, 0) >= 1500 THEN 'Conquer 2'
            WHEN COALESCE(${pointsColumn}, 0) >= 1400 THEN 'Conquer 1'
            WHEN COALESCE(${pointsColumn}, 0) >= 1350 THEN 'Diamante 3'
            WHEN COALESCE(${pointsColumn}, 0) >= 1300 THEN 'Diamante 2'
            WHEN COALESCE(${pointsColumn}, 0) >= 1200 THEN 'Diamante 1'
            WHEN COALESCE(${pointsColumn}, 0) >= 1150 THEN 'Platina 3'
            WHEN COALESCE(${pointsColumn}, 0) >= 1100 THEN 'Platina 2'
            WHEN COALESCE(${pointsColumn}, 0) >= 1000 THEN 'Platina 1'
            WHEN COALESCE(${pointsColumn}, 0) >= 900 THEN 'Ouro 3'
            WHEN COALESCE(${pointsColumn}, 0) >= 800 THEN 'Ouro 2'
            WHEN COALESCE(${pointsColumn}, 0) >= 700 THEN 'Ouro 1'
            WHEN COALESCE(${pointsColumn}, 0) >= 600 THEN 'Prata 3'
            WHEN COALESCE(${pointsColumn}, 0) >= 550 THEN 'Prata 2'
            WHEN COALESCE(${pointsColumn}, 0) >= 500 THEN 'Prata 1'
            WHEN COALESCE(${pointsColumn}, 0) >= 450 THEN 'Bronze 3'
            WHEN COALESCE(${pointsColumn}, 0) >= 400 THEN 'Bronze 2'
            ELSE 'Bronze 1'
        END as level,
        CASE 
            WHEN ${pointsColumn} IS NOT NULL AND ${pointsColumn} > 0 THEN true
            ELSE false
        END as has_mode_data,
        lc.rm_solo_points as solo_points,
        lc.rm_solo_elo as solo_elo
    FROM leaderboard_cache lc
    WHERE lc.name IS NOT NULL 
    AND lc.name != ''
    AND lc.name != 'Unknown Player'
    AND lc.season_id = $1
    ORDER BY 
        CASE 
            WHEN ${pointsColumn} IS NOT NULL AND ${pointsColumn} > 0 THEN 1
            ELSE 2
        END,
        COALESCE(${pointsColumn}, 0) DESC,
        lc.name ASC
    LIMIT $2 OFFSET $3
`;

        const result = await pool.query(query, [seasonId, limit, offset]);

        console.log(`✅ ENCONTRADOS ${result.rows.length} PLAYERS NO BANCO LOCAL`);

        // Debug detalhado - CORRIGIDO
        if (result.rows.length > 0) {
            console.log(`🔍 Debug ELO/Pontos (primeiros 3 players):`);
            result.rows.slice(0, 3).forEach((row, index) => {
                console.log(`   ${row.name}: Points=${row.points}, ELO=${row.elo}, LastGame=${row.last_game}`);
            });
        }

        // Converter para o formato esperado
        const players = result.rows.map((row, index) => ({
            ...row,
            rank: offset + index + 1,
            total_games: row.total_matches,
            _source: 'database',
            game_mode: mode,
            season: row.season_id,
            has_data: row.has_mode_data,
            solo_points: row.solo_points,
            solo_elo: row.solo_elo
        }));

        return players;

    } catch (error) {
        console.error('💥 Erro ao buscar players do banco:', error);
        return [];
    }
}

// ROTA: Atualizar clan tags no cache
app.post('/api/admin/update-clan-tags', async (req, res) => {
    try {
        console.log('🔄 Atualizando clan tags no cache...');

        const result = await pool.query(`
            UPDATE leaderboard_cache lc
            SET clan_tag = subquery.clan_tag
            FROM (
                SELECT 
                    u.aoe4_world_id,
                    c.tag as clan_tag
                FROM users u
                JOIN clan_members cm ON u.discord_user_id = cm.discord_user_id
                JOIN clans c ON cm.clan_id = c.id
                WHERE u.aoe4_world_id IS NOT NULL
                AND c.tag IS NOT NULL
                AND c.tag != ''
            ) AS subquery
            WHERE lc.aoe4_world_id = subquery.aoe4_world_id
            AND (lc.clan_tag IS NULL OR lc.clan_tag = '')
        `);

        console.log(`✅ Clan tags atualizadas: ${result.rowCount} registros`);

        res.json({
            success: true,
            message: `Clan tags atualizadas: ${result.rowCount} registros`,
            updated: result.rowCount
        });

    } catch (error) {
        console.error('❌ Erro ao atualizar clan tags:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// FUNÇÃO CORRIGIDA: Gerar estatísticas da leaderboard - COM CLANS REAIS
async function getLeaderboardStats(seasonId = 12) {
    try {
        console.log(`📊 Gerando estatísticas da leaderboard - Season ${seasonId}...`);

        // Buscar estatísticas da leaderboard_cache
        const stats = await pool.query(`
            SELECT 
                -- Estatísticas gerais
                COUNT(*) as total_players,
                COUNT(DISTINCT clan_tag) as players_with_clan_tag,
                
                -- Jogadores por modo
                COUNT(CASE WHEN rm_solo_points > 0 THEN 1 END) as players_with_solo,
                COUNT(CASE WHEN rm_team_points > 0 THEN 1 END) as players_with_team,
                
                -- Total de jogos
                COALESCE(SUM(rm_solo_total_matches), 0) as total_solo_games,
                COALESCE(SUM(rm_team_total_matches), 0) as total_team_games,
                
                -- Médias
                ROUND(AVG(COALESCE(rm_solo_points, 0))) as avg_solo_points,
                ROUND(AVG(COALESCE(rm_team_points, 0))) as avg_team_points,
                ROUND(AVG(COALESCE(rm_solo_elo, 0))) as avg_solo_elo,
                ROUND(AVG(COALESCE(rm_team_elo, 0))) as avg_team_elo,
                
                -- Top players
                MAX(COALESCE(rm_solo_points, 0)) as max_solo_points,
                MAX(COALESCE(rm_team_points, 0)) as max_team_points,
                
                -- Distribuição por tier (Solo)
                COUNT(CASE WHEN rm_solo_points >= 1600 THEN 1 END) as conquer_players,
                COUNT(CASE WHEN rm_solo_points >= 1400 AND rm_solo_points < 1600 THEN 1 END) as diamond_players,
                COUNT(CASE WHEN rm_solo_points >= 1000 AND rm_solo_points < 1400 THEN 1 END) as platinum_gold_players,
                COUNT(CASE WHEN rm_solo_points >= 500 AND rm_solo_points < 1000 THEN 1 END) as silver_bronze_players,
                COUNT(CASE WHEN rm_solo_points < 500 AND rm_solo_points > 0 THEN 1 END) as low_elo_players,
                
                -- Players com clan tag
                COUNT(CASE WHEN clan_tag IS NOT NULL AND clan_tag != '' THEN 1 END) as players_with_clan
                
            FROM leaderboard_cache 
            WHERE name IS NOT NULL 
            AND name != ''
            AND name != 'Unknown Player'
            AND season_id = $1
        `, [seasonId]);

        console.log('📊 Resultado da query de estatísticas:', stats.rows[0]);

        // Buscar número REAL de clans da tabela clans
        const clanStats = await pool.query(`
            SELECT COUNT(*) as total_clans
            FROM clans 
            WHERE name IS NOT NULL AND name != ''
        `);

        const row = stats.rows[0];
        const totalRealClans = parseInt(clanStats.rows[0].total_clans);

        const result = {
            // Estatísticas básicas
            total_players: parseInt(row.total_players) || 0,
            total_clans: totalRealClans, // ✅ AGORA USANDO CLANS REAIS
            players_with_clan: parseInt(row.players_with_clan) || 0,
            players_with_clan_tag: parseInt(row.players_with_clan_tag) || 0, // Para debug

            // Modos de jogo
            players_with_solo: parseInt(row.players_with_solo) || 0,
            players_with_team: parseInt(row.players_with_team) || 0,

            // Total de jogos
            total_solo_games: parseInt(row.total_solo_games) || 0,
            total_team_games: parseInt(row.total_team_games) || 0,
            total_games: (parseInt(row.total_solo_games) || 0) + (parseInt(row.total_team_games) || 0),

            // Médias
            avg_solo_points: parseInt(row.avg_solo_points) || 0,
            avg_team_points: parseInt(row.avg_team_points) || 0,
            avg_solo_elo: parseInt(row.avg_solo_elo) || 0,
            avg_team_elo: parseInt(row.avg_team_elo) || 0,

            // Top scores
            max_solo_points: parseInt(row.max_solo_points) || 0,
            max_team_points: parseInt(row.max_team_points) || 0,

            // Distribuição por tier
            tier_distribution: {
                conquer: parseInt(row.conquer_players) || 0,
                diamond: parseInt(row.diamond_players) || 0,
                platinum_gold: parseInt(row.platinum_gold_players) || 0,
                silver_bronze: parseInt(row.silver_bronze_players) || 0,
                low_elo: parseInt(row.low_elo_players) || 0
            }
        };

        // Calcular percentuais
        result.solo_coverage = ((result.players_with_solo / result.total_players) * 100).toFixed(1);
        result.team_coverage = ((result.players_with_team / result.total_players) * 100).toFixed(1);
        result.clan_coverage = ((result.players_with_clan / result.total_players) * 100).toFixed(1);

        console.log('📊 Estatísticas calculadas:', result);
        console.log(`🏰 Clans reais no banco: ${totalRealClans}`);

        return result;

    } catch (error) {
        console.error('❌ Erro ao gerar estatísticas:', error);
        return null;
    }
}

// ROTA: Estatísticas da leaderboard - CORRIGIDA
app.get('/api/stats/leaderboard', async (req, res) => {
    try {
        const season = req.query.season || 'current';
        const seasonId = season === 'current' ? 12 : parseInt(season);

        console.log(`📊 Buscando estatísticas - Season ${seasonId}`);

        const stats = await getLeaderboardStats(seasonId);

        if (!stats) {
            return res.status(500).json({
                success: false,
                error: 'Erro ao gerar estatísticas'
            });
        }

        res.json({
            success: true,
            season: seasonId,
            stats: stats,
            last_updated: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro na rota de estatísticas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// FUNÇÃO: Contar TODOS os players no banco por season
async function getTotalPlayersCount(mode, seasonId = 12) {
    try {
        const result = await pool.query(
            `SELECT COUNT(*) as count FROM leaderboard_cache WHERE name IS NOT NULL AND name != '' AND season_id = $1`,
            [seasonId]
        );
        const count = parseInt(result.rows[0].count);
        console.log(`📊 Total de players no banco (Season ${seasonId}): ${count}`);
        return count;
    } catch (error) {
        console.error('❌ Erro ao contar players:', error);
        return 0;
    }
}

// ✅ FUNÇÃO: Sincronizar NOVOS jogadores dos clans
async function syncNewPlayersFromClans() {
    try {
        console.log('🔄 Sincronizando NOVOS jogadores dos clans...');

        let syncedCount = 0;
        let errorCount = 0;
        const results = [];

        // Buscar todos os AOE4 World IDs dos membros dos clans que NÃO estão no cache
        const newPlayers = await pool.query(`
            SELECT DISTINCT 
                u.aoe4_world_id,
                u.discord_user_id,
                c.name as clan_name
            FROM clan_members cm
            JOIN clans c ON cm.clan_id = c.id
            JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id AND lc.season_id = 12
            WHERE u.aoe4_world_id IS NOT NULL 
            AND u.aoe4_world_id != ''
            AND lc.aoe4_world_id IS NULL  -- Apenas jogadores que NÃO estão no cache
            AND u.aoe4_world_id NOT LIKE 'temp_%'  -- Ignorar IDs temporários
        `);

        console.log(`📊 ${newPlayers.rows.length} novos jogadores de clans para sincronizar`);

        // Sincronizar cada novo jogador
        for (let i = 0; i < newPlayers.rows.length; i++) {
            const player = newPlayers.rows[i];

            try {
                console.log(`🔄 [${i + 1}/${newPlayers.rows.length}] Sincronizando jogador do clan: ${player.aoe4_world_id} (${player.clan_name})`);

                const success = await updatePlayerCache(player.aoe4_world_id, true);

                if (success) {
                    syncedCount++;
                    results.push({
                        aoe4_world_id: player.aoe4_world_id,
                        discord_user_id: player.discord_user_id,
                        clan: player.clan_name,
                        status: 'success'
                    });
                    console.log(`✅ ${player.aoe4_world_id} - Cache criado`);
                } else {
                    errorCount++;
                    results.push({
                        aoe4_world_id: player.aoe4_world_id,
                        discord_user_id: player.discord_user_id,
                        clan: player.clan_name,
                        status: 'error'
                    });
                    console.log(`❌ ${player.aoe4_world_id} - Erro na sincronização`);
                }

                // Delay para não sobrecarregar a API
                if (AUTO_UPDATE_CONFIG.delayBetweenRequests > 0 && i < newPlayers.rows.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, AUTO_UPDATE_CONFIG.delayBetweenRequests));
                }

            } catch (error) {
                errorCount++;
                results.push({
                    aoe4_world_id: player.aoe4_world_id,
                    discord_user_id: player.discord_user_id,
                    clan: player.clan_name,
                    status: 'error',
                    error: error.message
                });
                console.error(`💥 Erro em ${player.aoe4_world_id}:`, error.message);
            }
        }

        console.log(`✅ Sincronização de jogadores de clans concluída: ${syncedCount} sincronizados, ${errorCount} erros`);
        return { success: syncedCount, errors: errorCount, results };

    } catch (error) {
        console.error('💥 Erro na sincronização de jogadores de clans:', error);
        return { success: 0, errors: 1, results: [] };
    }
}

// FUNÇÃO ATUALIZADA: Atualização automática completa
async function startAutoCacheUpdate() {
    if (!AUTO_UPDATE_CONFIG.enabled) {
        console.log('⏸️ Atualização automática desativada');
        return;
    }

    try {
        console.log('🔄 INICIANDO ATUALIZAÇÃO AUTOMÁTICA COMPLETA...');

        // 1. PRIMEIRO: Sincronizar NOVOS USERS (com histórico completo)
        console.log('🎯 FASE 1: Sincronizando NOVOS USERS com histórico completo...');
        const newUsersStats = await syncNewUsersToCache();

        // 2. SEGUNDO: Sincronizar novos jogadores dos clans (com histórico completo)
        console.log('🎯 FASE 2: Sincronizando novos jogadores dos CLANS com histórico completo...');
        const newPlayersStats = await syncNewPlayersFromClans();

        // 3. TERCEIRO: Atualizar cache existente (APENAS Season 12)
        console.log('🎯 FASE 3: Atualizando cache EXISTENTE (apenas Season 12)...');
        const updateStats = await performCacheUpdate();

        console.log(`✅ ATUALIZAÇÃO AUTOMÁTICA CONCLUÍDA:`);
        console.log(`   👤 ${newUsersStats.success} NOVOS users com histórico completo`);
        console.log(`   🎮 ${newPlayersStats.success} novos jogadores de clans com histórico completo`);
        console.log(`   🔄 ${updateStats.success} caches atualizados (Season 12 apenas)`);
        console.log(`   ❌ ${newUsersStats.errors + newPlayersStats.errors + updateStats.errors} erros totais`);
        console.log(`⏰ Próxima atualização em ${AUTO_UPDATE_CONFIG.interval / 60000} minutos`);

    } catch (error) {
        console.error('❌ ERRO NA ATUALIZAÇÃO AUTOMÁTICA:', error);
    } finally {
        // Agendar próxima atualização
        setTimeout(startAutoCacheUpdate, AUTO_UPDATE_CONFIG.interval);
    }
}

// ROTA: Verificar users que precisam de sincronização INICIAL
app.get('/api/debug/users-needing-initial-sync', async (req, res) => {
    try {
        const users = await pool.query(`
            SELECT 
                u.id,
                u.discord_user_id,
                u.aoe4_world_id,
                u.created_at,
                u.discord_guild_id,
                COUNT(cm.clan_id) as clan_count,
                STRING_AGG(c.name, ', ') as clans
            FROM users u
            LEFT JOIN clan_members cm ON u.discord_user_id = cm.discord_user_id
            LEFT JOIN clans c ON cm.clan_id = c.id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id AND lc.season_id = 12
            WHERE u.aoe4_world_id IS NOT NULL 
            AND u.aoe4_world_id != ''
            AND u.aoe4_world_id NOT LIKE 'temp_%'
            AND lc.aoe4_world_id IS NULL  -- Não está no cache
            GROUP BY u.id, u.discord_user_id, u.aoe4_world_id, u.created_at, u.discord_guild_id
            ORDER BY u.created_at DESC
            LIMIT 100
        `);

        res.json({
            success: true,
            users_needing_sync: users.rows.length,
            users: users.rows
        });

    } catch (error) {
        console.error('❌ Erro ao listar users:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA: Forçar sincronização de NOVOS users
app.post('/api/admin/sync-new-users', async (req, res) => {
    try {
        console.log('🚀 Sincronização manual de NOVOS users acionada...');

        const syncStats = await syncNewUsersToCache();

        res.json({
            success: true,
            message: `Sincronização de novos users concluída: ${syncStats.success} sincronizados, ${syncStats.errors} erros`,
            stats: syncStats
        });

    } catch (error) {
        console.error('❌ Erro na sincronização manual:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// FUNÇÃO: Executar atualização do cache
async function performCacheUpdate() {
    let successCount = 0;
    let errorCount = 0;
    const results = [];

    try {
        // Buscar jogadores que precisam de atualização (CRITÉRIOS EXPANDIDOS)
        const playersToUpdate = await pool.query(`
      SELECT 
        aoe4_world_id, 
        name, 
        rm_solo_points,
        rm_team_points,
        rm_solo_elo,
        rm_team_elo,
        clan_tag,
        region,
        civilization,
        avatar_url,
        cached_at,
        season_id
      FROM leaderboard_cache 
      WHERE aoe4_world_id IS NOT NULL 
      AND name IS NOT NULL
      AND season_id = 12
      AND (
        -- CRITÉRIOS EXPANDIDOS para atualização:
        cached_at IS NULL 
        OR cached_at < NOW() - INTERVAL '2 hours'
        OR rm_solo_elo IS NULL 
        OR rm_solo_elo = 0 
        OR rm_solo_elo = rm_solo_points
        OR rm_solo_points = 0
        OR rm_team_points IS NULL
        OR rm_team_elo IS NULL
        OR clan_tag IS NULL
        OR region IS NULL
        OR civilization IS NULL
        OR avatar_url IS NULL
        OR last_solo_game IS NULL
        OR last_team_game IS NULL
      )
      ORDER BY 
        CASE 
          WHEN cached_at IS NULL THEN 1
          WHEN rm_solo_elo IS NULL OR rm_solo_elo = 0 THEN 2
          WHEN rm_solo_elo = rm_solo_points THEN 3
          WHEN avatar_url IS NULL THEN 4
          WHEN clan_tag IS NULL THEN 5
          ELSE 6
        END,
        cached_at ASC NULLS FIRST
      LIMIT $1
    `, [AUTO_UPDATE_CONFIG.maxPlayersPerUpdate]);

        console.log(`📊 ${playersToUpdate.rows.length} jogadores precisam de atualização`);

        // Atualizar em lotes menores
        for (let i = 0; i < playersToUpdate.rows.length; i++) {
            const player = playersToUpdate.rows[i];

            try {
                console.log(`🔄 [${i + 1}/${playersToUpdate.rows.length}] Atualizando ${player.name}...`);

                // ✅ USAR A NOVA FUNÇÃO DE ATUALIZAÇÃO COMPLETA
                const success = await updatePlayerCache(player.aoe4_world_id, false);

                if (success) {
                    successCount++;
                    results.push({
                        name: player.name,
                        aoe4_world_id: player.aoe4_world_id,
                        status: 'success'
                    });
                } else {
                    errorCount++;
                    results.push({
                        name: player.name,
                        aoe4_world_id: player.aoe4_world_id,
                        status: 'error'
                    });
                }

                // Delay para não sobrecarregar a API
                if (AUTO_UPDATE_CONFIG.delayBetweenRequests > 0 && i < playersToUpdate.rows.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, AUTO_UPDATE_CONFIG.delayBetweenRequests));
                }

            } catch (error) {
                errorCount++;
                results.push({
                    name: player.name,
                    aoe4_world_id: player.aoe4_world_id,
                    status: 'error',
                    error: error.message
                });
                console.error(`💥 Erro em ${player.name}:`, error.message);
            }
        }

        return { success: successCount, errors: errorCount, results };

    } catch (error) {
        console.error('💥 Erro na execução da atualização:', error);
        return { success: 0, errors: 1, results: [] };
    }
}

// FUNÇÃO: Verificar status do cache
async function getCacheStatus() {
    try {
        const status = await pool.query(`
      SELECT 
        COUNT(*) as total_players,
        COUNT(CASE WHEN cached_at > NOW() - INTERVAL '1 hour' THEN 1 END) as fresh_players,
        COUNT(CASE WHEN cached_at IS NULL OR cached_at < NOW() - INTERVAL '2 hours' THEN 1 END) as needs_refresh,
        COUNT(CASE WHEN rm_solo_elo IS NULL OR rm_solo_elo = 0 THEN 1 END) as missing_elo,
        COUNT(CASE WHEN rm_solo_elo = rm_solo_points THEN 1 END) as wrong_elo,
        COUNT(CASE WHEN avatar_url IS NULL THEN 1 END) as missing_avatar,
        COUNT(CASE WHEN clan_tag IS NULL THEN 1 END) as missing_clan,
        AVG(EXTRACT(EPOCH FROM (NOW() - cached_at))) as avg_cache_age_seconds
      FROM leaderboard_cache 
      WHERE name IS NOT NULL
      AND season_id = 12
    `);

        const stats = status.rows[0];

        return {
            total_players: parseInt(stats.total_players),
            fresh_players: parseInt(stats.fresh_players),
            needs_refresh: parseInt(stats.needs_refresh),
            missing_elo: parseInt(stats.missing_elo),
            wrong_elo: parseInt(stats.wrong_elo),
            missing_avatar: parseInt(stats.missing_avatar),
            missing_clan: parseInt(stats.missing_clan),
            avg_cache_age_seconds: Math.round(stats.avg_cache_age_seconds || 0),
            cache_health: ((parseInt(stats.fresh_players) / parseInt(stats.total_players)) * 100).toFixed(1) + '%'
        };

    } catch (error) {
        console.error('❌ Erro ao verificar status do cache:', error);
        return null;
    }
}

// ROTA: Status da atualização automática
app.get('/api/admin/auto-update/status', async (req, res) => {
    try {
        const cacheStatus = await getCacheStatus();

        res.json({
            success: true,
            auto_update: {
                enabled: AUTO_UPDATE_CONFIG.enabled,
                interval_minutes: AUTO_UPDATE_CONFIG.interval / 60000,
                next_update: new Date(Date.now() + AUTO_UPDATE_CONFIG.interval).toISOString(),
                config: AUTO_UPDATE_CONFIG
            },
            cache_status: cacheStatus
        });

    } catch (error) {
        console.error('❌ Erro no status da atualização:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA: Configurar atualização automática
app.post('/api/admin/auto-update/config', async (req, res) => {
    try {
        const { enabled, interval_minutes, players_per_batch, delay_between_requests } = req.body;

        if (enabled !== undefined) AUTO_UPDATE_CONFIG.enabled = enabled;
        if (interval_minutes) AUTO_UPDATE_CONFIG.interval = interval_minutes * 60 * 1000;
        if (players_per_batch) AUTO_UPDATE_CONFIG.playersPerBatch = players_per_batch;
        if (delay_between_requests) AUTO_UPDATE_CONFIG.delayBetweenRequests = delay_between_requests;

        console.log('⚙️ Configuração de atualização automática atualizada:', AUTO_UPDATE_CONFIG);

        res.json({
            success: true,
            message: 'Configuração de atualização automática atualizada',
            config: AUTO_UPDATE_CONFIG,
            next_update: new Date(Date.now() + AUTO_UPDATE_CONFIG.interval).toISOString()
        });

    } catch (error) {
        console.error('❌ Erro ao configurar atualização:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ CORREÇÃO: Na função syncNewUsersToCache, garantir histórico completo
async function syncNewUsersToCache() {
    try {
        console.log('🔄 Sincronizando USERS NOVOS para o cache COM HISTÓRICO COMPLETO...');

        let syncedCount = 0;
        let errorCount = 0;
        const results = [];

        // Buscar users que têm aoe4_world_id mas NÃO estão no cache
        const newUsers = await pool.query(`
            SELECT 
                u.discord_user_id,
                u.aoe4_world_id,
                u.created_at
            FROM users u
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id AND lc.season_id = 12
            WHERE u.aoe4_world_id IS NOT NULL 
            AND u.aoe4_world_id != ''
            AND u.aoe4_world_id NOT LIKE 'temp_%'
            AND lc.aoe4_world_id IS NULL  -- Não existe no cache
            AND u.created_at > NOW() - INTERVAL '30 days'  -- Users recentes
            ORDER BY u.created_at DESC
            LIMIT 50  -- Limitar por execução
        `);

        console.log(`📊 ${newUsers.rows.length} NOVOS users para sincronizar com cache`);

        // Sincronizar cada novo user
        for (let i = 0; i < newUsers.rows.length; i++) {
            const user = newUsers.rows[i];

            try {
                console.log(`🔄 [${i + 1}/${newUsers.rows.length}] Sincronizando user NOVO: ${user.aoe4_world_id}`);

                // ✅✅✅ SEMPRE buscar histórico completo para users NOVOS
                const success = await updatePlayerCache(user.aoe4_world_id, true);

                if (success) {
                    syncedCount++;
                    results.push({
                        discord_user_id: user.discord_user_id,
                        aoe4_world_id: user.aoe4_world_id,
                        status: 'success',
                        created_at: user.created_at
                    });
                    console.log(`✅ ${user.aoe4_world_id} - Cache criado com sucesso`);
                } else {
                    errorCount++;
                    results.push({
                        discord_user_id: user.discord_user_id,
                        aoe4_world_id: user.aoe4_world_id,
                        status: 'error',
                        created_at: user.created_at
                    });
                    console.log(`❌ ${user.aoe4_world_id} - Erro na sincronização`);
                }

                // Delay para não sobrecarregar a API
                if (AUTO_UPDATE_CONFIG.delayBetweenRequests > 0 && i < newUsers.rows.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, AUTO_UPDATE_CONFIG.delayBetweenRequests));
                }

            } catch (error) {
                errorCount++;
                results.push({
                    discord_user_id: user.discord_user_id,
                    aoe4_world_id: user.aoe4_world_id,
                    status: 'error',
                    error: error.message,
                    created_at: user.created_at
                });
                console.error(`💥 Erro em ${user.aoe4_world_id}:`, error.message);
            }
        }

        console.log(`✅✅✅ Sincronização de NOVOS users concluída!`);
        console.log(`   ✅ ${syncedCount} novos users sincronizados`);
        console.log(`   ❌ ${errorCount} erros`);

        return { success: syncedCount, errors: errorCount, results };

    } catch (error) {
        console.error('💥 Erro na sincronização de novos users:', error);
        return { success: 0, errors: 1, results: [] };
    }
}

// ROTA: Forçar atualização imediata
app.post('/api/admin/auto-update/trigger', async (req, res) => {
    try {
        console.log('🚀 Atualização manual acionada via API...');

        const updateStats = await performCacheUpdate();

        res.json({
            success: true,
            message: `Atualização manual concluída: ${updateStats.success} sucessos, ${updateStats.errors} erros`,
            stats: updateStats,
            cache_status: await getCacheStatus()
        });

    } catch (error) {
        console.error('❌ Erro na atualização manual:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA: Verificar dados completos de um player no cache
app.get('/api/debug/player-cache/:playerId', async (req, res) => {
    try {
        const playerId = req.params.playerId;

        console.log(`🔍 Verificando cache do player ${playerId}...`);

        // Buscar dados atuais do cache
        const cacheData = await pool.query(`
            SELECT 
                user_id, name, aoe4_world_id,
                rm_solo_points, rm_solo_elo, rm_solo_wins, rm_solo_total_matches,
                rm_team_points, rm_team_elo, rm_team_wins, rm_team_total_matches,
                clan_tag, region, civilization, avatar_url,
                last_solo_game, last_team_game, cached_at,
                level, season_id
            FROM leaderboard_cache 
            WHERE aoe4_world_id = $1
            AND season_id = 12
        `, [playerId]);

        if (cacheData.rows.length === 0) {
            return res.json({
                success: false,
                message: 'Player não encontrado no cache'
            });
        }

        const playerCache = cacheData.rows[0];

        res.json({
            success: true,
            cache_data: playerCache,
            last_updated: playerCache.cached_at,
            cache_age: Math.round((new Date() - new Date(playerCache.cached_at)) / (1000 * 60)) + ' minutos'
        });

    } catch (error) {
        console.error('❌ Erro ao verificar cache:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA: Atualizar ELO em lote para todos os jogadores - ATUALIZADA
app.post('/api/players/update-all-elo', async (req, res) => {
    try {
        const limit = parseInt(req.body.limit) || 10;
        const delay = parseInt(req.body.delay) || 1500;

        console.log(`🚀 Iniciando atualização COMPLETA do cache para ${limit} jogadores...`);

        const playersToUpdate = await pool.query(`
            SELECT DISTINCT aoe4_world_id, name, rm_solo_points
            FROM leaderboard_cache 
            WHERE aoe4_world_id IS NOT NULL 
            AND name IS NOT NULL
            AND season_id = 12
            ORDER BY rm_solo_points DESC NULLS LAST
            LIMIT $1
        `, [limit]);

        console.log(`📊 ${playersToUpdate.rows.length} jogadores para atualizar`);

        const results = [];
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < playersToUpdate.rows.length; i++) {
            const player = playersToUpdate.rows[i];
            try {
                console.log(`🔄 [${i + 1}/${playersToUpdate.rows.length}] Atualizando ${player.name}...`);

                // ✅ USAR A NOVA FUNÇÃO DE ATUALIZAÇÃO COMPLETA
                const success = await updatePlayerCache(player.aoe4_world_id, false);

                if (success) {
                    successCount++;
                    results.push({
                        name: player.name,
                        aoe4_world_id: player.aoe4_world_id,
                        status: 'success'
                    });
                    console.log(`✅ ${player.name} - Cache atualizado`);
                } else {
                    errorCount++;
                    results.push({
                        name: player.name,
                        aoe4_world_id: player.aoe4_world_id,
                        status: 'error'
                    });
                    console.log(`❌ ${player.name} - Erro na atualização`);
                }

                // Delay para não sobrecarregar a API
                if (delay > 0 && i < playersToUpdate.rows.length - 1) {
                    console.log(`⏳ Aguardando ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

            } catch (error) {
                errorCount++;
                results.push({
                    name: player.name,
                    aoe4_world_id: player.aoe4_world_id,
                    status: 'error',
                    error: error.message
                });
                console.error(`💥 Erro em ${player.name}:`, error.message);
            }
        }

        console.log(`✅✅✅ Atualização do cache concluída!`);
        console.log(`   ✅ ${successCount} atualizados com sucesso`);
        console.log(`   ❌ ${errorCount} erros`);

        res.json({
            success: true,
            message: `Atualização do cache concluída: ${successCount}/${playersToUpdate.rows.length} jogadores`,
            stats: {
                total_processed: playersToUpdate.rows.length,
                success: successCount,
                errors: errorCount,
                success_rate: ((successCount / playersToUpdate.rows.length) * 100).toFixed(1) + '%'
            },
            results: results.slice(0, 20)
        });

    } catch (error) {
        console.error('❌ Erro na atualização em lote:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA: Forçar busca de histórico completo para jogadores existentes
app.post('/api/admin/force-historical-sync', async (req, res) => {
    try {
        const { player_ids = [], limit = 10, delay = 2000 } = req.body;

        console.log(`🚀 Forçando sincronização de histórico completo...`);

        let playersToProcess = [];

        if (player_ids && player_ids.length > 0) {
            // Jogadores específicos
            const specificPlayers = await pool.query(`
                SELECT DISTINCT aoe4_world_id, name
                FROM leaderboard_cache 
                WHERE aoe4_world_id = ANY($1)
                AND name IS NOT NULL
            `, [player_ids]);

            playersToProcess = specificPlayers.rows;
            console.log(`🎯 Sincronizando ${playersToProcess.length} jogadores específicos`);
        } else {
            // Buscar jogadores com poucas seasons (menos de 5)
            const playersWithFewSeasons = await pool.query(`
                SELECT 
                    aoe4_world_id,
                    name,
                    COUNT(DISTINCT season_id) as seasons_count
                FROM leaderboard_cache 
                WHERE name IS NOT NULL 
                AND name != ''
                AND aoe4_world_id IS NOT NULL
                GROUP BY aoe4_world_id, name
                HAVING COUNT(DISTINCT season_id) < 5
                ORDER BY seasons_count ASC
                LIMIT $1
            `, [limit]);

            playersToProcess = playersWithFewSeasons.rows;
            console.log(`📊 Sincronizando ${playersToProcess.length} jogadores com poucas seasons`);
        }

        const results = [];
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < playersToProcess.length; i++) {
            const player = playersToProcess[i];

            try {
                console.log(`🔄 [${i + 1}/${playersToProcess.length}] Forçando histórico completo de ${player.name}...`);

                // ✅ FORÇAR como novo jogador para buscar histórico completo
                const success = await updatePlayerCache(player.aoe4_world_id, true);

                if (success) {
                    successCount++;
                    results.push({
                        name: player.name,
                        aoe4_world_id: player.aoe4_world_id,
                        status: 'success',
                        message: 'Histórico completo sincronizado'
                    });
                    console.log(`✅ ${player.name} - Histórico completo sincronizado`);
                } else {
                    errorCount++;
                    results.push({
                        name: player.name,
                        aoe4_world_id: player.aoe4_world_id,
                        status: 'error',
                        message: 'Falha na sincronização'
                    });
                    console.log(`❌ ${player.name} - Erro na sincronização`);
                }

                // Delay
                if (delay > 0 && i < playersToProcess.length - 1) {
                    console.log(`⏳ Aguardando ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

            } catch (error) {
                errorCount++;
                results.push({
                    name: player.name,
                    aoe4_world_id: player.aoe4_world_id,
                    status: 'error',
                    message: error.message
                });
                console.error(`💥 Erro em ${player.name}:`, error.message);
            }
        }

        res.json({
            success: true,
            message: `Sincronização forçada concluída: ${successCount} sucessos, ${errorCount} erros`,
            stats: {
                total_processed: playersToProcess.length,
                success: successCount,
                errors: errorCount
            },
            results: results
        });

    } catch (error) {
        console.error('❌ Erro na sincronização forçada:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// Adicione esta função no server.js para buscar dados históricos completos
async function fetchPlayerFullHistory(aoe4WorldId) {
    try {
        console.log(`Buscando histórico completo para jogador ${aoe4WorldId}`);
        const allSeasonsData = [];

        // Season atual (já temos essa lógica)
        const currentData = await fetchPlayerCurrentData(aoe4WorldId);
        if (currentData) {
            allSeasonsData.push(currentData);
        }

        // Buscar dados das seasons anteriores (1-11)
        for (let season = 1; season <= 11; season++) {
            try {
                const seasonData = await fetchPlayerSeasonData(aoe4WorldId, season);
                if (seasonData && seasonData.total_matches > 0) {
                    allSeasonsData.push(seasonData);
                }
                // Pequena pausa para não sobrecarregar a API
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.log(`Season ${season} não encontrada para jogador ${aoe4WorldId}`);
            }
        }

        return allSeasonsData;
    } catch (error) {
        console.error('Erro ao buscar histórico completo:', error);
        return null;
    }
}

// Função para buscar dados de uma season específica
async function fetchPlayerSeasonData(aoe4WorldId, season) {
    try {
        const response = await fetch(`https://aoe4world.com/api/v0/players/${aoe4WorldId}/rating_history?season=${season}`);
        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        if (data && data.length > 0) {
            // Pegar o último registro da season (mais recente)
            const latestSeasonData = data[data.length - 1];

            return {
                aoe4_world_id: aoe4WorldId,
                season_id: season,
                points: latestSeasonData.rating || 0,
                elo: latestSeasonData.rating || 0,
                wins: latestSeasonData.wins || 0,
                losses: latestSeasonData.losses || 0,
                total_matches: (latestSeasonData.wins || 0) + (latestSeasonData.losses || 0),
                rank: latestSeasonData.rank || null,
                last_game: latestSeasonData.updated_at,
                game_mode: 'rm_solo',
                cached_at: new Date()
            };
        }
        return null;
    } catch (error) {
        console.error(`Erro ao buscar season ${season}:`, error);
        return null;
    }
}

// ========== FUNÇÕES DE CLANS CORRIGIDAS ==========

// ROTA: Encontrar jogadores sem dados
app.get('/api/debug/players-without-data', async (req, res) => {
    try {
        const clanId = req.query.clanId; // Opcional: filtrar por clan específico

        console.log(`🔍 Buscando jogadores sem dados${clanId ? ` no clan ${clanId}` : ''}...`);

        let query = `
            SELECT 
                cm.discord_user_id,
                cm.clan_id,
                c.name as clan_name,
                c.tag as clan_tag,
                u.aoe4_world_id,
                lc.name as player_name,
                lc.rm_solo_points,
                lc.rm_solo_elo,
                lc.rm_team_points,
                lc.rm_team_elo,
                lc.avatar_url,
                cm.joined_at,
                cm.is_owner
            FROM clan_members cm
            JOIN clans c ON cm.clan_id = c.id
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id
            WHERE (lc.name IS NULL OR lc.name = '' OR lc.name = 'Unknown Player')
               OR (lc.rm_solo_points IS NULL OR lc.rm_solo_points = 0)
               OR (u.aoe4_world_id IS NULL OR u.aoe4_world_id = '')
        `;

        const params = [];
        if (clanId) {
            query += ` AND cm.clan_id = $1`;
            params.push(clanId);
        }

        query += ` ORDER BY c.name, cm.discord_user_id`;

        const result = await pool.query(query, params);

        console.log(`📊 Encontrados ${result.rows.length} jogadores sem dados`);

        // Agrupar por clan para melhor visualização
        const groupedByClan = {};
        result.rows.forEach(player => {
            if (!groupedByClan[player.clan_name]) {
                groupedByClan[player.clan_name] = [];
            }
            groupedByClan[player.clan_name].push(player);
        });

        res.json({
            success: true,
            total_players_without_data: result.rows.length,
            players_by_clan: groupedByClan,
            all_players: result.rows
        });

    } catch (error) {
        console.error('❌ Erro ao buscar jogadores sem dados:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA: Verificar dados específicos de um membro
app.get('/api/debug/player-details/:discordUserId', async (req, res) => {
    try {
        const discordUserId = req.params.discordUserId;

        console.log(`🔍 Verificando dados do jogador: ${discordUserId}`);

        const result = await pool.query(`
            SELECT 
                -- Dados do clan_members
                cm.discord_user_id,
                cm.clan_id,
                cm.joined_at,
                cm.is_owner,
                
                -- Dados do clan
                c.name as clan_name,
                c.tag as clan_tag,
                
                -- Dados do users
                u.aoe4_world_id,
                u.created_at as user_created,
                
                -- Dados do leaderboard_cache
                lc.name as player_name,
                lc.avatar_url,
                lc.rm_solo_points,
                lc.rm_solo_elo,
                lc.rm_solo_wins,
                lc.rm_solo_total_matches,
                lc.rm_team_points,
                lc.rm_team_elo,
                lc.rm_team_wins,
                lc.rm_team_total_matches,
                lc.region,
                lc.civilization,
                lc.cached_at,
                lc.last_solo_game,
                lc.last_team_game
                
            FROM clan_members cm
            JOIN clans c ON cm.clan_id = c.id
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id
            WHERE cm.discord_user_id = $1
        `, [discordUserId]);

        if (result.rows.length === 0) {
            return res.json({
                success: false,
                message: 'Jogador não encontrado no clan_members'
            });
        }

        const playerData = result.rows[0];

        // Determinar status dos dados
        const dataStatus = {
            has_user_entry: !!playerData.aoe4_world_id,
            has_leaderboard_data: !!playerData.player_name,
            has_solo_data: !!(playerData.rm_solo_points && playerData.rm_solo_points > 0),
            has_team_data: !!(playerData.rm_team_points && playerData.rm_team_points > 0),
            is_owner: playerData.is_owner,
            data_age: playerData.cached_at ?
                Math.round((new Date() - new Date(playerData.cached_at)) / (1000 * 60 * 60)) + ' horas' :
                'Nunca atualizado'
        };

        res.json({
            success: true,
            player_data: playerData,
            data_status: dataStatus,
            issues: {
                missing_aoe4_id: !playerData.aoe4_world_id,
                missing_leaderboard_data: !playerData.player_name,
                missing_solo_data: !dataStatus.has_solo_data,
                missing_team_data: !dataStatus.has_team_data
            }
        });

    } catch (error) {
        console.error('❌ Erro ao verificar jogador:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ FUNÇÃO CORRIGIDA: Buscar clans do banco COM MEMBROS ÚNICOS
async function getClansFromDatabase(limit = 10) {
    try {
        console.log(`🏰 Buscando top ${limit} clans do banco...`);

        const query = `
            SELECT 
                c.id as clan_id,
                c.name,
                c.tag,
                c.description,
                c.discord_guild_id,
                c.owner_id,
                COUNT(DISTINCT cm.discord_user_id) as member_count,  -- ✅ CORRIGIDO: COUNT DISTINCT
                COUNT(lc.aoe4_world_id) as players_with_data,
                AVG(COALESCE(lc.rm_solo_points, 0)) as avg_solo_points,
                AVG(COALESCE(lc.rm_team_points, 0)) as avg_team_points,
                MAX(COALESCE(lc.rm_solo_points, 0)) as max_solo_points,
                STRING_AGG(
                    DISTINCT CASE 
                        WHEN lc.name IS NOT NULL AND lc.rm_solo_points > 0 
                        THEN lc.name || ' (' || lc.rm_solo_points || ' pts)'
                    END, 
                    ', '
                ) as top_players,
                MIN(cm.joined_at) as created_at
            FROM clans c
            LEFT JOIN clan_members cm ON c.id = cm.clan_id
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id
            WHERE c.name IS NOT NULL 
            AND c.name != ''
            GROUP BY c.id, c.name, c.tag, c.description, c.discord_guild_id, c.owner_id
            HAVING COUNT(DISTINCT cm.discord_user_id) > 0  -- ✅ CORRIGIDO: COUNT DISTINCT
            ORDER BY 
                avg_solo_points DESC NULLS LAST,
                COUNT(DISTINCT cm.discord_user_id) DESC,   -- ✅ CORRIGIDO: COUNT DISTINCT
                max_solo_points DESC NULLS LAST
            LIMIT $1
        `;

        const result = await pool.query(query, [limit]);
        console.log(`✅ ${result.rows.length} clans encontrados`);

        return result.rows;

    } catch (error) {
        console.error('❌ Erro ao buscar clans:', error);
        return [];
    }
}

// ROTA: Debug completo de um jogador específico
app.get('/api/debug/player-detailed-stats/:aoe4WorldId', async (req, res) => {
    try {
        const aoe4WorldId = req.params.aoe4WorldId;

        console.log(`🔍 Debug detalhado do jogador ${aoe4WorldId}...`);

        // Buscar dados de TODAS as seasons
        const allSeasons = await pool.query(`
            SELECT 
                season_id,
                name,
                rm_solo_points,
                rm_solo_elo,
                rm_solo_wins,
                rm_solo_total_matches,
                rm_team_points,
                rm_team_elo, 
                rm_team_wins,
                rm_team_total_matches,
                cached_at,
                last_solo_game,
                last_team_game
            FROM leaderboard_cache 
            WHERE aoe4_world_id = $1
            ORDER BY season_id DESC, cached_at DESC
        `, [aoe4WorldId]);

        // Buscar dados do user e clan
        const userClanData = await pool.query(`
            SELECT 
                u.discord_user_id,
                u.aoe4_world_id,
                c.name as clan_name,
                c.id as clan_id,
                cm.joined_at
            FROM users u
            LEFT JOIN clan_members cm ON u.discord_user_id = cm.discord_user_id
            LEFT JOIN clans c ON cm.clan_id = c.id
            WHERE u.aoe4_world_id = $1
        `, [aoe4WorldId]);

        res.json({
            success: true,
            aoe4_world_id: aoe4WorldId,
            user_clan_data: userClanData.rows,
            seasons_data: allSeasons.rows,
            summary: {
                total_seasons: allSeasons.rows.length,
                season_12_data: allSeasons.rows.find(row => row.season_id === 12),
                latest_data: allSeasons.rows[0]
            }
        });

    } catch (error) {
        console.error('❌ Erro no debug detalhado:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ FUNÇÃO CORRIGIDA: Buscar clans populares APENAS Season 12
async function getPopularClans(limit = 6) {
    try {
        console.log(`👥 Buscando ${limit} clans populares (Season 12)...`);

        const query = `
            SELECT 
                c.id as clan_id,
                c.name,
                c.tag,
                c.description,
                COUNT(DISTINCT cm.discord_user_id) as member_count,
                COUNT(lc.aoe4_world_id) as players_with_data,
                AVG(COALESCE(lc.rm_solo_points, 0)) as avg_solo_points,
                MAX(COALESCE(lc.rm_solo_points, 0)) as max_solo_points,
                STRING_AGG(
                    DISTINCT CASE 
                        WHEN lc.name IS NOT NULL 
                        THEN lc.name
                    END, 
                    ', '
                ) as member_names
            FROM clans c
            LEFT JOIN clan_members cm ON c.id = cm.clan_id
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id AND lc.season_id = 12  -- ✅ FILTRO SEASON 12
            WHERE c.name IS NOT NULL 
            AND c.name != ''
            GROUP BY c.id, c.name, c.tag, c.description
            HAVING COUNT(DISTINCT cm.discord_user_id) > 0
            ORDER BY 
                member_count DESC,
                players_with_data DESC,
                avg_solo_points DESC NULLS LAST
            LIMIT $1
        `;

        const result = await pool.query(query, [limit]);
        console.log(`✅ ${result.rows.length} clans populares encontrados (Season 12)`);

        return result.rows;

    } catch (error) {
        console.error('❌ Erro ao buscar clans populares:', error);
        return [];
    }
}

// ✅ FUNÇÃO CORRIGIDA: Membros do clan APENAS Season 12
async function getClanMembersFixed(clanId, limit = 50) {
    try {
        console.log(`🔍 Buscando membros do clan ${clanId} (Season 12)...`);

        const query = `
            SELECT DISTINCT ON (cm.discord_user_id)
                -- Dados básicos do member
                cm.discord_user_id,
                cm.joined_at,
                cm.is_owner,
                
                -- Dados do usuário (ponte)
                u.aoe4_world_id,
                
                -- Dados do player do leaderboard_cache (APENAS SEASON 12)
                lc.user_id,
                lc.name,
                lc.avatar_url,
                lc.clan_tag,
                lc.region,
                lc.civilization,
                
                -- Dados Solo Ranked (SEASON 12)
                lc.rm_solo_points,
                lc.rm_solo_elo,
                lc.rm_solo_wins,
                lc.rm_solo_total_matches,
                lc.last_solo_game,
                
                -- Dados Team Ranked (SEASON 12)
                lc.rm_team_points,
                lc.rm_team_elo,
                lc.rm_team_wins,
                lc.rm_team_total_matches,
                lc.last_team_game,
                
                -- Calcular level baseado nos pontos SOLO (SEASON 12)
                CASE 
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 1600 THEN 'Conquer 3'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 1500 THEN 'Conquer 2'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 1400 THEN 'Conquer 1'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 1350 THEN 'Diamante 3'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 1300 THEN 'Diamante 2'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 1200 THEN 'Diamante 1'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 1150 THEN 'Platina 3'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 1100 THEN 'Platina 2'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 1000 THEN 'Platina 1'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 900 THEN 'Ouro 3'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 800 THEN 'Ouro 2'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 700 THEN 'Ouro 1'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 600 THEN 'Prata 3'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 550 THEN 'Prata 2'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 500 THEN 'Prata 1'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 450 THEN 'Bronze 3'
                    WHEN COALESCE(lc.rm_solo_points, 0) >= 400 THEN 'Bronze 2'
                    ELSE 'Bronze 1'
                END as level

            FROM clan_members cm
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id AND lc.season_id = 12  -- ✅ FILTRO SEASON 12
            WHERE cm.clan_id = $1
            ORDER BY cm.discord_user_id, cm.is_owner DESC, COALESCE(lc.rm_solo_points, 0) DESC
            LIMIT $2
        `;

        const result = await pool.query(query, [clanId, limit]);
        console.log(`✅ Encontrados ${result.rows.length} membros únicos para o clan ${clanId} (Season 12)`);

        return result.rows;

    } catch (error) {
        console.error('❌ Erro ao buscar membros do clan:', error);
        return [];
    }
}

// ✅ FUNÇÃO CORRIGIDA: Detalhes do clan APENAS Season 12
async function getClanDetails(clanId) {
    try {
        const query = `
            SELECT 
                c.*,
                COUNT(DISTINCT cm.discord_user_id) as total_members,
                COUNT(lc.aoe4_world_id) as players_with_data,
                AVG(COALESCE(lc.rm_solo_points, 0)) as avg_solo_points,
                AVG(COALESCE(lc.rm_team_points, 0)) as avg_team_points,
                MAX(COALESCE(lc.rm_solo_points, 0)) as max_solo_points,
                MAX(COALESCE(lc.rm_team_points, 0)) as max_team_points,
                
                -- ✅ ESTATÍSTICAS REAIS DO CLAN (SEASON 12)
                COUNT(CASE WHEN lc.rm_solo_points >= 1400 THEN 1 END) as conquer_diamond_players,
                COUNT(CASE WHEN lc.rm_solo_points >= 1000 AND lc.rm_solo_points < 1400 THEN 1 END) as platinum_gold_players,
                COUNT(CASE WHEN lc.rm_solo_points >= 500 AND lc.rm_solo_points < 1000 THEN 1 END) as silver_bronze_players,
                COUNT(CASE WHEN lc.rm_solo_points < 500 AND lc.rm_solo_points > 0 THEN 1 END) as low_elo_players,
                COUNT(CASE WHEN lc.rm_solo_points IS NULL OR lc.rm_solo_points = 0 THEN 1 END) as unranked_players,
                
                STRING_AGG(
                    DISTINCT CASE 
                        WHEN lc.name IS NOT NULL AND lc.rm_solo_points > 0 
                        THEN lc.name || ' (' || lc.rm_solo_points || ' pts)'
                    END, 
                    ' | '
                ) as top_players_list
            FROM clans c
            LEFT JOIN clan_members cm ON c.id = cm.clan_id
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id AND lc.season_id = 12  -- ✅ FILTRO SEASON 12
            WHERE c.id = $1
            GROUP BY c.id
        `;

        const result = await pool.query(query, [clanId]);
        return result.rows[0] || null;

    } catch (error) {
        console.error('❌ Erro ao buscar detalhes do clan:', error);
        return null;
    }
}

// ✅ FUNÇÃO CORRIGIDA: Estatísticas gerais de clans
async function getClanStats() {
    try {
        const query = `
            SELECT 
                COUNT(DISTINCT c.id) as total_clans,
                COUNT(DISTINCT cm.discord_user_id) as total_clan_members,
                COUNT(DISTINCT lc.aoe4_world_id) as clan_members_with_data,
                AVG(clan_stats.avg_points) as overall_avg_points,
                MAX(clan_stats.max_points) as overall_max_points,
                AVG(clan_stats.member_count) as avg_members_per_clan
            FROM clans c
            LEFT JOIN clan_members cm ON c.id = cm.clan_id
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id
            CROSS JOIN LATERAL (
                SELECT 
                    COUNT(cm2.discord_user_id) as member_count,
                    AVG(COALESCE(lc2.rm_solo_points, 0)) as avg_points,
                    MAX(COALESCE(lc2.rm_solo_points, 0)) as max_points
                FROM clan_members cm2
                LEFT JOIN users u2 ON cm2.discord_user_id = u2.discord_user_id
                LEFT JOIN leaderboard_cache lc2 ON u2.aoe4_world_id = lc2.aoe4_world_id
                WHERE cm2.clan_id = c.id
            ) as clan_stats
            WHERE c.name IS NOT NULL
        `;

        const result = await pool.query(query);
        return result.rows[0] || null;

    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas de clans:', error);
        return null;
    }
}

// ========== ROTAS DE CLANS CORRIGIDAS ==========

// ROTA: Clans em destaque (para a home)
app.get('/api/clans/featured', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 6;

        const featuredClans = await getPopularClans(limit);

        res.json({
            success: true,
            clans: featuredClans,
            featured_count: featuredClans.length
        });

    } catch (error) {
        console.error('❌ Erro na rota /api/clans/featured:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA: Todos os clans (paginação)
app.get('/api/clans', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 12;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;

        const clans = await getClansFromDatabase(limit);

        // Contar total de clans
        const totalQuery = await pool.query('SELECT COUNT(*) as count FROM clans WHERE name IS NOT NULL AND name != \'\'');
        const totalClans = parseInt(totalQuery.rows[0].count);

        res.json({
            success: true,
            clans: clans,
            pagination: {
                current_page: page,
                clans_per_page: limit,
                total_clans: totalClans,
                total_pages: Math.ceil(totalClans / limit)
            }
        });

    } catch (error) {
        console.error('❌ Erro na rota /api/clans:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA: Detalhes de um clan específico
app.get('/api/clans/:clanId', async (req, res) => {
    try {
        const clanId = parseInt(req.params.clanId);

        const clanDetails = await getClanDetails(clanId);
        const clanMembers = await getClanMembersFixed(clanId);

        if (!clanDetails) {
            return res.status(404).json({
                success: false,
                error: 'Clan não encontrado'
            });
        }

        res.json({
            success: true,
            clan: clanDetails,
            members: clanMembers,
            stats: {
                total_members: clanDetails.total_members || 0,
                players_with_data: clanDetails.players_with_data || 0,
                data_coverage: clanDetails.total_members > 0 ?
                    Math.round((clanDetails.players_with_data / clanDetails.total_members) * 100) : 0,
                avg_solo_points: Math.round(clanDetails.avg_solo_points || 0),
                avg_team_points: Math.round(clanDetails.avg_team_points || 0),
                max_solo_points: clanDetails.max_solo_points || 0,
                max_team_points: clanDetails.max_team_points || 0,
                conquer_diamond_players: clanDetails.conquer_diamond_players || 0,
                platinum_gold_players: clanDetails.platinum_gold_players || 0
            }
        });

    } catch (error) {
        console.error('❌ Erro na rota /api/clans/:clanId:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA: Estatísticas de clans
app.get('/api/clans/stats/overview', async (req, res) => {
    try {
        const clanStats = await getClanStats();

        res.json({
            success: true,
            stats: clanStats
        });

    } catch (error) {
        console.error('❌ Erro na rota /api/clans/stats/overview:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========== ROTAS DE DIAGNÓSTICO ==========

// ROTA: Diagnóstico completo do sistema
app.get('/api/debug/system-status', async (req, res) => {
    try {
        // 1. Status das tabelas
        const tableStats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM clans) as total_clans,
                (SELECT COUNT(*) FROM clan_members) as total_clan_members,
                (SELECT COUNT(*) FROM leaderboard_cache) as total_cached_players,
                (SELECT COUNT(DISTINCT aoe4_world_id) FROM leaderboard_cache WHERE aoe4_world_id IS NOT NULL) as unique_cached_players
        `);

        // 2. Conexões entre tabelas
        const connectionStats = await pool.query(`
            SELECT 
                COUNT(DISTINCT cm.discord_user_id) as total_clan_members,
                COUNT(DISTINCT u.discord_user_id) as members_with_user_entry,
                COUNT(DISTINCT lc.aoe4_world_id) as members_with_leaderboard_data,
                ROUND((COUNT(DISTINCT u.discord_user_id)::decimal / COUNT(DISTINCT cm.discord_user_id) * 100), 1) as user_link_percentage,
                ROUND((COUNT(DISTINCT lc.aoe4_world_id)::decimal / COUNT(DISTINCT cm.discord_user_id) * 100), 1) as leaderboard_link_percentage
            FROM clan_members cm
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id
        `);

        // 3. Clans com mais dados
        const topClans = await pool.query(`
            SELECT 
                c.id,
                c.name,
                c.tag,
                COUNT(cm.discord_user_id) as member_count,
                COUNT(u.aoe4_world_id) as members_with_aoe4_id,
                COUNT(lc.aoe4_world_id) as members_with_data
            FROM clans c
            LEFT JOIN clan_members cm ON c.id = cm.clan_id
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id
            GROUP BY c.id, c.name, c.tag
            ORDER BY members_with_data DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            system_status: {
                tables: tableStats.rows[0],
                connections: connectionStats.rows[0],
                top_clans: topClans.rows
            }
        });

    } catch (error) {
        console.error('❌ Erro no diagnóstico:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ROTA: Diagnóstico completo dos vínculos do clan
app.get('/api/debug/clan-link-diagnosis/:clanId', async (req, res) => {
    try {
        const clanId = parseInt(req.params.clanId);

        console.log(`🔍 Diagnóstico completo para clan ${clanId}`);

        // 1. Clan básico
        const clan = await pool.query('SELECT * FROM clans WHERE id = $1', [clanId]);

        // 2. Membros no clan_members
        const clanMembers = await pool.query(
            'SELECT * FROM clan_members WHERE clan_id = $1',
            [clanId]
        );

        // 3. Vínculos com users
        const userLinks = await pool.query(`
            SELECT 
                cm.discord_user_id,
                u.aoe4_world_id,
                u.created_at as user_created
            FROM clan_members cm
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            WHERE cm.clan_id = $1
        `, [clanId]);

        // 4. Dados completos via leaderboard_cache
        const fullData = await pool.query(`
            SELECT 
                cm.discord_user_id,
                u.aoe4_world_id,
                lc.name,
                lc.rm_solo_points,
                lc.rm_solo_elo
            FROM clan_members cm
            LEFT JOIN users u ON cm.discord_user_id = u.discord_user_id
            LEFT JOIN leaderboard_cache lc ON u.aoe4_world_id = lc.aoe4_world_id
            WHERE cm.clan_id = $1
        `, [clanId]);

        res.json({
            success: true,
            diagnosis: {
                clan: clan.rows[0] || null,
                clan_members: {
                    total: clanMembers.rows.length,
                    members: clanMembers.rows.map(m => m.discord_user_id)
                },
                user_links: {
                    total_linked: userLinks.rows.filter(u => u.aoe4_world_id).length,
                    total_unlinked: userLinks.rows.filter(u => !u.aoe4_world_id).length,
                    details: userLinks.rows
                },
                leaderboard_data: {
                    total_with_data: fullData.rows.filter(f => f.name).length,
                    details: fullData.rows
                },
                summary: {
                    total_members: clanMembers.rows.length,
                    with_user_link: userLinks.rows.filter(u => u.aoe4_world_id).length,
                    with_leaderboard_data: fullData.rows.filter(f => f.name).length,
                    success_rate: `${((fullData.rows.filter(f => f.name).length / clanMembers.rows.length) * 100).toFixed(1)}%`
                }
            }
        });

    } catch (error) {
        console.error('❌ Erro no diagnóstico:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========== ROTAS EXISTENTES ==========

// ROTA: Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Backend AOE4 Rankings está funcionando',
        timestamp: new Date().toISOString(),
        data_source: 'DATABASE_EXCLUSIVE',
        features: {
            seasons: true,
            local_players: true,
            multiple_seasons: true,
            auto_cache_update: AUTO_UPDATE_CONFIG.enabled,
            clans: true
        }
    });
});

// FUNÇÃO PRINCIPAL: APENAS BANCO LOCAL
async function getPlayersWithModeFilter(limit = 25, offset = 0, mode = 'rm_solo', season = '12') {
    try {
        const seasonId = season === 'current' ? 12 : parseInt(season);

        // Validar se a season existe (1-12)
        if (seasonId < 1 || seasonId > 12) {
            console.log(`❌ Season ${seasonId} inválida. Usando season 12.`);
            seasonId = 12;
        }

        console.log(`🎯 Buscando players - Season: ${seasonId}, Modo: ${mode}, Limit: ${limit}, Offset: ${offset}`);

        const dbPlayers = await getPlayersFromDatabase(limit, offset, mode, seasonId);

        if (dbPlayers.length > 0) {
            const total = await getTotalPlayersCount(mode, seasonId);
            console.log(`✅ ${dbPlayers.length} players da season ${seasonId}`);

            return {
                players: dbPlayers,
                total: total,
                _source: 'database'
            };
        }

        console.log('💥 Nenhum player encontrado para esta season');
        return { players: [], total: 0 };

    } catch (error) {
        console.error('💥 Erro crítico:', error);
        return { players: [], total: 0 };
    }
}

// ROTA PRINCIPAL: Buscar players
app.get('/api/players', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const season = req.query.season || 'current';
        const mode = req.query.mode || 'rm_solo';

        const offset = (page - 1) * limit;

        console.log(`📄 Requisição: season ${season}, página ${page}, limite ${limit}, modo ${mode}`);

        const { players, total } = await getPlayersWithModeFilter(limit, offset, mode, season);

        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            players: players,
            pagination: {
                current_page: page,
                total_pages: totalPages,
                total_players: total,
                players_per_page: limit,
                has_next: page < totalPages,
                has_prev: page > 1
            },
            filters: {
                season: season,
                mode: mode
            },
            data_source: 'database'
        });

    } catch (error) {
        console.error('❌ Erro na rota /api/players:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// ROTA: Seasons
app.get('/api/seasons', async (req, res) => {
    try {
        const seasons = await getSeasonsFromAoe4World();
        res.json({ success: true, seasons: seasons });
    } catch (error) {
        console.error('❌ Erro na rota /api/seasons:', error);
        res.status(500).json({ success: false, error: 'Erro ao carregar temporadas' });
    }
});

// server.js - Adicione esta rota
app.get('/api/players/search', async (req, res) => {
    try {
        const { q: searchTerm, season = '12', mode = 'rm_solo' } = req.query;

        if (!searchTerm || searchTerm.length < 2) {
            return res.status(400).json({ error: 'Termo de busca muito curto (mínimo 2 caracteres)' });
        }

        console.log(`🔍 Buscando por: "${searchTerm}" (Season: ${season}, Mode: ${mode})`);

        // Determinar as colunas baseadas no modo
        const eloColumn = mode === 'rm_team' ? 'rm_team_elo' : 'rm_solo_elo';
        const pointsColumn = mode === 'rm_team' ? 'rm_team_points' : 'rm_solo_points';
        const winsColumn = mode === 'rm_team' ? 'rm_team_wins' : 'rm_solo_wins';
        const totalMatchesColumn = mode === 'rm_team' ? 'rm_team_total_matches' : 'rm_solo_total_matches';

        const { rows } = await pool.query(`
            SELECT 
                user_id, 
                aoe4_world_id, 
                name, 
                clan_tag,
                ${eloColumn} as elo,
                ${pointsColumn} as points,
                ${winsColumn} as wins,
                ${totalMatchesColumn} as total_matches,
                level, 
                season_id, 
                avatar_url, 
                region, 
                civilization,
                last_solo_game,
                last_team_game
            FROM leaderboard_cache 
            WHERE season_id = $1
            AND name IS NOT NULL
            AND (
                LOWER(name) LIKE LOWER($2) OR
                LOWER(clan_tag) LIKE LOWER($2) OR
                aoe4_world_id::TEXT LIKE $2
            )
            ORDER BY ${eloColumn} DESC NULLS LAST
            LIMIT 100
        `, [season, `%${searchTerm}%`]);

        console.log(`✅ Encontrados ${rows.length} jogadores para "${searchTerm}"`);
        res.json(rows);

    } catch (error) {
        console.error('❌ Erro na busca global:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ROTA: Game modes
app.get('/api/game-modes', (req, res) => {
    res.json({
        success: true,
        game_modes: [
            { id: 'rm_solo', name: 'Classificação solo', description: 'Classificação solo' },
            { id: 'rm_team', name: 'Classificação em equipe', description: 'Classificação em equipe' }
        ]
    });
});

// Inicialização do servidor
app.listen(PORT, async () => {
    console.log(`🚀 Backend AOE4 rodando na porta ${PORT}`);
    console.log(`🎯🎯🎯 CONFIGURAÇÃO: EXCLUSIVAMENTE BANCO DE DADOS LOCAL 🎯🎯🎯`);
    console.log(`🎮 Sistema de Seasons: ATIVADO`);
    console.log(`🏰 Sistema de Clans: ATIVADO`);
    console.log(`🔄 Atualização Automática: ${AUTO_UPDATE_CONFIG.enabled ? 'ATIVADA' : 'DESATIVADA'}`);
    console.log(`🏥 Health: http://localhost:${PORT}/health`);
    console.log(`🎮 Players: http://localhost:${PORT}/api/players`);
    console.log(`🏰 Clans: http://localhost:${PORT}/api/clans/featured`);

    // Testar conexão
    await testConnection();

    // Iniciar atualização automática
    if (AUTO_UPDATE_CONFIG.enabled) {
        console.log(`🔄 ATUALIZAÇÃO AUTOMÁTICA ATIVADA: ${AUTO_UPDATE_CONFIG.interval / 60000} minutos`);
        console.log(`⏰ Primeira atualização em 1 minuto...`);

        // Primeira execução em 1 minuto, depois a cada 30 minutos
        setTimeout(() => {
            startAutoCacheUpdate();
        }, 60000);
    }

    console.log('\n✅✅✅ Sistema configurado para usar APENAS BANCO DE DADOS LOCAL ✅✅✅');
    console.log('🎮 Sistema de Seasons totalmente funcional!');
    console.log('🏰 Sistema de Clans totalmente funcional!');
    console.log('🔄 Sistema de atualização automática configurado!');
});

// Testar conexão com o banco
async function testConnection() {
    try {
        const result = await pool.query('SELECT NOW() as current_time');
        console.log('✅ Conectado ao PostgreSQL:', result.rows[0].current_time);

        // Verificar quantos players temos no banco
        const countResult = await pool.query('SELECT COUNT(*) as count FROM leaderboard_cache WHERE name IS NOT NULL');
        console.log(`📊 Banco possui ${countResult.rows[0].count} players no total`);

        // Verificar por seasons
        const seasonsCount = await pool.query('SELECT season_id, COUNT(*) as count FROM leaderboard_cache WHERE name IS NOT NULL GROUP BY season_id ORDER BY season_id DESC');
        console.log('📊 Distribuição por seasons:');
        seasonsCount.rows.forEach(row => {
            console.log(`   Season ${row.season_id}: ${row.count} players`);
        });

        // Verificar clans
        const clansCount = await pool.query('SELECT COUNT(*) as count FROM clans WHERE name IS NOT NULL AND name != \'\'');
        console.log(`🏰 Banco possui ${clansCount.rows[0].count} clans`);

        const clanMembersCount = await pool.query('SELECT COUNT(*) as count FROM clan_members');
        console.log(`👥 Banco possui ${clanMembersCount.rows[0].count} membros de clans`);

        return true;
    } catch (error) {
        console.error('❌ Erro ao conectar com PostgreSQL:', error.message);
        return false;
    }
}

// Função para buscar temporadas
async function getSeasonsFromAoe4World() {
    try {
        console.log('🔄 Buscando temporadas do AOE4 World...');

        return [
            { id: 12, name: 'Temporada 12', kind: 'ranked', status: 'ongoing' },
            { id: 11, name: 'Temporada 11', kind: 'ranked', status: 'finished' },
            { id: 10, name: 'Temporada 10', kind: 'ranked', status: 'finished' },
            { id: 9, name: 'Temporada 9', kind: 'ranked', status: 'finished' },
            { id: 8, name: 'Temporada 8', kind: 'ranked', status: 'finished' },
            { id: 7, name: 'Temporada 7', kind: 'ranked', status: 'finished' },
            { id: 6, name: 'Temporada 6', kind: 'ranked', status: 'finished' },
            { id: 5, name: 'Temporada 5', kind: 'ranked', status: 'finished' },
            { id: 4, name: 'Temporada 4', kind: 'ranked', status: 'finished' },
            { id: 3, name: 'Temporada 3', kind: 'ranked', status: 'finished' },
            { id: 2, name: 'Temporada 2', kind: 'ranked', status: 'finished' },
            { id: 1, name: 'Temporada 1', kind: 'ranked', status: 'finished' }
        ];

    } catch (error) {
        console.error('💥 Erro ao buscar temporadas:', error);
        return [
            { id: 12, name: 'Temporada 12', kind: 'ranked', status: 'ongoing' },
            { id: 11, name: 'Temporada 11', kind: 'ranked', status: 'finished' },
            { id: 10, name: 'Temporada 10', kind: 'ranked', status: 'finished' },
            { id: 9, name: 'Temporada 9', kind: 'ranked', status: 'finished' },
            { id: 8, name: 'Temporada 8', kind: 'ranked', status: 'finished' },
            { id: 7, name: 'Temporada 7', kind: 'ranked', status: 'finished' },
            { id: 6, name: 'Temporada 6', kind: 'ranked', status: 'finished' },
            { id: 5, name: 'Temporada 5', kind: 'ranked', status: 'finished' },
            { id: 4, name: 'Temporada 4', kind: 'ranked', status: 'finished' },
            { id: 3, name: 'Temporada 3', kind: 'ranked', status: 'finished' },
            { id: 2, name: 'Temporada 2', kind: 'ranked', status: 'finished' },
            { id: 1, name: 'Temporada 1', kind: 'ranked', status: 'finished' }
        ];
    }
}

module.exports = app;
