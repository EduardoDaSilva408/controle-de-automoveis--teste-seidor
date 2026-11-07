export const $ = (selector) => document.querySelector(selector);

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

export async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  if (response.status === 204) return null;
  const body = await response.json();
  if (!response.ok) throw new Error(body.erro || 'Não foi possível concluir a operação.');
  return body;
}

let toastTimer;

export function notify(message, error = false) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.toggle('error', error);
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3600);
}

export function handleError(error) {
  notify(error.message || 'Ocorreu um erro inesperado.', true);
}

export function setRows(rows, tableSelector, emptySelector) {
  $(tableSelector).innerHTML = rows;
  $(emptySelector).classList.toggle('hidden', rows.length > 0);
}

export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
