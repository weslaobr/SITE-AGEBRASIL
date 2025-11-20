// forum-api.js - VERSÃO SIMPLIFICADA E CORRIGIDA
class ForumAPI {
    constructor() {
        this.baseURL = "https://ageivbrasil.up.railway.app";
        this.currentUser = null;
        this.isAdmin = false;
        this.categories = [];
        this.admins = ["407624932101455873"];

        console.log("🚀 ForumAPI inicializado");
        this.init();
    }

    async init() {
        await this.loadCurrentUser();
        await this.loadCategories();
    }

    async loadCurrentUser() {
        try {
            // Tentar carregar de múltiplas fontes
            if (window.authManager && window.authManager.currentUser) {
                this.currentUser = window.authManager.currentUser;
                this.isAdmin = window.authManager.isAdmin;
            }
            else if (window.discordAuth && window.discordAuth.isLoggedIn()) {
                this.currentUser = window.discordAuth.getCurrentUser();
                this.isAdmin = this.admins.includes(String(this.currentUser.id));
            }
            else {
                const userData = localStorage.getItem('discord_user');
                if (userData) {
                    this.currentUser = JSON.parse(userData);
                    this.isAdmin = this.admins.includes(String(this.currentUser.id));
                }
            }

            console.log("👤 Usuário carregado:", this.currentUser ? this.currentUser.username : 'Nenhum');

        } catch (error) {
            console.error('❌ Erro ao carregar usuário:', error);
        }
    }

