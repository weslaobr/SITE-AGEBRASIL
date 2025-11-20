// forum-api.js - VERSÃO COMPLETA COM CORREÇÕES DE ESTATÍSTICAS
class ForumAPI {
    constructor() {
        this.categories = this.loadData('forum_categories') || this.getDefaultCategories();
        this.topics = this.loadData('forum_topics') || [];
        this.replies = this.loadData('forum_replies') || [];
        this.users = this.loadData('forum_users') || [];
        this.admins = this.loadData('forum_admins') || this.getDefaultAdmins();
        this.currentUser = null;
        this.isAdmin = false;

        // Carregar usuário atual
        this.loadCurrentUser();

        console.log('📊 ForumAPI inicializado:', {
            categorias: this.categories.length,
            topicos: this.topics.length,
            respostas: this.replies.length,
            usuario: this.currentUser ? this.currentUser.username : 'Nenhum',
            admin: this.isAdmin ? '✅' : '❌'
        });

        // Verificar integridade dos dados
        this.autoFixStats();
    }

    getDefaultAdmins() {
        // ✅ SUBSTITUA PELO SEU DISCORD USER ID
        return [
            '407624932101455873' // SEU ID AQUI - ex: '384729384712'
        ];
    }

    getDefaultCategories() {
        return [
            {
                id: 1,
                name: "Estratégias e Dicas",
                slug: "estrategias-dicas",
                description: "Compartilhe e aprenda estratégias avançadas",
                icon: "fas fa-chess",
                color: "#3e8ce5",
                topicCount: 0,
                replyCount: 0
            },
            {
                id: 2,
                name: "Discussões Gerais",
                slug: "discussoes-gerais",
                description: "Conversas sobre Age of Empires IV",
                icon: "fas fa-comments",
                color: "#48bb78",
                topicCount: 0,
                replyCount: 0
            },
            {
                id: 3,
                name: "Multiplayer",
                slug: "multiplayer",
                description: "Partidas, ranks e competições",
                icon: "fas fa-users",
                color: "#e53e3e",
                topicCount: 0,
                replyCount: 0
            },
            {
                id: 4,
                name: "Civilizações",
                slug: "civilizacoes",
                description: "Discussões sobre as civilizações",
                icon: "fas fa-landmark",
                color: "#9f7aea",
                topicCount: 0,
                replyCount: 0
            }
        ];
    }

