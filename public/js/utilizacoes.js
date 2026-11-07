import { $, api, escapeHtml, formatDate, notify, setRows } from './shared.js';

export function initUtilizacoes({ handleError: reportError, state, refreshAll }) {
  async function load() {
    state.utilizacoes = await api('/api/utilizacoes');
    $('#utilizacoes-count').textContent = state.utilizacoes.length;
    $('#utilizacoes-list-count').textContent = state.utilizacoes.length;
    $('#utilizacoes-active').textContent = state.utilizacoes.filter((item) => item.data_fim === null).length;
    const rows = state.utilizacoes.map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.motorista_nome)}</strong><small class="cell-subtitle">ID #${item.motorista_id}</small></td>
        <td><span class="plate">${escapeHtml(item.automovel_placa)}</span><small class="cell-subtitle">${escapeHtml(item.automovel_marca)} · ${escapeHtml(item.automovel_cor)}</small></td>
        <td>${escapeHtml(item.motivo)}</td>
        <td>${formatDate(item.data_inicio)}</td>
        <td>${formatDate(item.data_fim)}</td>
        <td><span class="status ${item.data_fim ? 'status-done' : 'status-in-use'}">${item.data_fim ? 'Finalizada' : 'Em andamento'}</span></td>
        <td>${item.data_fim ? '' : `<div class="row-actions"><button class="button button-small" type="button" data-action="finish-use" data-id="${item.id}">Finalizar</button></div>`}</td>
      </tr>`).join('');
    setRows(rows, '#utilizacoes-table', '#utilizacoes-empty');
  }

  function refreshAvailableOptions() {
    const automoveisEmUso = new Set(state.utilizacoes.filter((item) => item.data_fim === null).map((item) => item.automovel_id));
    const motoristasEmUso = new Set(state.utilizacoes.filter((item) => item.data_fim === null).map((item) => item.motorista_id));
    const motoristaSelect = $('#uso-motorista');
    const automovelSelect = $('#uso-automovel');
    const motoristaAnterior = motoristaSelect.value;
    const automovelAnterior = automovelSelect.value;
    motoristaSelect.innerHTML = '<option value="">Selecione um motorista disponível</option>' + state.motoristas
      .filter((item) => !motoristasEmUso.has(item.id))
      .map((item) => `<option value="${item.id}">${escapeHtml(item.nome)}</option>`).join('');
    automovelSelect.innerHTML = '<option value="">Selecione um automóvel disponível</option>' + state.automoveis
      .filter((item) => !automoveisEmUso.has(item.id))
      .map((item) => `<option value="${item.id}">${escapeHtml(item.placa)} — ${escapeHtml(item.marca)} (${escapeHtml(item.cor)})</option>`).join('');
    if ([...motoristaSelect.options].some((option) => option.value === motoristaAnterior)) motoristaSelect.value = motoristaAnterior;
    if ([...automovelSelect.options].some((option) => option.value === automovelAnterior)) automovelSelect.value = automovelAnterior;
  }

  $('#utilizacao-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api('/api/utilizacoes', {
        method: 'POST',
        body: JSON.stringify({
          motorista_id: Number($('#uso-motorista').value),
          automovel_id: Number($('#uso-automovel').value),
          data_inicio: new Date($('#uso-data-inicio').value).toISOString(),
          motivo: $('#uso-motivo').value
        })
      });
      event.target.reset();
      await refreshAll();
      notify('Utilização registrada com sucesso.');
    } catch (error) {
      reportError(error);
    }
  });

  $('#utilizacoes-table').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action="finish-use"]');
    if (!button || !confirm('Finalizar esta utilização agora?')) return;
    try {
      await api(`/api/utilizacoes/${button.dataset.id}/finalizar`, {
        method: 'PATCH',
        body: JSON.stringify({})
      });
      await refreshAll();
      notify('Utilização finalizada com sucesso.');
    } catch (error) {
      reportError(error);
    }
  });

  $('#refresh-uses').addEventListener('click', () => refreshAll().catch(reportError));

  return { load, refreshAvailableOptions };
}
