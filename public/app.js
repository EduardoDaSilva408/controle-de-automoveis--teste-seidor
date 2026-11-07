import { $, api, handleError } from './js/shared.js';
import { initAutomoveis } from './js/automoveis.js';
import { initMotoristas } from './js/motoristas.js';
import { initUtilizacoes } from './js/utilizacoes.js';

const state = {
  automoveis: [],
  motoristas: [],
  utilizacoes: []
};

const automoveis = initAutomoveis({ api, handleError, state, refreshAll });
const motoristas = initMotoristas({ api, handleError, state, refreshAll });
const utilizacoes = initUtilizacoes({ api, handleError, state, refreshAll });

async function refreshAll() {
  await utilizacoes.load();
  await Promise.all([automoveis.load(), motoristas.load()]);
  utilizacoes.refreshAvailableOptions();
}

document.querySelectorAll('[data-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach((item) => item.classList.toggle('active', item === button));
    document.querySelectorAll('.page-section').forEach((panel) => panel.classList.toggle('active', panel.id === `panel-${button.dataset.tab}`));
    $('#breadcrumb-current').textContent = button.textContent.trim();
  });
});

refreshAll().catch(handleError);
