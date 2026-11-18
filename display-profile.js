(() => {
  'use strict';

  const button = document.getElementById('profile-button');
  const dialog = document.getElementById('profile-dialog');
  const input = document.getElementById('profile-name');
  const status = document.getElementById('profile-status');
  const submit = document.getElementById('profile-save');
  const maxLength = input.maxLength;
  let active = null;

  function cleanName(value) {
    if (typeof value !== 'string') return '';
    const name = value.trim();
    return name.length <= maxLength ? name : '';
  }

  function render() {
    const name = active?.name;
    button.hidden = !active;
    button.textContent = name || 'Elegir nombre';
    button.setAttribute('aria-label', name ? `Editar nombre del perfil: ${name}` : 'Elegir nombre del perfil');
    submit.disabled = !!active?.saving;
  }

  function update(account, value) {
    account.name = cleanName(value);
    try {
      if (account.name) localStorage.setItem(account.key, account.name);
      else localStorage.removeItem(account.key);
    } catch {}
    render();
  }

  function disconnect() {
    const account = active;
    active = null;
    account?.unwatch?.();
    if (dialog.open) dialog.close();
    render();
  }

  function connect(uid, { save, watch } = {}) {
    disconnect();
    const key = `kernnel-display-name:${uid}`;
    const account = { key, name: '', save, saving: false };
    try { account.name = cleanName(localStorage.getItem(key)); } catch {}
    active = account;
    render();
    account.unwatch = watch?.(name => {
      if (active === account) update(account, name);
    });
  }

  button.addEventListener('click', () => {
    if (!active) return;
    input.value = active.name;
    status.textContent = active.saving ? 'Guardando nombre…' : '';
    dialog.showModal();
    input.select();
  });
  document.getElementById('profile-cancel').addEventListener('click', () => dialog.close());
  document.getElementById('profile-form').addEventListener('submit', async event => {
    event.preventDefault();
    const account = active;
    if (!account || account.saving) return;
    const name = cleanName(input.value);
    if (!name) {
      status.textContent = 'Escribe un nombre de hasta 60 caracteres.';
      input.focus();
      return;
    }
    account.saving = true;
    status.textContent = 'Guardando nombre…';
    render();
    try {
      // La sesión local usa el almacenamiento del navegador. En línea, el perfil
      // se confirma con Firestore y el observador recibe cualquier cambio posterior.
      await account.save?.(name);
      if (active !== account) return;
      if (!account.unwatch) update(account, name);
      if (dialog.open) dialog.close();
    } catch (error) {
      if (active === account) {
        status.textContent = error.code === 'offline'
          ? 'Conéctate a Internet para guardar el nombre en tu cuenta.'
          : 'No se pudo guardar el nombre. Inténtalo nuevamente.';
      }
    } finally {
      account.saving = false;
      if (active === account) render();
    }
  });

  window.KernnelProfile = Object.freeze({ connect, disconnect });
})();
