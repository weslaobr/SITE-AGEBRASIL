// forum-api.js - VERSÃO 100% POSTGRESQL
class ForumAPI {
    constructor() {
        this.baseURL = window.location.origin;
        this.currentUser = null;
        this.isAdmin = false;
        this.categories = [];
        this.admins = this.getDefaultAdmins();

        console.log('🔗 ForumAPI PostgreSQL inicializado');
        this.loadCurrentUser();
        this.loadCategories();
    }

    getDefaultAdmins() {
        // ✅ SEU DISCORD ID CONFIGURADO
        return [
            '407624932101455873' // WESLEY - ADMIN
        ];
    }

    async loadCurrentUser() {
        if (window.discordAuth && window.discordAuth.isLoggedIn()) {
            this.currentUser = window.discordAuth.getCurrentUser();
            this.isAdmin = this.checkAdminStatus(this.currentUser.id);

            console.log('👤 Usuário carregado:', {
                username: this.currentUser.username,
                id: this.currentUser.id,
                admin: this.isAdmin ? '✅ ADMIN' : '❌ USUÁRIO'
            });
        }
    }

    checkAdminStatus(userId) {
        const isAdmin = this.admins.includes(userId.toString());
        console.log('🔐 Verificando admin status:', { userId, isAdmin });
        return isAdmin;
    }

