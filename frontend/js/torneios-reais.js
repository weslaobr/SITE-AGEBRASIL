(async function(){
  const statusEl = document.getElementById('api-status');
  const grid = document.querySelector('.tournaments-grid');

  function setStatus(cls, html) {
    statusEl.className = 'api-status ' + cls;
    statusEl.innerHTML = html;
  }

  setStatus('loading', '<i class="fas fa-sync fa-spin"></i> Carregando torneios reais...');

  try {
    const res = await fetch('/api/tournaments');
    if (!res.ok) throw new Error('Status ' + res.status);
    const data = await res.json();
    const tournaments = data.tournaments || [];
    if (!Array.isArray(tournaments) || tournaments.length === 0) {
      setStatus('error', 'Nenhum torneio encontrado');
      grid.innerHTML = '<div class="loading">Nenhum torneio encontrado</div>';
      return;
    }
    setStatus('success', `✔ ${data.count} torneios carregados (Liquipedia)`);
    grid.innerHTML = tournaments.map(t => `
      <div class="tournament-card">
        <h3>${escapeHtml(t.name)}</h3>
        <div style="margin:8px 0"><strong>Premiação:</strong> ${escapeHtml(t.prize)}</div>
        <div style="font-size:0.9rem;color:#9aa6b8"><strong>Tier:</strong> ${escapeHtml(t.tier)} • <strong>Período:</strong> ${escapeHtml(t.startDate)} ${t.endDate ? '– ' + escapeHtml(t.endDate) : ''}</div>
        <div style="margin-top:12px">
          <a class="action-btn" href="${t.liquipediaUrl}" target="_blank"><i class="fas fa-external-link-alt"></i> Ver na Liquipedia</a>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Frontend fetch error', err);
    setStatus('error', '<i class="fas fa-exclamation-triangle"></i> Erro ao carregar dados');
    grid.innerHTML = '<div class="loading">Erro ao carregar dados. Verifique se o backend está rodando.</div>';
  }

  function escapeHtml(s){ if(!s) return '—'; return s.toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\'/g,'&#039;'); }
})();