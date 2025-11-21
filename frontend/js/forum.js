// forum.js - VERSÃO FINAL E FUNCIONAL (21/11/2025)
class ForumUI {
    constructor() {
        this.api = window.forumAPI;
        this.init();
    }

    async init() {
        await this.waitForAPI();
        this.renderHeader();
        await this.loadAll();
    }

    async waitForAPI() {
        while (!window.forumAPI || window.forumAPI.categories.length === 0) {
            await new Promise(r => setTimeout(r, 100));
        }
    }

    renderHeader() {
        const user = this.api.currentUser;
        const userInfo = document.getElementById('userInfo');
        const loginContainer = document.getElementById('loginContainer');
        const logoutBtn = document.getElementById('logoutBtn');
        const noAuth = document.getElementById('noAuthMessage');
        const content = document.getElementById('forumContent');

        if (user) {
            userInfo.style.display = 'flex';
            loginContainer.style.display = 'none';
            logoutBtn.style.display = 'flex';
            noAuth.style.display = 'none';
            content.style.display = 'block';

            const avatar = user.avatar
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=64`
                : `https://cdn.discordapp.com/embed/avatars/0.png`;

            userInfo.innerHTML = `
                <div class="user-avatar"><img src="${avatar}" alt="${user.global_name || user.username}"></div>
                <div class="user-name">${user.global_name || user.username}</div>
            `;
        } else {
            userInfo.style.display = 'none';
            loginContainer.style.display = 'flex';
            logoutBtn.style.display = 'none';
            noAuth.style.display = 'block';
            content.style.display = 'none';
        }

        // Botões
        document.querySelectorAll('#loginBtn, .login-btn-header').forEach(btn => {
            btn.onclick = () => location.href = 'forum-auth.html';
        });
        logoutBtn.onclick = () => {
            localStorage.clear();
            location.reload();
        };
    }

    async loadAll() {
        try {
            const [stats, topics] = await Promise.all([
                this.api.getStats(),
                this.api.getTopics()
            ]);
            this.renderStats(stats);
            this.renderCategories();
            this.renderRecentTopics(topics);
        } catch (e) {
            console.error("Erro ao carregar dados do fórum", e);
        }
    }

    renderStats(stats) {
        document.getElementById('statTopics').textContent = stats.totalTopics || 0;
        document.getElementById('statReplies').textContent = stats.totalReplies || 0;
        document.getElementById('statMembers').textContent = stats.totalMembers || 0;
        document.getElementById('statOnline').textContent = stats.onlineNow || 1;
    }

    renderCategories() {
        const container = document.getElementById('categoriesContainer');
        if (this.api.categories.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#aaa;">Nenhuma categoria encontrada.</p>';
            return;
        }

        const html = this.api.categories.map(cat => `
            <div class="category-card" onclick="location.href='forum-category.html?category=${cat.slug}'">
                <div class="category-icon" style="background:${cat.color || '#5865F2'}">
                    <i class="${cat.icon || 'fas fa-comments'}"></i>
                </div>
                <div class="category-info">
                    <h3>${cat.name}</h3>
                    <p>${cat.description || 'Sem descrição disponível'}</p>
                </div>
                <div class="category-stats">
                    <div><strong>${cat.topic_count || 0}</strong> tópicos</div>
                    <div><strong>${cat.reply_count || 0}</strong> respostas</div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    renderRecentTopics(topics) {
        const container = document.getElementById('recentTopicsList');
        if (!topics || topics.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#aaa; padding:2rem;">Nenhum tópico recente.</p>';
            return;
        }

        const html = topics.map(t => `
            <div class="topic-item" onclick="location.href='forum-topic.html?id=${t.id}'">
                <div class="topic-avatar">
                    <img src="${t.author_avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="avatar">
                </div>
                <div class="topic-main">
                    <div class="topic-title">${t.title}</div>
                    <div class="topic-meta">
                        por <strong>${t.author_name || 'Anônimo'}</strong> • ${new Date(t.created_at).toLocaleDateString('pt-BR')}
                        • ${t.category_name || 'Geral'}
                    </div>
                </div>
                <div class="topic-stats">
                    <span><i class="fas fa-comment"></i> ${t.reply_count || 0}</span>
                    <span><i class="fas fa-eye"></i> ${t.views || 0}</span>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }
}

// INICIA QUANDO A PÁGINA CARREGA
document.addEventListener('DOMContentLoaded', () => {
    window.forumAPI.loadUser(); // garante que o usuário seja carregado
    new ForumUI();
});