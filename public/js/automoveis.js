import { $, api, escapeHtml, notify, setRows } from './shared.js';

export function initAutomoveis({ handleError: reportError, state, refreshAll }) {
  async function load(params = '') {
    const automoveis = await api(`/api/automoveis${params}`);
    if (!params) state.automoveis = automoveis;
    const emUso = new Set(state.utilizacoes
      .filter((item) => item.data_fim === null)
      .map((item) => item.automovel_id));
    $('#automoveis-count').textContent = state.automoveis.length;
    $('#automoveis-active').textContent = emUso.size;
    $('#automoveis-list-count').textContent = automoveis.length;
    const rows = automoveis.map((item) => `
      <tr>
        <td class="id-cell">#${item.id}</td>
        <td><span class="plate">${escapeHtml(item.placa)}</span></td>
        <td>${escapeHtml(item.marca)}</td>
        <td>${escapeHtml(item.cor)}</td>
        <td><span class="status ${emUso.has(item.id) ? 'status-in-use' : 'status-available'}">${emUso.has(item.id) ? 'Em utilização' : 'Disponível'}</span></td>
        <td><div class="row-actions">
          <button class="icon-button" type="button" title="Consultar automóvel" aria-label="Consultar automóvel ${item.id}" data-action="view-auto" data-id="${item.id}">⌕</button>
          <button class="icon-button" type="button" title="Editar automóvel" aria-label="Editar automóvel ${item.id}" data-action="edit-auto" data-id="${item.id}">✎</button>
          <button class="icon-button danger" type="button" title="Excluir automóvel" aria-label="Excluir automóvel ${item.id}" data-action="delete-auto" data-id="${item.id}">×</button>
        </div></td>
      </tr>`).join('');
    setRows(rows, '#automoveis-table', '#automoveis-empty');
  }

  function resetForm() {
    $('#automovel-form').reset();
    $('#automovel-id').value = '';
    $('#automovel-submit').textContent = '+ Cadastrar automóvel';
    $('[data-cancel="automovel"]').classList.add('hidden');
  }

  async function applyFilters() {
    const params = new URLSearchParams();
    if ($('#filter-marca').value.trim()) params.set('marca', $('#filter-marca').value.trim());
    if ($('#filter-cor').value.trim()) params.set('cor', $('#filter-cor').value.trim());
    try {
      await load(params.size ? `?${params}` : '');
    } catch (error) {
      reportError(error);
    }
  }

  $('#automovel-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = $('#automovel-id').value;
    const payload = {
      placa: $('#automovel-placa').value,
      marca: $('#automovel-marca').value,
      cor: $('#automovel-cor').value
    };
    try {
      await api(id ? `/api/automoveis/${id}` : '/api/automoveis', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      resetForm();
      await refreshAll();
      notify(id ? 'Automóvel atualizado com sucesso.' : 'Automóvel cadastrado com sucesso.');
    } catch (error) {
      reportError(error);
    }
  });

  $('[data-cancel="automovel"]').addEventListener('click', resetForm);

  $('#automoveis-table').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    try {
      const item = await api(`/api/automoveis/${id}`);
      if (action === 'view-auto') {
        notify(`Automóvel #${item.id}: ${item.placa} · ${item.marca} · ${item.cor}`);
      } else if (action === 'edit-auto') {
        $('#automovel-id').value = item.id;
        $('#automovel-placa').value = item.placa;
        $('#automovel-marca').value = item.marca;
        $('#automovel-cor').value = item.cor;
        $('#automovel-submit').textContent = 'Salvar alterações';
        $('[data-cancel="automovel"]').classList.remove('hidden');
        $('#automovel-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (action === 'delete-auto' && confirm(`Excluir o automóvel ${item.placa}?`)) {
        await api(`/api/automoveis/${id}`, { method: 'DELETE' });
        await refreshAll();
        notify('Automóvel excluído com sucesso.');
      }
    } catch (error) {
      reportError(error);
    }
  });

  $('#automovel-id-search').closest('.search-control').querySelector('[data-lookup]').addEventListener('click', async () => {
    const input = $('#automovel-id-search');
    if (!input.value) {
      notify('Informe um identificador para buscar.', true);
      return;
    }
    try {
      const item = await api(`/api/automoveis/${encodeURIComponent(input.value)}`);
      const emUso = state.utilizacoes.some((uso) => uso.automovel_id === item.id && uso.data_fim === null);
      const row = `<tr><td class="id-cell">#${item.id}</td><td><span class="plate">${escapeHtml(item.placa)}</span></td><td>${escapeHtml(item.marca)}</td><td>${escapeHtml(item.cor)}</td><td><span class="status ${emUso ? 'status-in-use' : 'status-available'}">${emUso ? 'Em utilização' : 'Disponível'}</span></td><td><div class="row-actions"><button class="icon-button" type="button" aria-label="Consultar automóvel" data-action="view-auto" data-id="${item.id}">⌕</button><button class="icon-button" type="button" aria-label="Editar automóvel" data-action="edit-auto" data-id="${item.id}">✎</button><button class="icon-button danger" type="button" aria-label="Excluir automóvel" data-action="delete-auto" data-id="${item.id}">×</button></div></td></tr>`;
      setRows(row, '#automoveis-table', '#automoveis-empty');
      notify(`Automóvel #${item.id} encontrado.`);
    } catch (error) {
      reportError(error);
    }
  });

  let filterTimer;
  ['#filter-marca', '#filter-cor'].forEach((selector) => {
    $(selector).addEventListener('input', () => {
      clearTimeout(filterTimer);
      filterTimer = setTimeout(applyFilters, 250);
    });
  });

  $('#clear-auto-filters').addEventListener('click', () => {
    $('#filter-marca').value = '';
    $('#filter-cor').value = '';
    $('#automovel-id-search').value = '';
    applyFilters();
  });

  return { load };
}
