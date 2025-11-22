// forum-discord.js - VERSÃO 
class DiscordSync {
    constructor() {
        this.webhookUrl = '';
        this.channels = {
            'novos-topicos': 'ID_CANAL_TOPICOS',
            'novas-respostas': 'ID_CANAL_RESPOSTAS',
            'estatisticas': 'ID_CANAL_ESTATISTICAS'
        };
        this.isEnabled = false;
        this.loadConfig();
    }

    // Configurar webhook do Discord
    async setupDiscordWebhook(webhookUrl) {
        this.webhookUrl = webhookUrl;
        this.isEnabled = true;
        localStorage.setItem('discord_webhook', webhookUrl);

        // Testar conexão
        return await this.testConnection();
    }

    // Testar conexão com Discord
    async testConnection() {
        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: '🔗 **Conexão estabelecida!** Fórum sincronizado com sucesso.'
                })
            });
            return response.ok;
        } catch (error) {
            console.error('Erro na conexão com Discord:', error);
            return false;
        }
    }

    // Enviar novo tópico para Discord
    async sendNewTopicToDiscord(topic, category) {
        if (!this.isEnabled) return;

        const embed = {
            title: "📝 Novo Tópico no Fórum",
            color: 0x3e8ce5,
            fields: [
                {
                    name: "Tópico",
                    value: topic.title,
                    inline: false
                },
                {
                    name: "Autor",
                    value: topic.author,
                    inline: true
                },
                {
                    name: "Categoria",
                    value: category.name,
                    inline: true
                },
                {
                    name: "Link",
                    value: `[Abrir Tópico](${window.location.origin}/forum-topic.html?id=${topic.id})`,
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: "Age of Empires IV Brasil - Fórum"
            }
        };

        await this.sendDiscordMessage(embed);
    }

    // Enviar nova resposta para Discord
    async sendNewReplyToDiscord(reply, topic) {
        if (!this.isEnabled) return;

        const embed = {
            title: "💬 Nova Resposta no Fórum",
            color: 0x48bb78,
            fields: [
                {
                    name: "Tópico",
                    value: topic.title,
                    inline: false
                },
                {
                    name: "Autor",
                    value: reply.author,
                    inline: true
                },
                {
                    name: "Resposta",
                    value: reply.content.length > 100 ?
                        reply.content.substring(0, 100) + '...' : reply.content,
                    inline: false
                },
                {
                    name: "Link",
                    value: `[Ver Resposta](${window.location.origin}/forum-topic.html?id=${topic.id}#reply-${reply.id})`,
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: "Age of Empires IV Brasil - Fórum"
            }
        };

        await this.sendDiscordMessage(embed);
    }

    // Enviar estatísticas para Discord
    async sendStatsToDiscord(stats) {
        if (!this.isEnabled) return;

        const embed = {
            title: "📊 Estatísticas do Fórum",
            color: 0xf6e05e,
            fields: [
                {
                    name: "Tópicos",
                    value: stats.totalTopics.toString(),
                    inline: true
                },
                {
                    name: "Respostas",
                    value: stats.totalReplies.toString(),
                    inline: true
                },
                {
                    name: "Membros",
                    value: stats.totalMembers.toString(),
                    inline: true
                },
                {
                    name: "Online Agora",
                    value: stats.onlineNow.toString(),
                    inline: true
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: "Age of Empires IV Brasil - Fórum"
            }
        };

        await this.sendDiscordMessage(embed);
    }

    // Método genérico para enviar mensagem
    async sendDiscordMessage(embed) {
        if (!this.isEnabled || !this.webhookUrl) return;

        try {
            await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    embeds: [embed]
                })
            });
        } catch (error) {
            console.error('Erro ao enviar para Discord:', error);
        }
    }

    // Sincronizar dados existentes
    async syncExistingData() {
        if (!window.forumAPI) {
            console.error('ForumAPI não disponível');
            return;
        }

        const stats = window.forumAPI.getStats();
        await this.sendStatsToDiscord(stats);

        // Enviar últimos 5 tópicos
        const recentTopics = window.forumAPI.getTopics().slice(0, 5);
        for (const topic of recentTopics) {
            const category = window.forumAPI.categories.find(cat => cat.id === topic.categoryId);
            await this.sendNewTopicToDiscord(topic, category);
            await this.delay(1000); // Delay para não sobrecarregar
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Carregar configuração salva
    loadConfig() {
        const savedWebhook = localStorage.getItem('discord_webhook');
        if (savedWebhook) {
            this.webhookUrl = savedWebhook;
            this.isEnabled = true;
        }
    }
}

// Instância global
window.discordSync = new DiscordSync();