    async loadCategories() {
        try {
            const response = await fetch(`${this.baseURL}/api/forum/categories`);
            if (response.ok) {
                this.categories = await response.json();
                console.log('📂 Categorias carregadas do PostgreSQL:', this.categories.length);
            } else {
                throw new Error('Erro ao carregar categorias');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar categorias:', error);
            // Fallback para categorias padrão
            this.categories = [
                {
                    id: 1,
                    name: "Estratégias e Dicas",
                    slug: "estrategias-dicas",
                    description: "Compartilhe e aprenda estratégias avançadas",
                    icon: "fas fa-chess",
                    color: "#3e8ce5",
                    topic_count: 0,
                    reply_count: 0
                },
                {
                    id: 2,
                    name: "Discussões Gerais",
                    slug: "discussoes-gerais",
                    description: "Conversas sobre Age of Empires IV",
                    icon: "fas fa-comments",
                    color: "#48bb78",
                    topic_count: 0,
                    reply_count: 0
                },
                {
                    id: 3,
                    name: "Multiplayer",
                    slug: "multiplayer",
                    description: "Partidas, ranks e competições",
                    icon: "fas fa-users",
                    color: "#e53e3e",
                    topic_count: 0,
                    reply_count: 0
                },
                {
                    id: 4,
                    name: "Civilizações",
                    slug: "civilizacoes",
                    description: "Discussões sobre as civilizações",
                    icon: "fas fa-landmark",
                    color: "#9f7aea",
                    topic_count: 0,
                    reply_count: 0
                }
            ];
        }
    }

    // 📊 ESTATÍSTICAS
    async getStats() {
        try {
            const response = await fetch(`${this.baseURL}/api/forum/stats`);
            if (response.ok) {
                return await response.json();
            }
            throw new Error('Erro ao buscar estatísticas');
        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas:', error);
            return { totalTopics: 0, totalReplies: 0, totalMembers: 0, onlineNow: 0 };
        }
    }

    // 📝 TÓPICOS
    async getTopics(categorySlug = null) {
        try {
            if (categorySlug) {
                // Tópicos de uma categoria específica
                const response = await fetch(`${this.baseURL}/api/forum/categories/${categorySlug}/topics`);
                if (response.ok) {
                    const topics = await response.json();
                    // Converter para formato compatível com a interface existente
                    return topics.map(topic => ({
                        id: topic.id,
                        categoryId: topic.category_id,
                        title: topic.title,
                        content: topic.content,
                        author: topic.author_name,
                        authorId: topic.author_discord_id,
                        authorAvatar: topic.author_avatar,
                        views: topic.views,
                        isPinned: topic.is_pinned,
                        isLocked: topic.is_locked,
                        createdAt: topic.created_at,
                        updatedAt: topic.updated_at,
                        lastReplyAt: topic.last_reply_at
                    }));
                }
            } else {
                // Tópicos recentes (de todas as categorias)
                const allTopics = [];
                for (const category of this.categories) {
                    const response = await fetch(`${this.baseURL}/api/forum/categories/${category.slug}/topics?limit=5`);
                    if (response.ok) {
                        const topics = await response.json();
                        const convertedTopics = topics.map(topic => ({
                            id: topic.id,
                            categoryId: topic.category_id,
                            title: topic.title,
                            content: topic.content,
                            author: topic.author_name,
                            authorId: topic.author_discord_id,
                            authorAvatar: topic.author_avatar,
                            views: topic.views,
                            isPinned: topic.is_pinned,
                            isLocked: topic.is_locked,
                            createdAt: topic.created_at,
                            updatedAt: topic.updated_at,
                            lastReplyAt: topic.last_reply_at
                        }));
                        allTopics.push(...convertedTopics);
                    }
                }
                return allTopics
                    .sort((a, b) => new Date(b.lastReplyAt || b.updatedAt) - new Date(a.lastReplyAt || a.updatedAt))
                    .slice(0, 10);
            }
            return [];
        } catch (error) {
            console.error('❌ Erro ao buscar tópicos:', error);
            return [];
        }
    }

    async getTopic(topicId) {
        try {
            const response = await fetch(`${this.baseURL}/api/forum/topics/${topicId}`);
            if (!response.ok) {
                throw new Error('Tópico não encontrado');
            }
            const topic = await response.json();

            // Converter para formato compatível
            return {
                id: topic.id,
                categoryId: topic.category_id,
                title: topic.title,
                content: topic.content,
                author: topic.author_name,
                authorId: topic.author_discord_id,
                authorAvatar: topic.author_avatar,
                views: topic.views,
                isPinned: topic.is_pinned,
                isLocked: topic.is_locked,
                createdAt: topic.created_at,
                updatedAt: topic.updated_at,
                lastReplyAt: topic.last_reply_at,
                category_name: topic.category_name,
                category_slug: topic.category_slug
            };
        } catch (error) {
            console.error('❌ Erro ao buscar tópico:', error);
            throw error;
        }
    }

    async createTopic(topicData) {
        if (!this.currentUser) {
            throw new Error('Usuário não autenticado. Faça login com Discord para criar tópicos.');
        }

        console.log('🔍 Dados do usuário atual:', this.currentUser);
        console.log('📝 Dados do tópico recebidos:', topicData);

        const payload = {
            category_id: parseInt(topicData.categoryId),
            title: topicData.title.trim(),
            content: topicData.content.trim(),
            author_discord_id: this.currentUser.id,
            author_name: this.currentUser.global_name || this.currentUser.username,
            author_avatar: this.currentUser.avatar
        };

        console.log('📤 Payload para API:', payload);

        try {
            const response = await fetch(`${this.baseURL}/api/forum/topics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            console.log('📊 Status da resposta:', response.status);
            console.log('📊 Response OK:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erro detalhado da API:', errorText);

                let errorMessage = `Erro ${response.status} ao criar tópico`;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    // Não é JSON, usar texto puro
                    errorMessage = errorText || errorMessage;
                }

                throw new Error(errorMessage);
            }

            const newTopic = await response.json();
            console.log('✅ Tópico criado com sucesso:', newTopic);

            return {
                id: newTopic.id,
                categoryId: newTopic.category_id,
                title: newTopic.title,
                content: newTopic.content,
                author: newTopic.author_name,
                authorId: newTopic.author_discord_id,
                authorAvatar: newTopic.author_avatar,
                views: newTopic.views,
                isPinned: newTopic.is_pinned,
                isLocked: newTopic.is_locked,
                createdAt: newTopic.created_at,
                updatedAt: newTopic.updated_at
            };

        } catch (error) {
            console.error('❌ Erro completo ao criar tópico:', error);
            throw error;
        }
    }

    // 💬 RESPOSTAS
    async getReplies(topicId) {
        try {
            const response = await fetch(`${this.baseURL}/api/forum/topics/${topicId}/replies`);
            if (response.ok) {
                const replies = await response.json();
                // Converter para formato compatível
                return replies.map(reply => ({
                    id: reply.id,
                    topicId: reply.topic_id,
                    content: reply.content,
                    author: reply.author_name,
                    authorId: reply.author_discord_id,
                    authorAvatar: reply.author_avatar,
                    replyTo: reply.reply_to,
                    likes: reply.likes,
                    isEdited: reply.is_edited,
                    lastEditedBy: reply.last_edited_by,
                    lastEditedAt: reply.last_edited_at,
                    createdAt: reply.created_at,
                    updatedAt: reply.updated_at
                }));
            }
            return [];
        } catch (error) {
            console.error('❌ Erro ao buscar respostas:', error);
            return [];
        }
    }

    async createReply(replyData) {
        if (!this.currentUser) {
            throw new Error('Usuário não autenticado. Faça login com Discord para responder.');
        }

        // Verificar se o tópico está bloqueado
        try {
            const topic = await this.getTopic(replyData.topicId);
            if (topic && topic.isLocked) {
                throw new Error('Este tópico está bloqueado. Não é possível responder.');
            }
        } catch (error) {
            // Se não conseguir verificar o tópico, continuar normalmente
            console.log('⚠️ Não foi possível verificar status do tópico:', error.message);
        }

        const payload = {
            topic_id: parseInt(replyData.topicId),
            content: replyData.content.trim(),
            author_discord_id: this.currentUser.id,
            author_name: this.currentUser.global_name || this.currentUser.username,
            author_avatar: this.currentUser.avatar
        };

        console.log('📤 Criando resposta no PostgreSQL:', payload);

        try {
            const response = await fetch(`${this.baseURL}/api/forum/replies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erro ${response.status} ao criar resposta`);
            }

            const newReply = await response.json();
            console.log('✅ Resposta criada com sucesso no PostgreSQL:', newReply.id);

            // Converter para formato compatível
            return {
                id: newReply.id,
                topicId: newReply.topic_id,
                content: newReply.content,
                author: newReply.author_name,
                authorId: newReply.author_discord_id,
                authorAvatar: newReply.author_avatar,
                createdAt: newReply.created_at
            };

        } catch (error) {
            console.error('❌ Erro ao criar resposta:', error);
            throw error;
        }
    }

    // 🔧 MÉTODOS DE MODERAÇÃO
    async deleteTopic(topicId) {
        if (!this.isAdmin) {
            throw new Error('Apenas administradores podem deletar tópicos');
        }

        console.log('🗑️ Admin deletando tópico:', topicId);

        try {
            const response = await fetch(`${this.baseURL}/api/forum/topics/${topicId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Erro ${response.status} ao deletar tópico`);
            }

            console.log('✅ Tópico deletado com sucesso do PostgreSQL');
            return true;

        } catch (error) {
            console.error('❌ Erro ao deletar tópico:', error);
            throw error;
        }
    }

    async deleteReply(replyId) {
        if (!this.isAdmin) {
            throw new Error('Apenas administradores podem deletar respostas');
        }

        console.log('🗑️ Admin deletando resposta:', replyId);

        try {
            const response = await fetch(`${this.baseURL}/api/forum/replies/${replyId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Erro ${response.status} ao deletar resposta`);
            }

            console.log('✅ Resposta deletada com sucesso do PostgreSQL');
            return true;

        } catch (error) {
            console.error('❌ Erro ao deletar resposta:', error);
            throw error;
        }
    }

    async togglePinTopic(topicId) {
        if (!this.isAdmin) {
            throw new Error('Apenas administradores podem fixar tópicos');
        }

        console.log('📌 Alternando pin do tópico:', topicId);

        try {
            const topic = await this.getTopic(topicId);
            const newPinnedState = !topic.isPinned;

            const response = await fetch(`${this.baseURL}/api/forum/topics/${topicId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    is_pinned: newPinnedState
                })
            });

            if (!response.ok) {
                throw new Error(`Erro ${response.status} ao alterar pin do tópico`);
            }

            const updatedTopic = await response.json();
            console.log('✅ Tópico', newPinnedState ? 'fixado' : 'desfixado', 'com sucesso');

            return {
                id: updatedTopic.id,
                isPinned: updatedTopic.is_pinned
            };

        } catch (error) {
            console.error('❌ Erro ao alterar pin do tópico:', error);
            throw error;
        }
    }

    async toggleLockTopic(topicId) {
        if (!this.isAdmin) {
            throw new Error('Apenas administradores podem bloquear tópicos');
        }

        console.log('🔒 Alternando bloqueio do tópico:', topicId);

        try {
            const topic = await this.getTopic(topicId);
            const newLockedState = !topic.isLocked;

            const response = await fetch(`${this.baseURL}/api/forum/topics/${topicId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    is_locked: newLockedState
                })
            });

            if (!response.ok) {
                throw new Error(`Erro ${response.status} ao alterar bloqueio do tópico`);
            }

            const updatedTopic = await response.json();
            console.log('✅ Tópico', newLockedState ? 'bloqueado' : 'desbloqueado', 'com sucesso');

            return {
                id: updatedTopic.id,
                isLocked: updatedTopic.is_locked
            };

        } catch (error) {
            console.error('❌ Erro ao alterar bloqueio do tópico:', error);
            throw error;
        }
    }

    // 🔍 PESQUISA
    async searchTopics(query, categorySlug = null) {
        try {
            let url = `${this.baseURL}/api/forum/search?q=${encodeURIComponent(query)}`;
            if (categorySlug) {
                url += `&category=${categorySlug}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const topics = await response.json();
                // Converter para formato compatível
                return topics.map(topic => ({
                    id: topic.id,
                    categoryId: topic.category_id,
                    title: topic.title,
                    content: topic.content,
                    author: topic.author_name,
                    authorId: topic.author_discord_id,
                    authorAvatar: topic.author_avatar,
                    views: topic.views,
                    isPinned: topic.is_pinned,
                    isLocked: topic.is_locked,
                    createdAt: topic.created_at,
                    updatedAt: topic.updated_at,
                    category_name: topic.category_name,
                    category_slug: topic.category_slug,
                    reply_count: topic.reply_count
                }));
            }
            return [];
        } catch (error) {
            console.error('❌ Erro ao pesquisar:', error);
            return [];
        }
    }

    // MÉTODOS AUXILIARES (para compatibilidade)
    isContentOwner(content) {
        if (!this.currentUser) return false;
        return content.authorId === this.currentUser.id;
    }

    canModerate(content) {
        return this.isAdmin || this.isContentOwner(content);
    }
}

// 🌐 CRIAR INSTÂNCIA GLOBAL
console.log('🚀 Inicializando ForumAPI 100% PostgreSQL...');
window.forumAPI = new ForumAPI();