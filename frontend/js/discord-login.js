// discord-login.js - VERSÃO COMPLETA E FUNCIONAL
class DiscordAuth {
    constructor() {
        // 🔧 CONFIGURAÇÃO - ATUALIZE COM SUAS CREDENCIAIS
        this.clientId = '1440856041867968542'; // Seu Client ID do Discord Developer Portal
        this.clientSecret = '_J3YS6RX9BThyQ3SWcl7C1UtiLs_CwhQ'; // Seu Client Secret
        this.redirectUri = `${window.location.origin}/forum-auth.html`;
        this.scopes = ['identify', 'email', 'guilds'];
        this.botToken = '8478f9005f3988e6061049bcfdcb08007837528b0a3d87601f920e3ff41b0faf'; // Token do Bot (opcional)

        console.log('🔐 DiscordAuth inicializado');
        console.log('📍 Configuração:', {
            clientId: this.clientId,
            redirectUri: this.redirectUri,
            scopes: this.scopes,
            origin: window.location.origin
        });

        this.validateConfig();
        this.checkExistingAuth();
    }

    validateConfig() {
        // Verificar se está usando configuração de desenvolvimento
        const isDevConfig = this.clientId === '1440856041867968542' ||
            this.clientSecret === '_J3YS6RX9BThyQ3SWcl7C1UtiLs_CwhQ';

        if (isDevConfig) {
            console.warn('⚠️  CONFIGURAÇÃO DE DESENVOLVIMENTO - Use credenciais reais em produção');
            console.log('💡 Dica: Vá em https://discord.com/developers/applications para obter suas credenciais');
        }

        // Verificações básicas
        if (!this.clientId || this.clientId.length < 18) {
            console.error('❌ Client ID inválido ou muito curto');
        }

        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('🌐 Ambiente de desenvolvimento local detectado');
        }
    }

    checkExistingAuth() {
        const user = this.getCurrentUser();
        if (user) {
            console.log('🔍 Usuário já autenticado:', user.username);
        } else {
            console.log('🔍 Nenhum usuário autenticado');
        }
    }

    // 🔗 GERAR URL DE LOGIN
    getLoginUrl() {
        const state = this.generateState();
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: this.scopes.join(' '),
            state: state,
            prompt: 'consent' // Solicitar consentimento sempre
        });

        const loginUrl = `https://discord.com/api/oauth2/authorize?${params}`;

        console.log('🔗 URL de Login gerada:', {
            state: state,
            url: loginUrl.substring(0, 100) + '...'
        });

        return loginUrl;
    }

    // 🔑 GERAR STATE PARA SEGURANÇA
    generateState() {
        const state = Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15) +
            Date.now().toString(36);

        localStorage.setItem('oauth_state', state);
        console.log('🔑 State gerado e salvo:', state);
        return state;
    }

    // 🔍 VERIFICAR STATE
    verifyState(state) {
        const savedState = localStorage.getItem('oauth_state');
        localStorage.removeItem('oauth_state');

        const isValid = state === savedState;

        console.log('🔍 Verificando state:', {
            received: state,
            saved: savedState,
            isValid: isValid
        });

        return isValid;
    }

    // 🚀 FAZER LOGIN - REDIRECIONAR PARA DISCORD
    login() {
        console.log('🚀=== INICIANDO LOGIN COM DISCORD ===');
        console.log('📍 URL atual:', window.location.href);
        console.log('🌐 Origin:', window.location.origin);

        // Salvar URL atual para retornar após login
        const returnUrl = window.location.href;
        localStorage.setItem('returnUrl', returnUrl);
        console.log('📌 URL de retorno salva:', returnUrl);

        // Verificações de ambiente
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.warn('⚠️  AMBIENTE LOCAL: Verifique se o Redirect URI no Discord Developer Portal inclui http://localhost');
        }

        if (!this.redirectUri.includes(window.location.origin)) {
            console.error('❌ ERRO: Redirect URI não corresponde ao origin atual');
            console.error('📍 Origin atual:', window.location.origin);
            console.error('📍 Redirect URI:', this.redirectUri);
        }

        // Redirecionar para Discord
        const discordUrl = this.getLoginUrl();
        console.log('🔄 Redirecionando para Discord OAuth...');

        setTimeout(() => {
            window.location.href = discordUrl;
        }, 100);
    }

    // 🚪 FAZER LOGOUT
    logout() {
        console.log('🚪=== INICIANDO LOGOUT ===');
        const userBefore = this.getCurrentUser();
        console.log('👤 Usuário antes do logout:', userBefore ? userBefore.username : 'Nenhum');

        // Limpar todos os dados de autenticação
        localStorage.removeItem('discord_user');
        localStorage.removeItem('discord_access_token');
        localStorage.removeItem('discord_refresh_token');
        localStorage.removeItem('oauth_state');
        localStorage.removeItem('returnUrl');

        console.log('✅ Todos os dados de autenticação removidos');
        console.log('🔄 Recarregando página...');

        setTimeout(() => {
            window.location.href = 'forum.html';
        }, 500);
    }

    // 🔐 VERIFICAR SE USUÁRIO ESTÁ LOGADO
    isLoggedIn() {
        const userData = localStorage.getItem('discord_user');
        const isLogged = !!userData;

        console.log('🔐 Verificação de login:', isLogged ? '✅ LOGADO' : '❌ NÃO LOGADO');

        if (isLogged) {
            try {
                const user = JSON.parse(userData);
                console.log('👤 Usuário logado:', {
                    username: user.username,
                    global_name: user.global_name,
                    id: user.id
                });
            } catch (error) {
                console.error('❌ Erro ao ler dados do usuário:', error);
                return false;
            }
        }

        return isLogged;
    }

    // 👤 OBTER USUÁRIO ATUAL
    getCurrentUser() {
        const userData = localStorage.getItem('discord_user');
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch (error) {
                console.error('❌ Erro ao fazer parse dos dados do usuário:', error);
                return null;
            }
        }
        return null;
    }

    // 🔑 OBTER ACCESS TOKEN
    getAccessToken() {
        return localStorage.getItem('discord_access_token');
    }

    // 🔄 OBTER REFRESH TOKEN
    getRefreshToken() {
        return localStorage.getItem('discord_refresh_token');
    }

    // 💾 SALVAR DADOS DO USUÁRIO
    saveUserData(userData, tokenData) {
        try {
            localStorage.setItem('discord_user', JSON.stringify(userData));
            localStorage.setItem('discord_access_token', tokenData.access_token);

            if (tokenData.refresh_token) {
                localStorage.setItem('discord_refresh_token', tokenData.refresh_token);
            }

            console.log('💾 Dados salvos com sucesso:');
            console.log('👤 Usuário:', userData.username);
            console.log('🔑 Access Token:', tokenData.access_token ? tokenData.access_token.substring(0, 10) + '...' : 'N/A');
            console.log('🔄 Refresh Token:', tokenData.refresh_token ? tokenData.refresh_token.substring(0, 10) + '...' : 'N/A');
            console.log('⏰ Expira em:', tokenData.expires_in ? `${tokenData.expires_in} segundos` : 'N/A');

        } catch (error) {
            console.error('❌ Erro ao salvar dados no localStorage:', error);
            throw new Error('Falha ao salvar dados de autenticação');
        }
    }

    // 🔄 MÉTODO REAL PARA TROCAR CODE POR TOKEN
    async exchangeCodeForToken(code) {
        console.log('🔄=== TROCANDO CODE POR ACCESS TOKEN ===');
        console.log('📥 Code recebido:', code ? code.substring(0, 10) + '...' : 'NULL');

        try {
            // Verificar se estamos usando Client Secret real
            if (this.clientSecret === 'SEU_CLIENT_SECRET_AQUI') {
                console.warn('⚠️  Usando modo simulação - Client Secret não configurado');
                return await this.simulateTokenExchange();
            }

            const response = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: this.redirectUri,
                    scope: this.scopes.join(' ')
                }),
            });

            console.log('📊 Status da resposta:', response.status);
            console.log('📊 Status OK:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erro na resposta do Discord:', errorText);

                let errorMessage = `Falha na autenticação: ${response.status}`;
                if (response.status === 400) errorMessage = 'Code inválido ou expirado';
                if (response.status === 401) errorMessage = 'Client Secret inválido';

                throw new Error(errorMessage);
            }

            const tokenData = await response.json();
            console.log('✅ Token obtido com sucesso!');
            console.log('📋 Dados do token:', {
                token_type: tokenData.token_type,
                expires_in: tokenData.expires_in,
                scope: tokenData.scope
            });

            return tokenData;

        } catch (error) {
            console.error('❌ Erro ao trocar code por token:', error);

            if (error.message.includes('Failed to fetch')) {
                throw new Error('Erro de conexão. Verifique sua internet.');
            }

            throw error;
        }
    }

    // 👤 MÉTODO REAL PARA OBTER DADOS DO USUÁRIO
    async getUserData(accessToken) {
        console.log('👤=== OBTENDO DADOS DO USUÁRIO ===');
        console.log('🔑 Token usado:', accessToken ? accessToken.substring(0, 10) + '...' : 'NULL');

        try {
            const response = await fetch('https://discord.com/api/users/@me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📊 Status da resposta:', response.status);

            if (!response.ok) {
                throw new Error(`Falha ao obter dados do usuário: ${response.status}`);
            }

            const userData = await response.json();
            console.log('✅ Dados do usuário obtidos com sucesso!');
            console.log('📋 Perfil:', {
                username: userData.username,
                global_name: userData.global_name,
                id: userData.id,
                email: userData.email ? '📧 Disponível' : '❌ Não disponível',
                verified: userData.verified ? '✅' : '❌'
            });

            return userData;

        } catch (error) {
            console.error('❌ Erro ao obter dados do usuário:', error);
            throw error;
        }
    }

    // 🎮 MÉTODO SIMULAÇÃO (para desenvolvimento)
    async simulateTokenExchange() {
        console.log('🎮=== MODO SIMULAÇÃO ATIVADO ===');
        console.log('💡 Dica: Configure o Client Secret para usar autenticação real');

        // Simular delay de rede
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Dados simulados
        const simulatedUser = {
            id: '123456789' + Date.now(),
            username: 'JogadorAOE4',
            discriminator: '1234',
            global_name: 'Jogador AOE IV Brasil',
            avatar: null,
            email: 'jogador@aoe4brasil.com',
            verified: true,
            locale: 'pt-BR',
            mfa_enabled: false,
            flags: 0
        };

        const simulatedTokens = {
            access_token: 'simulated_access_token_' + Date.now(),
            refresh_token: 'simulated_refresh_token_' + Date.now(),
            expires_in: 604800,
            scope: this.scopes.join(' '),
            token_type: 'Bearer'
        };

        console.log('✅ Simulação concluída - Usuário:', simulatedUser.username);
        return { ...simulatedTokens, simulated_user: simulatedUser };
    }

    // 🔄 PROCESSAR CALLBACK DO DISCORD
    async processCallback(code, state) {
        console.log('🔄=== PROCESSANDO CALLBACK DO DISCORD ===');
        console.log('📥 Parâmetros recebidos:', {
            code: code ? '✅ Presente' : '❌ Ausente',
            state: state ? '✅ Presente' : '❌ Ausente',
            code_length: code ? code.length : 0,
            state_length: state ? state.length : 0
        });

        try {
            // 1. Verificar state
            if (!this.verifyState(state)) {
                throw new Error('State inválido. Possível ataque CSRF ou sessão expirada.');
            }

            // 2. Trocar code por token
            const tokenData = await this.exchangeCodeForToken(code);

            // 3. Obter dados do usuário
            let userData;
            if (tokenData.simulated_user) {
                // Modo simulação
                userData = tokenData.simulated_user;
                delete tokenData.simulated_user;
            } else {
                // Modo real
                userData = await this.getUserData(tokenData.access_token);
            }

            // 4. Salvar dados
            this.saveUserData(userData, tokenData);

            console.log('🎉=== AUTENTICAÇÃO CONCLUÍDA COM SUCESSO! ===');
            console.log('👤 Usuário autenticado:', userData.global_name || userData.username);
            console.log('🆔 User ID:', userData.id);

            return true;

        } catch (error) {
            console.error('❌=== FALHA NA AUTENTICAÇÃO ===');
            console.error('🔍 Erro detalhado:', error);
            console.error('📋 Stack trace:', error.stack);

            throw error;
        }
    }

    // 🛠️ MÉTODO PARA DEBUG - VERIFICAR STATUS COMPLETO
    debugStatus() {
        console.log('🔍=== DEBUG DO SISTEMA DE AUTENTICAÇÃO ===');
        console.log('📍 URL atual:', window.location.href);
        console.log('🌐 Origin:', window.location.origin);
        console.log('🔐 Client ID:', this.clientId);
        console.log('🔗 Redirect URI:', this.redirectUri);
        console.log('📋 Scopes:', this.scopes);

        const user = this.getCurrentUser();
        console.log('👤 Usuário logado:', user ? `${user.username}#${user.discriminator}` : 'Nenhum');
        console.log('🔑 Access Token:', this.getAccessToken() ? '✅ Presente' : '❌ Ausente');
        console.log('🔄 Refresh Token:', this.getRefreshToken() ? '✅ Presente' : '❌ Ausente');
        console.log('🎯 State salvo:', localStorage.getItem('oauth_state') || 'Nenhum');
        console.log('📌 Return URL:', localStorage.getItem('returnUrl') || 'Nenhuma');

        // Verificar localStorage
        console.log('💾 LocalStorage items:');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.includes('discord') || key.includes('oauth')) {
                const value = localStorage.getItem(key);
                console.log(`   ${key}:`, value ? value.substring(0, 50) + '...' : 'vazio');
            }
        }

        console.log('🔚=== FIM DO DEBUG ===');
    }

    // 🔄 VERIFICAR E RENOVAR TOKEN (se expirado)
    async refreshAccessToken() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            console.log('❌ Nenhum refresh token disponível');
            return false;
        }

        try {
            console.log('🔄 Tentando renovar access token...');

            const response = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                    scope: this.scopes.join(' ')
                }),
            });

            if (response.ok) {
                const tokenData = await response.json();
                const userData = this.getCurrentUser();
                this.saveUserData(userData, tokenData);
                console.log('✅ Token renovado com sucesso');
                return true;
            } else {
                console.warn('❌ Falha ao renovar token, fazendo logout...');
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('❌ Erro ao renovar token:', error);
            return false;
        }
    }
}

