// forum.js - VERSÃO FINAL COMPATÍVEL COM SEU BANCO
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
        document.getElementById('userInfo').style.display = user ? 'flex' : 'none';
        document.getElementById('loginContainer').style.display = user ? 'none' : 'flex';
        document.getElementById('logoutBtn').style.display = user ? 'flex' : 'none';
        document.getElementById('noAuthMessage').style.display = user ? 'none' : 'block';
        document.getElementById('forumContent').style.display = user ? 'block' : 'none' : 'none';

        if (user) {
            const avatar = user.avatar
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=64`
                : `https://cdn.discordapp.com/embed/avatars/0.png`;
            document.getElementById('userInfo').innerHTML = `
                <div class="user-avatar"><img src="${avatar}"></div>
                <div class="user-name">${user.global_name || user.username}</div>
            `;
        }

        // Botões de login/logout
        document.getElementById('loginBtn')?.addEventListener('click', () => location.href = 'forum-auth.html');
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            localStorage.clear();
            location.reload();
        });
    }

    async loadAll() {
        const [stats, topics] = await Promise.all([
            this.api.getStats(),
            this.api.getTopics()
        ]);

        this.renderStats(stats);
        this.renderCategories();
        this.renderRecentTopics(topics);
    }

    renderStats(stats) {
        document.getElementById('statTopics').textContent = stats.totalTopics || 0;
        document.getElementById('statReplies').textContent = stats.totalReplies || 0;
        document.getElementById('statMembers').textContent = stats.totalMembers || 0;
        document.getElementById('statOnline').textContent = stats.onlineNow || 1;
    }

}

renderCategories() {
    const container = document.getElementById('categoriesContainer');
    const html = this.api.categories.map(cat => `
            <div class="category-card" onclick="location.href='forum-category.html?category=${cat.slug}'">
                <div class="category-icon" style="background: ${cat.color || '#5865F2'}">
                    <i class="${cat.icon || 'fas fa-comments'}"></i>
                </div>
                <div class="category-info">
                    <h3>${cat.name}</h3>
                    <p>${cat.description || 'Sem descrição'}</p>
                </div>
                <div class="category-stats">
                    <div><strong>${cat.topic_count || 0}</strong> tópicos</div>
                    <div><strong>${cat.reply_count || 0}</strong> respostas</div>
                </div>
            </div>
        `).join('');
    container.innerHTML = html || '<p>Nenhuma categoria encontrada.</p>';
}

renderRecentTopics(topics) {
    const container = document.getElementById('recentTopicsList');
    if (!topics || topics.length === 0) {
        container.innerHTML = '<p>Nenhum tópico recente.</p>';
        return;
    }

    const html = topics.map(t => `
            <div class="topic-item" onclick="location.href='forum-topic.html?id=${t.id}'">
                <div class="topic-avatar">
                    <img src="${t.author_avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}">
                </div>
                <div class="topic-main">
                    <div class="topic-title">${t.title}</div>
                    <div class="topic-meta">
                        por ${t.author_name || 'Anônimo'} em ${new Date(t.created_at).toLocaleDateString('pt-BR')}
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

document.addEventListener('DOMContentLoaded', () => {
    new ForumUI();
});