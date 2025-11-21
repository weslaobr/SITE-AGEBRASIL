// forum-category.js - VERSÃO CORRIGIDA
class ForumCategoryUI {
    constructor() {
        this.api = window.forumAPI;
        this.currentCategorySlug = null;
        this.currentCategory = null;
        this.init();
    }

    async init() {
        console.log('🔧 Inicializando ForumCategoryUI...');

        this.currentCategorySlug = this.getCategorySlugFromURL();
        console.log('📌 Categoria Slug da URL:', this.currentCategorySlug);

        if (!this.currentCategorySlug) {
            this.showError('Categoria não especificada na URL');
            return;
        }

        this.checkAuthState();
        this.setupEventListeners();

        // ✅ CORREÇÃO: Aguardar o usuário e categorias carregarem
        await this.waitForAuthAndCategories();

        if (this.api.currentUser) {
            await this.loadCategory();
        } else {
            console.log('👤 Aguardando autenticação...');
        }
    }

    // ✅ NOVO MÉTODO: Aguardar autenticação e categorias
    async waitForAuthAndCategories() {
        console.log('⏳ Aguardando carregamento...');

        let attempts = 0;
        const maxAttempts = 30; // 3 segundos

        while (attempts < maxAttempts) {
            // Verificar se usuário e categorias estão carregados
            if (this.api.currentUser !== undefined && this.api.categories.length > 0) {
                console.log('✅ Usuário e categorias carregados');
                return true;
            }

            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;

            // Recarregar dados se necessário
            if (this.api.currentUser === undefined) {
                await this.api.loadCurrentUser();
            }
            if (this.api.categories.length === 0) {
                await this.api.loadCategories();
            }
        }

        console.warn('⚠️ Timeout ao aguardar carregamento');
    }

    async loadCategory() {
        console.log('📂 Carregando categoria:', this.currentCategorySlug);

        try {
            // ✅ CORREÇÃO: Garantir que categorias estão carregadas
            if (!this.api.categories || this.api.categories.length === 0) {
                console.log('🔄 Carregando categorias...');
                await this.api.loadCategories();
            }

            console.log('📋 Todas as categorias:', this.api.categories);

            // ✅ CORREÇÃO: Buscar categoria corretamente
            this.currentCategory = this.api.categories.find(
                cat => cat.slug === this.currentCategorySlug
            );

            console.log('🔍 Categoria encontrada:', this.currentCategory);

            if (!this.currentCategory) {
                console.error('❌ Categoria não encontrada com slug:', this.currentCategorySlug);
                this.showError(`Categoria "${this.currentCategorySlug}" não encontrada`);
                return;
            }

            console.log('✅ Categoria encontrada:', this.currentCategory.name);
            await this.displayCategory();
            await this.loadTopics();

        } catch (error) {
            console.error('❌ Erro ao carregar categoria:', error);
            this.showError('Erro ao carregar categoria: ' + error.message);
        }
    }