// 🌐 CRIAR INSTÂNCIA GLOBAL
if (!window.discordAuth) {
    window.discordAuth = new DiscordAuth();
    console.log('🌐 DiscordAuth criado globalmente como window.discordAuth');
} else {
    console.log('ℹ️ DiscordAuth já estava disponível globalmente');
}

// 🛠️ ADICIONAR FUNÇÕES GLOBAIS PARA DEBUG
window.debugAuth = function () {
    if (window.discordAuth) {
        window.discordAuth.debugStatus();
    } else {
        console.error('❌ DiscordAuth não disponível');
    }
};

window.testAuth = function () {
    console.log('🧪=== TESTE DE AUTENTICAÇÃO ===');
    if (window.discordAuth) {
        console.log('✅ DiscordAuth disponível');
        console.log('🔐 Login status:', window.discordAuth.isLoggedIn() ? 'LOGADO' : 'NÃO LOGADO');

        const user = window.discordAuth.getCurrentUser();
        if (user) {
            console.log('👤 Usuário:', user);
        }
    } else {
        console.error('❌ DiscordAuth não disponível');
    }
};

// 📊 LOG INICIAL
console.log('🎮 DiscordAuth carregado e pronto!');
console.log('💡 Use debugAuth() para ver status completo');
console.log('💡 Use testAuth() para teste rápido');

// Verificar status atual
setTimeout(() => {
    if (window.discordAuth) {
        window.discordAuth.isLoggedIn();
    }
}, 1000);