    /* ====================== CATEGORIAS ====================== */
    async loadCategories() {
        try {
            console.log('📂 Buscando categorias...');
            const response = await fetch(`${this.baseURL}/api/forum/categories`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.categories = Array.isArray(data) ? data : [];

            console.log(`✅ ${this.categories.length} categorias carregadas:`,
                this.categories.map(c => ({ id: c.id, name: c.name, slug: c.slug })));

        } catch (error) {
            console.error("❌ Erro ao carregar categorias:", error);
            this.categories = [];
        }
    }

    /* ====================== ESTATÍSTICAS ====================== */
    async getStats() {
        try {
            console.log('📊 Buscando estatísticas...');
            const response = await fetch(`${this.baseURL}/api/forum/stats`);

            if (!response.ok) {
                console.warn('⚠️ Erro ao buscar estatísticas, usando valores padrão');
                return this.getDefaultStats();
            }

            const stats = await response.json();
            console.log('✅ Estatísticas:', stats);
            return stats;

        } catch (error) {
            console.error("❌ Erro ao buscar estatísticas:", error);
            return this.getDefaultStats();
        }
    }

    getDefaultStats() {
        return {
            totalTopics: 0,
            totalReplies: 0,
            totalMembers: 0,
            onlineNow: 0
        };
    }

    /* ====================== TÓPICOS ====================== */
    async getTopics(categorySlug = null) {
        try {
            console.log('📝 Buscando tópicos...', categorySlug ? `Categoria: ${categorySlug}` : 'Todos');

            let url = `${this.baseURL}/api/forum/topics`;
            if (categorySlug) {
                url = `${this.baseURL}/api/forum/categories/${categorySlug}/topics`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                console.warn(`⚠️ Erro ao buscar tópicos (${response.status}), retornando array vazio`);
                return [];
            }

            const data = await response.json();
            const topics = Array.isArray(data) ? data : [];

            console.log(`✅ ${topics.length} tópicos carregados`);

            // Formatar tópicos
            return topics.map(topic => this.formatTopic(topic));

        } catch (error) {
            console.error("❌ Erro ao buscar tópicos:", error);
            return [];
        }
    }

    async getTopic(id) {
        try {
            console.log('📖 Buscando tópico:', id);
            const response = await fetch(`${this.baseURL}/api/forum/topics/${id}`);

            if (!response.ok) {
                throw new Error(`Tópico não encontrado (${response.status})`);
            }

            const topic = await response.json();
            console.log('✅ Tópico encontrado:', topic.title);
            return this.formatTopic(topic);

        } catch (error) {
            console.error("❌ Erro ao buscar tópico:", error);
            throw error;
        }
    }

    async createTopic(data) {
        if (!this.currentUser) {
            throw new Error("Faça login para criar tópicos");
        }

        console.log('📝 Criando tópico:', data);

        const payload = {
            category_id: parseInt(data.categoryId),
            title: data.title.trim(),
            content: data.content.trim(),
            author_discord_id: this.currentUser.id,
            author_name: this.currentUser.global_name || this.currentUser.username,
            author_avatar: this.currentUser.avatar
        };

        const response = await fetch(`${this.baseURL}/api/forum/topics`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Erro ao criar tópico");
        }

        const newTopic = await response.json();
        console.log('✅ Tópico criado:', newTopic.id);
        return this.formatTopic(newTopic);
    }

    /* ====================== RESPOSTAS ====================== */
    async getReplies(topicId) {
        try {
            console.log('💬 Buscando respostas para tópico:', topicId);
            const response = await fetch(`${this.baseURL}/api/forum/topics/${topicId}/replies`);

            if (!response.ok) {
                console.warn(`⚠️ Erro ao buscar respostas (${response.status})`);
                return [];
            }

            const data = await response.json();
            const replies = Array.isArray(data) ? data : [];

            console.log(`✅ ${replies.length} respostas carregadas`);
            return replies.map(reply => this.formatReply(reply));

        } catch (error) {
            console.error("❌ Erro ao buscar respostas:", error);
            return [];
        }
    }

    async createReply(data) {
        if (!this.currentUser) {
            throw new Error("Faça login para enviar respostas");
        }

        console.log('💬 Criando resposta:', data);

        const payload = {
            topic_id: parseInt(data.topicId),
            content: data.content.trim(),
            author_discord_id: this.currentUser.id,
            author_name: this.currentUser.global_name || this.currentUser.username,
            author_avatar: this.currentUser.avatar
        };

        const response = await fetch(`${this.baseURL}/api/forum/replies`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Erro ao enviar resposta");
        }

        const newReply = await response.json();
        console.log('✅ Resposta criada:', newReply.id);
        return this.formatReply(newReply);
    }

    /* ====================== FORMATAÇÃO ====================== */
    formatTopic(topic) {
        // Log para debug da estrutura do tópico
        console.log('🔧 Estrutura do tópico recebido:', topic);

        const formatted = {
            // IDs
            id: topic.id,
            categoryId: topic.category_id || topic.category?.id,
            categorySlug: topic.category_slug || topic.category?.slug,
            categoryName: topic.category_name || topic.category?.name,

            // Conteúdo
            title: topic.title || 'Sem título',
            content: topic.content || 'Sem conteúdo',

            // Autor
            author: topic.author_name || 'Autor desconhecido',
            authorId: topic.author_discord_id || '0',
            authorAvatar: topic.author_avatar,

            // Metadados
            views: topic.views || 0,
            isPinned: topic.is_pinned || false,
            isLocked: topic.is_locked || false,

            // Datas
            createdAt: topic.created_at,
            updatedAt: topic.updated_at,
            lastReplyAt: topic.last_reply_at
        };

        console.log('📝 Tópico formatado:', {
            id: formatted.id,
            title: formatted.title,
            author: formatted.author,
            category: formatted.categoryName
        });

        return formatted;
    }

    formatReply(reply) {
        return {
            id: reply.id,
            topicId: reply.topic_id,
            content: reply.content,
            author: reply.author_name,
            authorId: reply.author_discord_id,
            authorAvatar: reply.author_avatar,
            createdAt: reply.created_at,
            updatedAt: reply.updated_at,
            isEdited: reply.is_edited || false
        };
    }

    getAvatarUrl(userId, avatarHash) {
        if (!userId || userId === '0') {
            return 'https://cdn.discordapp.com/embed/avatars/0.png';
        }

        if (avatarHash) {
            return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.webp?size=64`;
        } else {
            return `https://cdn.discordapp.com/embed/avatars/${userId % 5}.png`;
        }
    }
}

console.log("🌐 ForumAPI carregado");
window.forumAPI = new ForumAPI();