    loadCurrentUser() {
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

    // MÉTODOS AUXILIARES
    loadData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            return null;
        }
    }

    saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            return false;
        }
    }

    getTopics() {
        return this.topics.sort((a, b) => {
            // Tópicos fixados primeiro, depois por data
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
    }

    getTopic(topicId) {
        return this.topics.find(topic => topic.id == topicId);
    }

    getReplies(topicId) {
        return this.replies
            .filter(reply => reply.topicId == topicId)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    updateCategoryCounts(categoryId, topicDelta = 0, replyDelta = 0) {
        const category = this.categories.find(cat => cat.id == categoryId);
        if (category) {
            // ✅ CORREÇÃO: Garantir que os valores nunca fiquem negativos
            category.topicCount = Math.max(0, category.topicCount + topicDelta);
            category.replyCount = Math.max(0, category.replyCount + replyDelta);

            this.saveData('forum_categories', this.categories);

            console.log('📊 Categoria atualizada:', {
                categoria: category.name,
                novoTopicoCount: category.topicCount,
                novoReplyCount: category.replyCount,
                deltaTopicos: topicDelta,
                deltaRespostas: replyDelta
            });
        } else {
            console.error('❌ Categoria não encontrada para atualização:', categoryId);
        }
    }

    getStats() {
        const totalTopics = this.topics.length;
        const totalReplies = this.replies.length;
        const totalMembers = [...new Set(this.topics.map(t => t.authorId).concat(this.replies.map(r => r.authorId)))].length;

        const stats = {
            totalTopics,
            totalReplies,
            totalMembers,
            onlineNow: Math.floor(Math.random() * 50) + 10
        };

        return stats;
    }

    // CRIAR TÓPICO COM AUTENTICAÇÃO OBRIGATÓRIA
    async createTopic(topicData) {
        if (!this.currentUser) {
            throw new Error('Usuário não autenticado. Faça login com Discord para criar tópicos.');
        }

        const topic = {
            id: Date.now(),
            ...topicData,
            author: this.currentUser.global_name || this.currentUser.username,
            authorId: this.currentUser.id,
            authorAvatar: this.currentUser.avatar,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            views: 0,
            isPinned: false,
            isLocked: false
        };

        this.topics.unshift(topic);
        this.updateCategoryCounts(topic.categoryId, 1, 0);
        this.saveData('forum_topics', this.topics);

        console.log('📝 Novo tópico criado:', topic.title);

        return topic;
    }

    // CRIAR RESPOSTA COM AUTENTICAÇÃO OBRIGATÓRIA
    async createReply(replyData) {
        if (!this.currentUser) {
            throw new Error('Usuário não autenticado. Faça login com Discord para responder.');
        }

        const topic = this.getTopic(replyData.topicId);
        if (topic && topic.isLocked) {
            throw new Error('Este tópico está bloqueado. Não é possível responder.');
        }

        const reply = {
            id: Date.now(),
            ...replyData,
            author: this.currentUser.global_name || this.currentUser.username,
            authorId: this.currentUser.id,
            authorAvatar: this.currentUser.avatar,
            createdAt: new Date().toISOString()
        };

        this.replies.push(reply);

        // Atualizar tópico
        if (topic) {
            topic.updatedAt = new Date().toISOString();
            this.updateCategoryCounts(topic.categoryId, 0, 1);
            this.saveData('forum_topics', this.topics);
        }

        this.saveData('forum_replies', this.replies);

        console.log('💬 Nova resposta criada para o tópico:', topic?.title);

        return reply;
    }

    // 🔧 MÉTODOS DE MODERAÇÃO - APENAS PARA ADMINS

    // DELETAR TÓPICO
    deleteTopic(topicId) {
        if (!this.isAdmin) {
            throw new Error('Apenas administradores podem deletar tópicos');
        }

        console.log('🗑️ Admin deletando tópico:', topicId);

        const topicIndex = this.topics.findIndex(topic => topic.id == topicId);
        if (topicIndex === -1) {
            throw new Error('Tópico não encontrado');
        }

        const topic = this.topics[topicIndex];

        // ✅ CORREÇÃO: Contar quantas respostas serão removidas ANTES de remover
        const repliesToRemove = this.replies.filter(reply => reply.topicId == topicId);
        const replyCountToRemove = repliesToRemove.length;

        console.log('📊 Respostas a serem removidas:', replyCountToRemove);

        // Remover tópico
        this.topics.splice(topicIndex, 1);

        // Remover todas as respostas deste tópico
        this.replies = this.replies.filter(reply => reply.topicId != topicId);

        // ✅ CORREÇÃO: Atualizar contagem da categoria CORRETAMENTE
        this.updateCategoryCounts(topic.categoryId, -1, -replyCountToRemove);

        // Salvar dados
        this.saveData('forum_topics', this.topics);
        this.saveData('forum_replies', this.replies);

        console.log('✅ Tópico deletado com sucesso:', topic.title);
        console.log('📊 Estatísticas atualizadas:', {
            categoria: topic.categoryId,
            topicosRemovidos: 1,
            respostasRemovidas: replyCountToRemove
        });

        // Log de moderação
        this.logModAction('DELETE_TOPIC', {
            topicId: topicId,
            topicTitle: topic.title,
            author: topic.author,
            repliesDeleted: replyCountToRemove,
            deletedBy: this.currentUser.username
        });

        return true;
    }

    // DELETAR RESPOSTA
    deleteReply(replyId) {
        if (!this.isAdmin) {
            throw new Error('Apenas administradores podem deletar respostas');
        }

        console.log('🗑️ Admin deletando resposta:', replyId);

        const replyIndex = this.replies.findIndex(reply => reply.id == replyId);
        if (replyIndex === -1) {
            throw new Error('Resposta não encontrada');
        }

        const reply = this.replies[replyIndex];
        const topic = this.getTopic(reply.topicId);

        // Remover resposta
        this.replies.splice(replyIndex, 1);

        // Atualizar contagem da categoria
        if (topic) {
            this.updateCategoryCounts(topic.categoryId, 0, -1);
            this.saveData('forum_topics', this.topics);
        }

        // Salvar dados
        this.saveData('forum_replies', this.replies);

        console.log('✅ Resposta deletada com sucesso');

        // Log de moderação
        this.logModAction('DELETE_REPLY', {
            replyId: replyId,
            topicId: reply.topicId,
            topicTitle: topic ? topic.title : 'Desconhecido',
            author: reply.author,
            deletedBy: this.currentUser.username
        });

        return true;
    }

    // EDITAR TÓPICO (Admin pode editar qualquer tópico)
    editTopic(topicId, newData) {
        if (!this.isAdmin) {
            throw new Error('Apenas administradores podem editar tópicos');
        }

        const topic = this.getTopic(topicId);
        if (!topic) {
            throw new Error('Tópico não encontrado');
        }

        const oldTitle = topic.title;
        const oldContent = topic.content;

        // Atualizar dados
        topic.title = newData.title || topic.title;
        topic.content = newData.content || topic.content;
        topic.updatedAt = new Date().toISOString();
        topic.lastEditedBy = this.currentUser.username;
        topic.lastEditedAt = new Date().toISOString();

        this.saveData('forum_topics', this.topics);

        // Log de moderação
        this.logModAction('EDIT_TOPIC', {
            topicId: topicId,
            oldTitle: oldTitle,
            newTitle: topic.title,
            editedBy: this.currentUser.username
        });

        return topic;
    }

    // EDITAR RESPOSTA (Admin pode editar qualquer resposta)
    editReply(replyId, newContent) {
        if (!this.isAdmin) {
            throw new Error('Apenas administradores podem editar respostas');
        }

        const reply = this.replies.find(r => r.id == replyId);
        if (!reply) {
            throw new Error('Resposta não encontrada');
        }

        const oldContent = reply.content;

        // Atualizar dados
        reply.content = newContent;
        reply.updatedAt = new Date().toISOString();
        reply.lastEditedBy = this.currentUser.username;
        reply.lastEditedAt = new Date().toISOString();

        this.saveData('forum_replies', this.replies);

        // Log de moderação
        this.logModAction('EDIT_REPLY', {
            replyId: replyId,
            topicId: reply.topicId,
            author: reply.author,
            editedBy: this.currentUser.username
        });

        return reply;
    }

    // PINAR/DESPINAR TÓPICO
    togglePinTopic(topicId) {
        if (!this.isAdmin) {
            throw new Error('Apenas administradores podem fixar tópicos');
        }

        const topic = this.getTopic(topicId);
        if (!topic) {
            throw new Error('Tópico não encontrado');
        }

        topic.isPinned = !topic.isPinned;
        topic.updatedAt = new Date().toISOString();

        this.saveData('forum_topics', this.topics);

        // Log de moderação
        this.logModAction(topic.isPinned ? 'PIN_TOPIC' : 'UNPIN_TOPIC', {
            topicId: topicId,
            topicTitle: topic.title,
            actionBy: this.currentUser.username
        });

        return topic;
    }

    // BLOQUEAR/DESBLOQUEAR TÓPICO
    toggleLockTopic(topicId) {
        if (!this.isAdmin) {
            throw new Error('Apenas administradores podem bloquear tópicos');
        }

        const topic = this.getTopic(topicId);
        if (!topic) {
            throw new Error('Tópico não encontrado');
        }

        topic.isLocked = !topic.isLocked;
        topic.updatedAt = new Date().toISOString();

        this.saveData('forum_topics', this.topics);

        // Log de moderação
        this.logModAction(topic.isLocked ? 'LOCK_TOPIC' : 'UNLOCK_TOPIC', {
            topicId: topicId,
            topicTitle: topic.title,
            actionBy: this.currentUser.username
        });

        return topic;
    }

    // LOG DE AÇÕES DE MODERAÇÃO
    logModAction(action, data) {
        const log = {
            action: action,
            data: data,
            timestamp: new Date().toISOString(),
            admin: this.currentUser.username,
            adminId: this.currentUser.id
        };

        // Carregar logs existentes
        const logs = this.loadData('forum_mod_logs') || [];
        logs.unshift(log);

        // Manter apenas os últimos 100 logs
        if (logs.length > 100) {
            logs.splice(100);
        }

        this.saveData('forum_mod_logs', logs);
        console.log('📝 Log de moderação:', log);
    }

    // OBTER LOGS DE MODERAÇÃO (apenas para admins)
    getModerationLogs() {
        if (!this.isAdmin) {
            throw new Error('Apenas administradores podem visualizar logs de moderação');
        }
        return this.loadData('forum_mod_logs') || [];
    }

    // ADICIONAR/REMOVER ADMIN
    toggleAdmin(userId) {
        // Apenas admins podem modificar outros admins
        if (!this.isAdmin) {
            throw new Error('Apenas administradores podem modificar permissões');
        }

        const userIndex = this.admins.indexOf(userId.toString());

        if (userIndex === -1) {
            // Adicionar admin
            this.admins.push(userId.toString());
            console.log('✅ Admin adicionado:', userId);

            this.logModAction('ADD_ADMIN', {
                targetUserId: userId,
                addedBy: this.currentUser.username
            });
        } else {
            // Remover admin (não pode remover a si mesmo)
            if (userId.toString() === this.currentUser.id) {
                throw new Error('Você não pode remover seus próprios privilégios de admin');
            }

            this.admins.splice(userIndex, 1);
            console.log('❌ Admin removido:', userId);

            this.logModAction('REMOVE_ADMIN', {
                targetUserId: userId,
                removedBy: this.currentUser.username
            });
        }

        this.saveData('forum_admins', this.admins);
        return this.admins;
    }

    // MÉTODO AUXILIAR: Verificar se usuário é dono do conteúdo
    isContentOwner(content) {
        if (!this.currentUser) return false;
        return content.authorId === this.currentUser.id;
    }

    // MÉTODO AUXILIAR: Verificar se pode moderar conteúdo
    canModerate(content) {
        return this.isAdmin || this.isContentOwner(content);
    }

    // 🔧 MÉTODOS DE DEBUG E MANUTENÇÃO

    // VERIFICAR E CORRIGIR ESTATÍSTICAS
    debugStats() {
        console.log('🔍=== DEBUG DE ESTATÍSTICAS ===');

        this.categories.forEach(category => {
            const realTopics = this.topics.filter(topic => topic.categoryId == category.id).length;
            const realReplies = this.replies.filter(reply => {
                const topic = this.topics.find(t => t.id == reply.topicId);
                return topic && topic.categoryId == category.id;
            }).length;

            console.log(`📂 ${category.name}:`, {
                salvo: `Tópicos: ${category.topicCount}, Respostas: ${category.replyCount}`,
                real: `Tópicos: ${realTopics}, Respostas: ${realReplies}`,
                status: category.topicCount === realTopics && category.replyCount === realReplies ? '✅' : '❌'
            });
        });

        console.log('📊 Totais gerais:', {
            tópicos: this.topics.length,
            respostas: this.replies.length,
            categorias: this.categories.length
        });

        console.log('🔚=== FIM DO DEBUG ===');
    }

    // CORRIGIR TODAS AS ESTATÍSTICAS
    fixAllStats() {
        console.log('🛠️ Corrigindo todas as estatísticas...');

        // Zerar contagens
        this.categories.forEach(category => {
            category.topicCount = 0;
            category.replyCount = 0;
        });

        // Recontar tudo
        this.topics.forEach(topic => {
            const category = this.categories.find(cat => cat.id == topic.categoryId);
            if (category) {
                category.topicCount++;

                // Contar respostas deste tópico
                const topicReplies = this.replies.filter(reply => reply.topicId == topic.id);
                category.replyCount += topicReplies.length;
            }
        });

        this.saveData('forum_categories', this.categories);

        console.log('✅ Todas as estatísticas foram corrigidas');
        this.debugStats();
    }

    // VERIFICAR INTEGRIDADE DOS DADOS
    checkDataIntegrity() {
        console.log('🔍 Verificando integridade dos dados...');

        let issues = [];

        // Verificar se todas as categorias existem
        this.categories.forEach(category => {
            const expectedTopics = this.topics.filter(topic => topic.categoryId == category.id).length;
            const expectedReplies = this.replies.filter(reply => {
                const topic = this.topics.find(t => t.id == reply.topicId);
                return topic && topic.categoryId == category.id;
            }).length;

            if (category.topicCount !== expectedTopics) {
                issues.push(`Categoria "${category.name}": topicCount (${category.topicCount}) ≠ real (${expectedTopics})`);
            }

            if (category.replyCount !== expectedReplies) {
                issues.push(`Categoria "${category.name}": replyCount (${category.replyCount}) ≠ real (${expectedReplies})`);
            }
        });

        if (issues.length > 0) {
            console.warn('⚠️ Problemas encontrados:', issues);
            return false;
        } else {
            console.log('✅ Dados íntegros');
            return true;
        }
    }

    // VERIFICAR TÓPICOS ÓRFÃOS (respostas sem tópico)
    findOrphanedReplies() {
        const orphanedReplies = this.replies.filter(reply => {
            return !this.topics.find(topic => topic.id == reply.topicId);
        });

        if (orphanedReplies.length > 0) {
            console.warn('⚠️ Respostas órfãs encontradas:', orphanedReplies);
            return orphanedReplies;
        } else {
            console.log('✅ Nenhuma resposta órfã encontrada');
            return [];
        }
    }

    // LIMPAR RESPOSTAS ÓRFÃS
    cleanOrphanedReplies() {
        const orphanedReplies = this.findOrphanedReplies();

        if (orphanedReplies.length > 0) {
            console.log('🧹 Removendo respostas órfãs...');
            this.replies = this.replies.filter(reply => {
                return this.topics.find(topic => topic.id == reply.topicId);
            });

            this.saveData('forum_replies', this.replies);
            console.log(`✅ ${orphanedReplies.length} respostas órfãs removidas`);
        }

        return orphanedReplies.length;
    }

    // CORREÇÃO AUTOMÁTICA AO INICIAR
    autoFixStats() {
        setTimeout(() => {
            if (!this.checkDataIntegrity()) {
                console.log('🛠️ Problemas detectados, corrigindo automaticamente...');
                this.fixAllStats();
            }
        }, 1000);
    }
}

// 🌐 CRIAR INSTÂNCIA GLOBAL
window.forumAPI = new ForumAPI();

// 🌐 FUNÇÕES GLOBAIS PARA DEBUG
window.forumDebug = {
    // Verificar estatísticas
    stats: function () {
        if (window.forumAPI) {
            window.forumAPI.debugStats();
        }
    },

    // Corrigir estatísticas
    fix: function () {
        if (window.forumAPI) {
            window.forumAPI.fixAllStats();
            // Recarregar a página para ver as mudanças
            setTimeout(() => window.location.reload(), 1000);
        }
    },

    // Limpar respostas órfãs
    clean: function () {
        if (window.forumAPI) {
            const removed = window.forumAPI.cleanOrphanedReplies();
            alert(`🧹 ${removed} respostas órfãs removidas`);
            setTimeout(() => window.location.reload(), 1000);
        }
    },

    // Verificar integridade
    check: function () {
        if (window.forumAPI) {
            const isOK = window.forumAPI.checkDataIntegrity();
            alert(isOK ? '✅ Dados íntegros' : '❌ Problemas encontrados - verifique o console');
        }
    },

    // Reset completo das estatísticas
    resetStats: function () {
        if (confirm('⚠️ Isso irá recalcular TODAS as estatísticas. Continuar?')) {
            if (window.forumAPI) {
                window.forumAPI.fixAllStats();
                alert('✅ Estatísticas resetadas');
                setTimeout(() => window.location.reload(), 1000);
            }
        }
    }
};

console.log('🎮 ForumAPI carregado! Use forumDebug.fix() para corrigir estatísticas.');