    async loadTopics() {
        console.log('📝 Carregando tópicos para:', this.currentCategorySlug);

        try {
            // ✅ CORREÇÃO: Usar o método correto da API
            let topics = await this.api.getTopics(this.currentCategorySlug);
            const topicsList = document.getElementById('topicsList');

            console.log('📦 Tópicos recebidos:', topics);

            if (!topics || topics.length === 0) {
                console.log('📭 Nenhum tópico encontrado');
                topicsList.innerHTML = `
                    <div class="no-topics">
                        <i class="fas fa-comments"></i>
                        <h3>Nenhum tópico encontrado</h3>
                        <p>Seja o primeiro a criar um tópico nesta categoria!</p>
                    </div>
                `;
                return;
            }

            // ✅ CORREÇÃO: Padronizar campos
            topics = topics.map(t => ({
                ...t,
                authorAvatar: t.authorAvatar || t.author_avatar,
                authorId: t.authorId || t.author_discord_id,
                author: t.author || t.author_name
            }));

            console.log('🔄 Processando tópicos...');

            const topicsHTML = await Promise.all(topics.map(async (topic) => {
                const replies = await this.api.getReplies(topic.id);
                const replyCount = replies.length;

                const isPinned = topic.isPinned || topic.is_pinned;
                const isLocked = topic.isLocked || topic.is_locked;

                console.log('📋 Processando tópico:', topic.title);

                return `
                    <div class="topic-item ${isPinned ? 'pinned' : ''}" onclick="forumCategoryUI.viewTopic(${topic.id})">
                        <div class="topic-avatar">
                            ${topic.authorAvatar ?
                        `<img src="https://cdn.discordapp.com/avatars/${topic.authorId}/${topic.authorAvatar}.webp?size=45"
                                      onerror="this.src='https://cdn.discordapp.com/embed/avatars/${topic.authorId % 5}.png'">`
                        :
                        `<span>${(topic.author || '').charAt(0)}</span>`
                    }
                        </div>

                        <div class="topic-content">
                            <div class="topic-title">
                                ${isPinned ? '<i class="fas fa-thumbtack" style="color: #e53e3e; margin-right: 5px;"></i>' : ''}
                                ${isLocked ? '<i class="fas fa-lock" style="color: #a0aec0; margin-right: 5px;"></i>' : ''}
                                ${topic.title}
                            </div>

                            <div class="topic-meta">
                                <span>por ${topic.author}</span>
                                <span>${this.formatDate(topic.updatedAt || topic.createdAt)}</span>
                            </div>
                        </div>

                        <div class="topic-stats">
                            <div class="stat">
                                <i class="fas fa-reply"></i>
                                <span>${replyCount}</span>
                            </div>
                            <div class="stat">
                                <i class="fas fa-eye"></i>
                                <span>${topic.views || 0}</span>
                            </div>
                        </div>
                    </div>
                `;
            }));

            topicsList.innerHTML = topicsHTML.join('');
            console.log('✅ Tópicos carregados na interface');

        } catch (error) {
            console.error('❌ Erro ao carregar tópicos:', error);
            const topicsList = document.getElementById('topicsList');
            topicsList.innerHTML = `
                <div class="no-topics">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro ao carregar tópicos</h3>
                    <p>${error.message}</p>
                    <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--accent-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Recarregar Página
                    </button>
                </div>
            `;
        }
    }

    // ... (o resto dos métodos permanece igual)

    showError(message) {
        const container = document.getElementById('categoryContent');
        if (!container) return;

        console.error('❌ Mostrando erro:', message);

        container.innerHTML = `
            <div class="no-auth-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro</h3>
                <p>${message}</p>
                <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem;">
                    <button class="login-btn" onclick="window.location.href = 'forum.html'">
                        <i class="fas fa-arrow-left"></i> Voltar ao Fórum
                    </button>
                    <button class="login-btn" onclick="window.location.reload()">
                        <i class="fas fa-redo"></i> Recarregar
                    </button>
                    <button class="login-btn" onclick="forumCategoryUI.debug()">
                        <i class="fas fa-bug"></i> Debug
                    </button>
                </div>
            </div>
        `;
    }

    // ✅ NOVO MÉTODO: Debug
    debug() {
        console.log('🔍=== DEBUG FORUM CATEGORY ===');
        console.log('📌 Slug da URL:', this.currentCategorySlug);
        console.log('👤 Usuário:', this.api.currentUser);
        console.log('📂 Categorias:', this.api.categories);
        console.log('🎯 Categoria atual:', this.currentCategory);
        console.log('🔚=== FIM DEBUG ===');

        // Testar API diretamente
        if (this.currentCategorySlug) {
            fetch(`https://ageivbrasil.up.railway.app/api/forum/categories/${this.currentCategorySlug}/topics`)
                .then(r => {
                    console.log('📡 Status API:', r.status);
                    return r.json();
                })
                .then(topics => console.log('📝 Tópicos da API:', topics))
                .catch(err => console.error('💥 Erro API:', err));
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM carregado, inicializando ForumCategoryUI...');
    window.forumCategoryUI = new ForumCategoryUI();
});