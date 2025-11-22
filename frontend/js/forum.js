// frontend/js/forum.js  ←  SUBSTITUA TUDO POR ESTE CÓDIGO

let todosTopicos = [];
let todasCategorias = [];

async function carregarDados() {
    try {
        const [resCat, resTop] = await Promise.all([
            fetch('/api/categorias'),
            fetch('/api/topicos')
        ]);

        todasCategorias = await resCat.json();
        todosTopicos = await resTop.json();

        const pagina = window.location.pathname.split('/').pop();

        if (pagina === 'categoria.html') {
            const urlParams = new URLSearchParams(window.location.search);
            const catId = urlParams.get('categoria');
            if (catId) mostrarCategoria(catId);
        } else if (pagina === 'ver-topico.html') {
            const urlParams = new URLSearchParams(window.location.search);
            const topicoId = urlParams.get('id');
            if (topicoId) mostrarTopico(topicoId);
        } else {
            listarCategorias();
            listarTopicos(todosTopicos);
        }
    } catch (err) {
        console.error("Erro ao carregar dados:", err);
    }
}

function listarCategorias() { /* mesma função de antes */
    const container = document.getElementById('categorias-container');
    if (!container) return;
    container.innerHTML = todasCategorias.map(cat => `
        <div class="categoria-card">
            <h3>${cat.nome}</h3>
            <p>${cat.descricao}</p>
            <a href="categoria.html?categoria=${cat.id}" class="btn">Ver tópicos</a>
        </div>
    `).join('');
}

function listarTopicos(lista) { /* mesma função de antes */
    const container = document.getElementById('topicos-lista');
    if (!container) return;
    if (lista.length === 0) {
        container.innerHTML = '<p class="texto-centro">Nenhum tópico nesta categoria ainda.</p>';
        return;
    }
    container.innerHTML = lista.map(t => {
        const cat = todasCategorias.find(c => c.id === t.categoria_id);
        return `
            <div class="topico-item">
                <h3><a href="ver-topico.html?id=${t.id}">${t.titulo}</a></h3>
                <p>Por ${t.autor} • ${cat ? cat.nome : 'Geral'} • ${t.respostas.length} respostas</p>
                <small>Última atividade: ${new Date(t.ultima_resposta).toLocaleDateString('pt-BR')}</small>
            </div>
        `;
    }).join('');
}

function mostrarCategoria(catId) {
    const categoria = todasCategorias.find(c => c.id == catId);
    if (categoria) {
        document.title = categoria.nome + " - Fórum AGEBRASIL";
        const titulo = document.getElementById('titulo-categoria');
        if (titulo) titulo.textContent = categoria.nome;
    }
    const topicosFiltrados = todosTopicos.filter(t => t.categoria_id == catId);
    listarTopicos(topicosFiltrados);
}

async function mostrarTopico(id) {
    try {
        const res = await fetch(`/api/topicos/${id}`);
        const topico = await res.json();
        const cat = todasCategorias.find(c => c.id === topico.categoria_id);

        document.title = topico.titulo + " - Fórum";
        document.getElementById('topico-titulo').textContent = topico.titulo;
        document.getElementById('topico-autor').innerHTML = `Por <strong>${topico.autor}</strong> em ${cat ? cat.nome : 'Geral'}`;
        document.getElementById('topico-data').textContent = new Date(topico.data_criacao).toLocaleDateString('pt-BR');
        document.getElementById('topico-conteudo').innerHTML = topico.conteudo.replace(/\n/g, '<br>');

        const respostasDiv = document.getElementById('respostas');
        if (topico.respostas && topico.respostas.length > 0) {
            respostasDiv.innerHTML = topico.respostas.map(r => `
                <div class="resposta">
                    <strong>${r.autor}</strong> <small>${new Date(r.data).toLocaleDateString('pt-BR')}</small>
                    <p>${r.texto.replace(/\n/g, '<br>')}</p>
                </div>
            `).join('');
        } else {
            respostasDiv.innerHTML = '<p>Seja o primeiro a responder!</p>';
        }

        // ==== AQUI É A PARTE NOVA DO BOTÃO RESPONDER ====
        const form = document.getElementById('form-resposta');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const autor = document.getElementById('resposta-autor').value.trim();
                const texto = document.getElementById('resposta-texto').value.trim();

                if (!autor || !texto) {
                    alert("Preencha seu nome e a resposta!");
                    return;
                }

                try {
                    const resp = await fetch(`/api/topicos/${id}/responder`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ autor, texto })
                    });

                    if (resp.ok) {
                        const nova = await resp.json();
                        // adiciona a resposta na tela sem recarregar
                        respostasDiv.innerHTML += `
                            <div class="resposta">
                                <strong>${nova.resposta.autor}</strong> <small>agora mesmo</small>
                                <p>${nova.resposta.texto.replace(/\n/g, '<br>')}</p>
                            </div>`;
                        form.reset();
                    } else {
                        alert("Erro ao enviar resposta");
                    }
                } catch (err) {
                    alert("Erro de conexão");
                }
            };
        }
    } catch (err) {
        document.body.innerHTML = '<h2>Tópico não encontrado</h2>';
    }
}

document.addEventListener('DOMContentLoaded', carregarDados);