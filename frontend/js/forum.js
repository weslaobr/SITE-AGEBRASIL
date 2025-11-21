class ForumUI {
    constructor() {
        this.api = window.forumAPI;
        this.init();
    }

    async init() {
        // Espera as categorias carregarem
        while (!window.forumAPI || window.forumAPI.categories.length === 0) {
            await new Promise(r => setTimeout(r, 200));
        }
        this.renderHeader();
        this.renderAll();
    }

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

renderAll() {
    // Categorias
    document.getElementById('categoriesContainer').innerHTML = this.api.categories.map(cat => `
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

    // Tópicos recentes
    this.api.getTopics().then(topics => {
        document.getElementById('recentTopicsList').innerHTML = topics.map(t => `
                <div class="topic-item" onclick="location.href='forum-topic.html?id=${t.id}'">
                    <div class="topic-avatar"><img src="${t.author_avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}"></div>
                    <div class="topic-main">
                        <div class="topic-title">${t.title}</div>
                        <div class="topic-meta">por ${t.author_name} • ${new Date(t.created_at).toLocaleDateString('pt-BR')} • ${t.category_name}</div>
                    </div>
                    <div class="topic-stats">
                        <span><i class="fas fa-comment"></i> ${t.reply_count || 0}</span>
                        <span><i class="fas fa-eye"></i> ${t.views || 0}</span>
                    </div>
                </div>
            `).join('');
    });
}
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.forumAPI) window.forumAPI.loadUser();
    new ForumUI();
});