// forum.js - VERSÃO QUE VAI FAZER O FÓRUM APARECER AGORA MESMO
class ForumUI {
    constructor() {
        this.api = window.forumAPI;
        this.init();
    }

    async init() {
        await new Promise(r => setTimeout(r, 500)); // espera API carregar
        this.renderHeader();
        this.loadAll();
    }

    renderHeader() {
        const user = this.api.currentUser;
        if (user) {
            document.getElementById('userInfo').style.display = 'flex';
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('logoutBtn').style.display = 'flex';
            document.getElementById('noAuthMessage').style.display = 'none';
            document.getElementById('forumContent').style.display = 'block';

            const avatar = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=64` : 'https://cdn.discordapp.com/embed/avatars/0.png';
            document.getElementById('userInfo').innerHTML = `
                <div class="user-avatar"><img src="${avatar}"></div>
                <div class="user-name">${user.global_name || user.username}</div>
            `;
        }
    }

    async loadAll() {
        const stats = await this.api.getStats();
        const topics = await this.api.getTopics();

        // Estatísticas
        document.getElementById('statTopics').textContent = stats.totalTopics || 0;
        document.getElementById('statReplies').textContent = stats.totalReplies || 0;
        document.getElementById('statMembers').textContent = stats.totalMembers || 50;
        document.getElementById('statOnline').textContent = stats.onlineNow || 1;

        // Categorias
        const catHtml = this.api.categories.map(cat => `
            <div class="category-card" onclick="location.href='forum-category.html?category=${cat.slug}'">
                <div class="category-icon" style="background:${cat.color || '#5865F2'}">
                    <i class="${cat.icon || 'fas fa-comments'}"></i>
                </div>
                <div class="category-info">
                    <h3>${cat.name}</h3>
                    <p>${cat.description || ''}</p>
                </div>
                <div class="category-stats">
                    <div><strong>${cat.topic_count || 0}</strong> tópicos</div>
                    <div><strong>${cat.reply_count || 0}</strong> respostas</div>
                </div>
            </div>
        `).join('');

        document.getElementById('categoriesContainer').innerHTML = catHtml;

        // Tópicos recentes
        const topicHtml = topics.length === 0 ? '<p style="text-align:center;color:#888;padding:3rem">Nenhum tópico ainda. Seja o primeiro a criar!</p>' : topics.map(t => `
            <div class="topic-item" onclick="location.href='forum-topic.html?id=${t.id}'">
                <div class="topic-avatar"><img src="${t.author_avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}"></div>
                <div class="topic-main">
                    <div class="topic-title">${t.title}</div>
                    <div class="topic-meta">por ${t.author_name} • ${new Date(t.created_at).toLocaleDateString('pt-BR')} • ${t.category_name || 'Geral'}</div>
                </div>
                <div class="topic-stats">
                    <span><i class="fas fa-comment"></i> ${t.reply_count || 0}</span>
                    <span><i class="fas fa-eye"></i> ${t.views || 0}</span>
                </div>
            </div>
        `).join('');

        document.getElementById('recentTopicsList').innerHTML = topicHtml;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.forumAPI) window.forumAPI.loadUser();
    new ForumUI();
});