// forum-auth.js - VERSÃO COMPLETA E FUNCION
class ForumAuth {
    constructor() {
        console.log('🔐 Inicializando ForumAuth...');
        this.init();
    }

    async init() {
        console.log('📱 Verificando parâmetros de URL...');

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        // Mostrar loading
        this.showLoading();

        if (error) {
            console.error('❌ Erro do Discord:', error);
            this.showError('Erro na autenticação: ' + error);
            return;
        }

        if (code && state) {
            console.log('🎯 Callback do Discord detectado');
            console.log('📋 Parâmetros:', { code: code.substring(0, 10) + '...', state });
            await this.handleCallback(code, state);
        } else {
            console.log('⚠️ Nenhum código encontrado - página acessada diretamente');
            this.showError('Esta página é para processamento de autenticação. <br>Redirecionando para o fórum...');
            setTimeout(() => {
                window.location.href = 'forum.html';
            }, 3000);
        }
    }

    async handleCallback(code, state) {
        try {
            console.log('🔄 Processando autenticação...');

            // Aguardar o DiscordAuth estar disponível
            await this.waitForDiscordAuth();

            console.log('✅ DiscordAuth disponível, processando callback...');

            // Processar o callback
            const success = await window.discordAuth.processCallback(code, state);

            if (success) {
                // Mostrar sucesso
                this.showSuccess();

                // Redirecionar para o fórum após 2 segundos
                setTimeout(() => {
                    const returnUrl = localStorage.getItem('returnUrl') || 'forum.html';
                    localStorage.removeItem('returnUrl');
                    console.log('🔄 Redirecionando para:', returnUrl);
                    window.location.href = returnUrl;
                }, 2000);
            } else {
                throw new Error('Falha no processamento do callback');
            }

        } catch (error) {
            console.error('❌ Erro no callback:', error);
            this.showError('Falha na autenticação: ' + error.message);

            // Redirecionar após erro
            setTimeout(() => {
                window.location.href = 'forum.html';
            }, 5000);
        }
    }

    async waitForDiscordAuth() {
        let attempts = 0;
        const maxAttempts = 50; // 5 segundos

        while (!window.discordAuth && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
            console.log(`⏳ Aguardando DiscordAuth... (${attempts}/${maxAttempts})`);
        }

        if (!window.discordAuth) {
            throw new Error('Sistema de autenticação não carregado após 5 segundos');
        }

        console.log('✅ DiscordAuth carregado com sucesso');
        return true;
    }

    showLoading() {
        const authContent = document.getElementById('authContent');
        if (authContent) {
            authContent.innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <h3>Processando Autenticação</h3>
                    <p>Aguarde enquanto conectamos com o Discord...</p>
                </div>
            `;
        }
    }

    showSuccess() {
        const authContent = document.getElementById('authContent');
        if (authContent) {
            authContent.innerHTML = `
                <div class="auth-success">
                    <i class="fas fa-check-circle"></i>
                    <h3>Login Realizado com Sucesso!</h3>
                    <p>Redirecionando para o fórum...</p>
                </div>
            `;
        }
    }

    showError(message) {
        const authContent = document.getElementById('authContent');
        if (authContent) {
            authContent.innerHTML = `
                <div class="auth-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro na Autenticação</h3>
                    <p>${message}</p>
                    <div class="auth-actions">
                        <button class="btn-retry" onclick="window.location.href = 'forum.html'">
                            <i class="fas fa-arrow-left"></i>
                            Voltar ao Fórum
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM carregado, inicializando ForumAuth...');
    window.forumAuth = new ForumAuth();
});