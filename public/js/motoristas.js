import { $, api, escapeHtml, notify, setRows } from './shared.js';

export function initMotoristas({ handleError: reportError, state, refreshAll }) {
  async function load(params = '') {
    const motoristas = await api(`/api/motoristas${params}`);
    if (!params) state.motoristas = motoristas;
    const emUso = new Set(state.utilizacoes
      .filter((item) => item.data_fim === null)
      .map((item) => item.motorista_id));
    $('#motoristas-count').textContent = state.motoristas.length;
    $('#motoristas-active').textContent = emUso.size;
    $('#motoristas-list-count').textContent = motoristas.length;
    const rows = motoristas.map((item) => `
      <tr>
        <td class="id-cell">#${item.id}</td>
        <td><strong>${escapeHtml(item.nome)}</strong></td>
        <td><span class="status ${emUso.has(item.id) ? 'status-in-use' : 'status-available'}">${emUso.has(item.id) ? 'Em atividade' : 'Disponível'}</span></td>
        <td><div class="row-actions">
          <button class="icon-button" type="button" title="Consultar motorista" aria-label="Consultar motorista ${item.id}" data-action="view-driver" data-id="${item.id}">⌕</button>
          <button class="icon-button" type="button" title="Editar motorista" aria-label="Editar motorista ${item.id}" data-action="edit-driver" data-id="${item.id}">✎</button>
          <button class="icon-button danger" type="button" title="Excluir motorista" aria-label="Excluir motorista ${item.id}" data-action="delete-driver" data-id="${item.id}">×</button>
        </div></td>
      </tr>`).join('');
    setRows(rows, '#motoristas-table', '#motoristas-empty');
  }

  function resetForm() {
    $('#motorista-form').reset();
    $('#motorista-id').value = '';
    $('#motorista-submit').textContent = '+ Cadastrar motorista';
    $('[data-cancel="motorista"]').classList.add('hidden');
  }

  $('#motorista-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = $('#motorista-id').value;
    try {
      await api(id ? `/api/motoristas/${id}` : '/api/motoristas', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify({ nome: $('#motorista-nome').value })
      });
      resetForm();
      await refreshAll();
      notify(id ? 'Motorista atualizado com sucesso.' : 'Motorista cadastrado com sucesso.');
    } catch (error) {
      reportError(error);
    }
  });

  $('[data-cancel="motorista"]').addEventListener('click', resetForm);

  $('#motoristas-table').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    try {
      const item = await api(`/api/motoristas/${id}`);
      if (action === 'view-driver') {
        notify(`Motorista #${item.id}: ${item.nome}`);
      } else if (action === 'edit-driver') {
        $('#motorista-id').value = item.id;
        $('#motorista-nome').value = item.nome;
        $('#motorista-submit').textContent = 'Salvar alterações';
        $('[data-cancel="motorista"]').classList.remove('hidden');
        $('#motorista-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (action === 'delete-driver' && confirm(`Excluir o motorista ${item.nome}?`)) {
        await api(`/api/motoristas/${id}`, { method: 'DELETE' });
        await refreshAll();
        notify('Motorista excluído com sucesso.');
      }
    } catch (error) {
      reportError(error);
    }
  });

  $('#motorista-id-search').closest('.search-control').querySelector('[data-lookup]').addEventListener('click', async () => {
    const input = $('#motorista-id-search');
    if (!input.value) {
      notify('Informe um identificador para buscar.', true);
      return;
    }
    try {
      const item = await api(`/api/motoristas/${encodeURIComponent(input.value)}`);
      const emUso = state.utilizacoes.some((uso) => uso.motorista_id === item.id && uso.data_fim === null);
      const row = `<tr><td class="id-cell">#${item.id}</td><td><strong>${escapeHtml(item.nome)}</strong></td><td><span class="status ${emUso ? 'status-in-use' : 'status-available'}">${emUso ? 'Em atividade' : 'Disponível'}</span></td><td><div class="row-actions"><button class="icon-button" type="button" aria-label="Consultar motorista" data-action="view-driver" data-id="${item.id}">⌕</button><button class="icon-button" type="button" aria-label="Editar motorista" data-action="edit-driver" data-id="${item.id}">✎</button><button class="icon-button danger" type="button" aria-label="Excluir motorista" data-action="delete-driver" data-id="${item.id}">×</button></div></td></tr>`;
      setRows(row, '#motoristas-table', '#motoristas-empty');
      notify(`Motorista #${item.id} encontrado.`);
    } catch (error) {
      reportError(error);
    }
  });

  let filterTimer;
  $('#filter-nome').addEventListener('input', () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => {
      const nome = $('#filter-nome').value.trim();
      load(nome ? `?nome=${encodeURIComponent(nome)}` : '').catch(reportError);
    }, 250);
  });

  $('#clear-driver-filter').addEventListener('click', () => {
    $('#filter-nome').value = '';
    $('#motorista-id-search').value = '';
    load().catch(reportError);
  });

  return { load };
}
