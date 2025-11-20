// forum-api.js - VERSÃO CORRIGIDA COM AVATARES
class ForumAPI {
    constructor() {
        this.baseURL = "https://ageivbrasil.up.railway.app";
        this.currentUser = null;
        this.isAdmin = false;
        this.categories = [];
        this.admins = ["407624932101455873"]; // WESLEY

        console.log("🚀 ForumAPI inicializado");
        this.init();
    }

    async init() {
        await this.loadCurrentUser();
        await this.loadCategories();
    }

    async loadCurrentUser() {
        // Usar o AuthManager como fonte principal
        if (window.authManager && window.authManager.currentUser) {
            this.currentUser = window.authManager.currentUser;
            this.isAdmin = window.authManager.isAdmin;
        }
        // Fallback para discordAuth
        else if (window.discordAuth && window.discordAuth.isLoggedIn()) {
            this.currentUser = window.discordAuth.getCurrentUser();
            this.isAdmin = this.admins.includes(String(this.currentUser.id));

            // Sincronizar com AuthManager
            if (window.authManager) {
                const token = localStorage.getItem('discord_access_token');
                window.authManager.setUser(this.currentUser, token);
            }
        }
        // Fallback final: localStorage
        else {
            try {
                const userData = localStorage.getItem('discord_user');
                if (userData) {
                    this.currentUser = JSON.parse(userData);
                    this.isAdmin = this.admins.includes(String(this.currentUser.id));
                }
            } catch (error) {
                console.error('Erro ao carregar usuário do localStorage:', error);
            }
        }

        console.log("👤 Usuário carregado no ForumAPI:", {
            id: this.currentUser?.id,
            nome: this.currentUser?.global_name || this.currentUser?.username,
            admin: this.isAdmin,
            avatar: this.currentUser?.avatar ? 'Sim' : 'Não'
        });
    }

    /* ====================== CATEGORIES ====================== */

    async loadCategories() {
        try {
            const response = await fetch(`${this.baseURL}/api/forum/categories`);

            if (!response.ok) throw new Error("Erro ao carregar categorias");

            this.categories = await response.json();

            console.log("📂 Categorias carregadas:", this.categories.length);

        } catch (error) {
            console.error("❌ Erro ao carregar categorias:", error);
            this.categories = [];
        }
    }

    /* ====================== STATS ====================== */
    async getStats() {
        try {
            const response = await fetch(`${this.baseURL}/api/forum/stats`);
            return response.ok ? await response.json() : null;
        } catch (error) {
            console.error("Erro stats:", error);
            return null;
        }
    }

    /* ====================== TOPICS ====================== */

    async getTopics(categorySlug = null) {
        try {
            // 📌 CARREGAR TÓPICOS DE UMA CATEGORIA
            if (categorySlug) {
                const response = await fetch(
                    `${this.baseURL}/api/forum/categories/${categorySlug}/topics`
                );

                if (!response.ok) return [];

                const topics = await response.json();

                return topics.map(topic => this.formatTopic(topic));
            }

            // 📌 RECENT TOPICS (todas categorias)
            const allTopics = [];

            for (const cat of this.categories) {
                const response = await fetch(
                    `${this.baseURL}/api/forum/categories/${cat.slug}/topics?limit=5`
                );

                if (!response.ok) continue;

                const topics = await response.json();

                allTopics.push(...topics.map(t => this.formatTopic(t)));
            }

            return allTopics
                .sort((a, b) =>
                    new Date(b.lastReplyAt || b.updatedAt) -
                    new Date(a.lastReplyAt || a.updatedAt)
                )
                .slice(0, 12);

        } catch (error) {
            console.error("❌ Erro ao buscar tópicos:", error);
            return [];
        }
    }

    async getTopic(id) {
        try {
            const response = await fetch(`${this.baseURL}/api/forum/topics/${id}`);

            if (!response.ok) throw new Error("Tópico não encontrado");

            return this.formatTopic(await response.json());

        } catch (error) {
            console.error("Erro:", error);
            throw error;
        }
    }

