// Configuração da API
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api'
    : '/api';

const DISCORD_CLIENT_ID = '1440856041867968542'; // Substitua pelo seu Client ID real se diferente
const REDIRECT_URI = window.location.origin + '/forum-auth.html';

// Estado do Usuário
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadForumStats();

    // Roteamento simples baseado na página atual
    const path = window.location.pathname;
    if (path.includes('forum.html')) {
        loadCategories();
        loadRecentTopics();
    } else if (path.includes('forum-category.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const slug = urlParams.get('slug');
        if (slug) loadCategoryTopics(slug);
    } else if (path.includes('forum-topic.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if (id) loadTopic(id);
    }
});

// ==========================================
// AUTENTICAÇÃO
// ==========================================

function checkAuth() {
    const userStr = localStorage.getItem('forum_user');
    const tokenStr = localStorage.getItem('forum_token');

    if (userStr && tokenStr) {
        currentUser = JSON.parse(userStr);
        updateUserWidget(currentUser);
    } else {
        updateUserWidget(null);
    }

    // Configurar botão de login
    const loginBtn = document.getElementById('discord-login-btn');
    if (loginBtn) {
        const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20email`;
        loginBtn.href = authUrl;
    }
}

function updateUserWidget(user) {
    const widget = document.getElementById('user-widget');
    if (!widget) return;

    if (user) {
        const avatarUrl = user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';

        widget.innerHTML = `
            <div class="user-profile-widget">
                <div class="user-avatar-large">
                    <img src="${avatarUrl}" alt="${user.username}">
                </div>
                <h3>${user.global_name || user.username}</h3>
                <p style="color: #a0aec0; font-size: 0.9rem;">Membro da Comunidade</p>
                
                <div class="user-stats-grid">
                    <div class="user-stat-item">
                        <span class="user-stat-label">Tópicos</span>
                        <span class="user-stat-value">0</span>
                    </div>
                    <div class="user-stat-item">
                        <span class="user-stat-label">Respostas</span>
                        <span class="user-stat-value">0</span>
                    </div>
                </div>

                <button onclick="logout()" class="discord-btn" style="background: #ef4444; margin-top: 1rem; font-size: 0.9rem; padding: 0.5rem 1rem;">
                    <i class="fas fa-sign-out-alt"></i> Sair
                </button>
            </div>
        `;
    } else {
        // Reset to login form if needed (usually static HTML handles this, but good to ensure)
        // O HTML estático já tem o form de login, então se user for null e o widget já estiver renderizado como perfil, recarregar a página ou restaurar HTML original seria ideal.
        // Por simplicidade, vamos manter o HTML estático inicial se não houver user.
    }
}

function logout() {
    localStorage.removeItem('forum_user');
    localStorage.removeItem('forum_token');
    window.location.reload();
}

// ==========================================
// CARREGAMENTO DE DADOS
// ==========================================

async function loadCategories() {
    const container = document.getElementById('categories-list');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/forum/categories`);
        const categories = await response.json();

        if (categories.length === 0) {
            container.innerHTML = '<div class="no-activity">Nenhuma categoria encontrada.</div>';
            return;
        }

        container.innerHTML = categories.map(cat => `
            <a href="forum-category.html?slug=${cat.slug}" class="category-card">
                <div class="category-icon" style="background: ${cat.color}20; color: ${cat.color}">
                    <i class="${cat.icon || 'fas fa-folder'}"></i>
                </div>
                <div class="category-content">
                    <div class="category-title">${cat.name}</div>
                    <p class="category-desc">${cat.description || ''}</p>
                </div>
                <div class="category-stats">
                    <span class="stat-badge"><i class="fas fa-file-alt"></i> ${cat.topic_count || 0}</span>
                    <span class="stat-badge"><i class="fas fa-comment"></i> ${cat.reply_count || 0}</span>
                </div>
            </a>
        `).join('');

    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        container.innerHTML = '<div class="error-msg">Erro ao carregar categorias.</div>';
    }
}

async function loadRecentTopics() {
    const container = document.getElementById('recent-topics-list');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/forum/topics`); // Endpoint genérico que retorna os mais recentes
        const topics = await response.json();

        if (topics.length === 0) {
            container.innerHTML = '<div style="padding: 1rem; color: #a0aec0; text-align: center;">Nenhum tópico recente.</div>';
            return;
        }

        container.innerHTML = topics.slice(0, 5).map(topic => `
            <div class="recent-topic-item">
                <div class="recent-topic-avatar">
                    <img src="${topic.authorAvatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="${topic.author}">
                </div>
                <div class="recent-topic-content">
                    <h4><a href="forum-topic.html?id=${topic.id}">${topic.title}</a></h4>
                    <div class="recent-topic-meta">
                        por ${topic.author} • ${formatDate(topic.createdAt)}
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Erro ao carregar tópicos recentes:', error);
        container.innerHTML = '<div class="error-msg">Erro ao carregar.</div>';
    }
}

async function loadForumStats() {
    const statsContainer = document.getElementById('forum-stats');
    if (!statsContainer) return;

    try {
        const response = await fetch(`${API_BASE_URL}/forum/stats`);
        const stats = await response.json();

        document.getElementById('total-topics').textContent = stats.totalTopics || 0;
        document.getElementById('total-replies').textContent = stats.totalReplies || 0;
        document.getElementById('total-members').textContent = stats.totalMembers || 0;

    } catch (error) {
        console.error('Erro ao carregar stats:', error);
    }
}

// ==========================================
// UTILITÁRIOS
// ==========================================

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    // Menos de 24h
    if (diff < 86400000) {
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `há ${minutes} min`;
        }
        const hours = Math.floor(diff / 3600000);
        return `há ${hours} h`;
    }

    return date.toLocaleDateString('pt-BR');
}
