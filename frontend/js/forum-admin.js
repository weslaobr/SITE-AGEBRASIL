// forum-admin.js
const API_BASE = '/api';

async function checkAdmin() {
    const user = JSON.parse(localStorage.getItem('discord_user') || 'null');
    if (!user || (user.username !== 'BRO.WESLAO' && user.id !== 'YOUR_ADMIN_ID')) {
        alert('Acesso negado. Apenas administradores.');
        window.location.href = 'forum.html';
        return false;
    }
    return true;
}

async function loadRecentTopics() {
    try {
        const response = await fetch(`${API_BASE}/forum/topics`);
        const topics = await response.json();
        const list = document.getElementById('recentTopicsList');

        list.innerHTML = topics.map(t => `
            <div class="topic-item" style="display:flex; justify-content:space-between; align-items:center; padding: 1rem; border-bottom: 1px solid #333;">
                <div>
                    <strong>${t.title}</strong>
                    <br>
                    <small>por ${t.author_name} em ${new Date(t.created_at).toLocaleDateString()}</small>
                    ${t.is_pinned ? '<span style="color:gold">📌 Fixado</span>' : ''}
                    ${t.is_locked ? '<span style="color:red">🔒 Trancado</span>' : ''}
                </div>
                <div class="topic-actions">
                    <button onclick="togglePin(${t.id}, ${!t.is_pinned})" class="btn-admin btn-sm btn-warning">
                        ${t.is_pinned ? 'Desafixar' : 'Fixar'}
                    </button>
                    <button onclick="toggleLock(${t.id}, ${!t.is_locked})" class="btn-admin btn-sm btn-info">
                        ${t.is_locked ? 'Destrancar' : 'Trancar'}
                    </button>
                    <button onclick="deleteTopic(${t.id})" class="btn-admin btn-sm btn-danger">
                        Deletar
                    </button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error(e);
    }
}

async function createCategory(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const user = localStorage.getItem('discord_user');

    try {
        const response = await fetch(`${API_BASE}/forum/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user': user // Sending user info for simple auth check
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Categoria criada com sucesso!');
            e.target.reset();
        } else {
            alert('Erro ao criar categoria');
        }
    } catch (error) {
        console.error(error);
        alert('Erro ao criar categoria');
    }
}

async function togglePin(id, isPinned) {
    if (!confirm(`Deseja ${isPinned ? 'fixar' : 'desafixar'} este tópico?`)) return;

    const user = localStorage.getItem('discord_user');
    await fetch(`${API_BASE}/forum/topics/${id}/pin`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'x-user': user
        },
        body: JSON.stringify({ isPinned })
    });
    loadRecentTopics();
}

async function toggleLock(id, isLocked) {
    if (!confirm(`Deseja ${isLocked ? 'trancar' : 'destrancar'} este tópico?`)) return;

    const user = localStorage.getItem('discord_user');
    await fetch(`${API_BASE}/forum/topics/${id}/lock`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'x-user': user
        },
        body: JSON.stringify({ isLocked })
    });
    loadRecentTopics();
}

async function deleteTopic(id) {
    if (!confirm('Tem certeza que deseja DELETAR este tópico? Esta ação não pode ser desfeita.')) return;

    const user = localStorage.getItem('discord_user');
    await fetch(`${API_BASE}/forum/topics/${id}`, {
        method: 'DELETE',
        headers: {
            'x-user': user
        }
    });
    loadRecentTopics();
}

document.addEventListener('DOMContentLoaded', async () => {
    if (await checkAdmin()) {
        loadRecentTopics();
        document.getElementById('createCategoryForm').addEventListener('submit', createCategory);
    }
});