    async createTopic(data) {
        if (!this.currentUser) throw new Error("Faça login para criar tópicos");

        const payload = {
            category_id: Number(data.categoryId),
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
            const err = await response.text();
            throw new Error(err);
        }

        return this.formatTopic(await response.json());
    }

    /* ====================== REPLIES ====================== */

    async getReplies(topicId) {
        try {
            const response = await fetch(
                `${this.baseURL}/api/forum/topics/${topicId}/replies`
            );

            if (!response.ok) return [];

            const replies = await response.json();

            return replies.map(rep => ({
                id: rep.id,
                topicId: rep.topic_id,
                content: rep.content,
                author: rep.author_name,
                authorId: rep.author_discord_id,
                authorAvatar: rep.author_avatar,
                createdAt: rep.created_at,
                updatedAt: rep.updated_at,
                isEdited: rep.is_edited
            }));

        } catch (error) {
            console.error("Erro replies:", error);
            return [];
        }
    }

    async createReply(data) {
        if (!this.currentUser)
            throw new Error("Faça login para enviar respostas");

        const payload = {
            topic_id: Number(data.topicId),
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

        if (!response.ok) throw new Error("Erro ao enviar resposta");

        const rep = await response.json();

        return {
            id: rep.id,
            topicId: rep.topic_id,
            content: rep.content,
            author: rep.author_name,
            authorId: rep.author_discord_id,
            authorAvatar: rep.author_avatar,
            createdAt: rep.created_at
        };
    }

    /* ====================== MODERAÇÃO ====================== */

    async deleteTopic(id) {
        if (!this.isAdmin) throw new Error("Sem permissão");

        const res = await fetch(`${this.baseURL}/api/forum/topics/${id}`, {
            method: "DELETE"
        });

        if (!res.ok) throw new Error("Erro ao deletar tópico");

        return true;
    }

    async deleteReply(id) {
        if (!this.isAdmin) throw new Error("Sem permissão");

        const res = await fetch(`${this.baseURL}/api/forum/replies/${id}`, {
            method: "DELETE"
        });

        if (!res.ok) throw new Error("Erro ao deletar resposta");

        return true;
    }

    async togglePinTopic(id) {
        if (!this.isAdmin) throw new Error("Sem permissão");

        const topic = await this.getTopic(id);

        const res = await fetch(`${this.baseURL}/api/forum/topics/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_pinned: !topic.isPinned })
        });

        if (!res.ok) throw new Error("Erro ao fixar tópico");

        return true;
    }

    async toggleLockTopic(id) {
        if (!this.isAdmin) throw new Error("Sem permissão");

        const topic = await this.getTopic(id);

        const res = await fetch(`${this.baseURL}/api/forum/topics/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_locked: !topic.isLocked })
        });

        if (!res.ok) throw new Error("Erro ao bloquear tópico");

        return true;
    }

    /* ====================== FORMAT topic ====================== */

    formatTopic(t) {
        const formattedTopic = {
            id: t.id,
            categoryId: t.category_id,
            categorySlug: t.category_slug,
            categoryName: t.category_name,

            title: t.title,
            content: t.content,

            author: t.author_name,
            authorId: t.author_discord_id,
            authorAvatar: t.author_avatar,

            views: t.views,
            isPinned: t.is_pinned,
            isLocked: t.is_locked,

            createdAt: t.created_at,
            updatedAt: t.updated_at,
            lastReplyAt: t.last_reply_at
        };

        console.log('📝 Tópico formatado:', {
            id: formattedTopic.id,
            author: formattedTopic.author,
            authorAvatar: formattedTopic.authorAvatar,
            hasAvatar: !!formattedTopic.authorAvatar
        });

        return formattedTopic;
    }

    getAvatarUrl(userId, avatarHash) {
        if (!userId) return null;

        if (avatarHash) {
            return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.webp?size=64`;
        } else {
            return `https://cdn.discordapp.com/embed/avatars/${userId % 5}.png`;
        }
    }
}

console.log("🌐 ForumAPI carregado");
window.forumAPI = new ForumAPI();