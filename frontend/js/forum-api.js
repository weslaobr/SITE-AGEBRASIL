// forum-api.js - VERSÃO CORRIGIDA PARA POSTGRESQL
class ForumAPI {
    constructor() {
        this.baseURL = "https://ageivbrasil.up.railway.app";
        this.currentUser = null;
        this.isAdmin = false;
        this.categories = [];
        this.admins = ["407624932101455873"]; // WESLEY

        console.log("🚀 ForumAPI inicializado para PostgreSQL");
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

                if (window.authManager) {
                    const token = localStorage.getItem('discord_access_token');
                    window.authManager.setUser(this.currentUser, token);
                }
            }
            else {
                const userData = localStorage.getItem('discord_user');
                if (userData) {
                    this.currentUser = JSON.parse(userData);
                    this.isAdmin = this.admins.includes(String(this.currentUser.id));
                }
            }

            console.log("👤 Usuário carregado:", {
                id: this.currentUser?.id,
                nome: this.currentUser?.global_name || this.currentUser?.username,
                admin: this.isAdmin
            });

        } catch (error) {
            console.error('❌ Erro ao carregar usuário:', error);
        }
    }

    /* ====================== CATEGORIES ====================== */

    async loadCategories() {
        try {
            console.log('📂 Carregando categorias do PostgreSQL...');
            const response = await fetch(`${this.baseURL}/api/forum/categories`);

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();
            this.categories = Array.isArray(data) ? data : [];

            console.log("✅ Categorias carregadas:", this.categories.length);
            console.log("📋 Lista de categorias:", this.categories.map(c => ({ id: c.id, name: c.name, slug: c.slug })));

        } catch (error) {
            console.error("❌ Erro ao carregar categorias:", error);
            this.categories = [];
        }
    }

    /* ====================== STATS ====================== */
    async getStats() {
        try {
            console.log('📊 Buscando estatísticas...');
            const response = await fetch(`${this.baseURL}/api/forum/stats`);

            if (!response.ok) {
                console.error('❌ Erro ao buscar estatísticas:', response.status);
                return this.getDefaultStats();
            }

            const stats = await response.json();
            console.log('✅ Estatísticas carregadas:', stats);
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

    /* ====================== TOPICS ====================== */

    async getTopics(categorySlug = null) {
        try {
            console.log('📝 Buscando tópicos para categoria:', categorySlug);

            let url = `${this.baseURL}/api/forum/topics`;
            if (categorySlug) {
                url = `${this.baseURL}/api/forum/categories/${categorySlug}/topics`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                console.error('❌ Erro ao buscar tópicos:', response.status);
                return [];
            }

            const topics = await response.json();
            console.log(`✅ ${topics.length} tópicos carregados`);

            // Formatar os tópicos para o formato esperado pelo frontend
            return topics.map(topic => this.formatTopicFromDB(topic));

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
                throw new Error(`Tópico não encontrado: ${response.status}`);
            }

            const topic = await response.json();
            console.log('✅ Tópico encontrado:', topic.title);
            return this.formatTopicFromDB(topic);

        } catch (error) {
            console.error("❌ Erro ao buscar tópico:", error);
            throw error;
        }
    }

    async createTopic(data) {
        if (!this.currentUser) {
            throw new Error("Faça login para criar tópicos");
        }

        console.log('📝 Criando novo tópico:', data);

        const payload = {
            category_id: parseInt(data.categoryId),
            title: data.title.trim(),
            content: data.content.trim(),
            author_discord_id: this.currentUser.id,
            author_name: this.currentUser.global_name || this.currentUser.username,
            author_avatar: this.currentUser.avatar
        };

        console.log('📤 Payload para criação:', payload);

        const response = await fetch(`${this.baseURL}/api/forum/topics`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro na resposta:', errorText);
            throw new Error(errorText || "Erro ao criar tópico");
        }

        const newTopic = await response.json();
        console.log('✅ Tópico criado com sucesso:', newTopic);
        return this.formatTopicFromDB(newTopic);
    }

    /* ====================== REPLIES ====================== */

    async getReplies(topicId) {
        try {
            console.log('💬 Buscando respostas para tópico:', topicId);
            const response = await fetch(`${this.baseURL}/api/forum/topics/${topicId}/replies`);

            if (!response.ok) {
                console.error('❌ Erro ao buscar respostas:', response.status);
                return [];
            }

            const replies = await response.json();
            console.log(`✅ ${replies.length} respostas carregadas`);

            return replies.map(reply => this.formatReplyFromDB(reply));

        } catch (error) {
            console.error("❌ Erro ao buscar respostas:", error);
            return [];
        }
    }

    async createReply(data) {
        if (!this.currentUser) {
            throw new Error("Faça login para enviar respostas");
        }

        console.log('💬 Criando nova resposta:', data);

        const payload = {
            topic_id: parseInt(data.topicId),
            content: data.content.trim(),
            author_discord_id: this.currentUser.id,
            author_name: this.currentUser.global_name || this.currentUser.username,
            author_avatar: this.currentUser.avatar
        };

        const response = await fetch(`${this.baseURL}/api/forum/replies`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Erro ao enviar resposta");
        }

        const newReply = await response.json();
        console.log('✅ Resposta criada com sucesso');
        return this.formatReplyFromDB(newReply);
    }

    /* ====================== MODERAÇÃO ====================== */

    async deleteTopic(id) {
        if (!this.isAdmin) throw new Error("Sem permissão");

        console.log('🗑️ Deletando tópico:', id);
        const res = await fetch(`${this.baseURL}/api/forum/topics/${id}`, {
            method: "DELETE"
        });

        if (!res.ok) throw new Error("Erro ao deletar tópico");

        console.log('✅ Tópico deletado com sucesso');
        return true;
    }

    async deleteReply(id) {
        if (!this.isAdmin) throw new Error("Sem permissão");

        console.log('🗑️ Deletando resposta:', id);
        const res = await fetch(`${this.baseURL}/api/forum/replies/${id}`, {
            method: "DELETE"
        });

        if (!res.ok) throw new Error("Erro ao deletar resposta");

        console.log('✅ Resposta deletada com sucesso');
        return true;
    }

    async togglePinTopic(id) {
        if (!this.isAdmin) throw new Error("Sem permissão");

        console.log('📌 Alternando pin do tópico:', id);
        const topic = await this.getTopic(id);

        const res = await fetch(`${this.baseURL}/api/forum/topics/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_pinned: !topic.isPinned })
        });

        if (!res.ok) throw new Error("Erro ao fixar tópico");

        console.log('✅ Pin do tópico alterado');
        return true;
    }

    async toggleLockTopic(id) {
        if (!this.isAdmin) throw new Error("Sem permissão");

        console.log('🔒 Alternando lock do tópico:', id);
        const topic = await this.getTopic(id);

        const res = await fetch(`${this.baseURL}/api/forum/topics/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_locked: !topic.isLocked })
        });

        if (!res.ok) throw new Error("Erro ao bloquear tópico");

        console.log('✅ Lock do tópico alterado');
        return true;
    }

    /* ====================== FORMATAÇÃO DE DADOS ====================== */

    formatTopicFromDB(topic) {
        // Mapear campos do PostgreSQL para o formato do frontend
        const formattedTopic = {
            // IDs e relações
            id: topic.id,
            categoryId: topic.category_id,
            categorySlug: topic.category_slug || topic.category?.slug,
            categoryName: topic.category_name || topic.category?.name,

            // Conteúdo
            title: topic.title,
            content: topic.content,

            // Autor
            author: topic.author_name,
            authorId: topic.author_discord_id,
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
            id: formattedTopic.id,
            title: formattedTopic.title,
            author: formattedTopic.author,
            authorAvatar: formattedTopic.authorAvatar,
            category: formattedTopic.categoryName
        });

        return formattedTopic;
    }

    formatReplyFromDB(reply) {
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
        if (!userId) {
            return 'https://cdn.discordapp.com/embed/avatars/0.png';
        }

        if (avatarHash) {
            return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.webp?size=64`;
        } else {
            return `https://cdn.discordapp.com/embed/avatars/${userId % 5}.png`;
        }
    }
}

// Inicialização global
console.log("🌐 ForumAPI PostgreSQL carregado");
window.forumAPI = new ForumAPI();