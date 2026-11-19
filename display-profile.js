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

  function profileRecord(key, value) {
    const writing = value !== undefined;
    return new Promise(resolve => {
      const fallback = writing ? false : '';
      if (typeof openDB !== 'function') { resolve(fallback); return; }
      openDB(db => {
        if (!db) { resolve(fallback); return; }
        try {
          const transaction = db.transaction('kv', writing ? 'readwrite' : 'readonly');
          const store = transaction.objectStore('kv');
          const request = writing ? store.put(value, key) : store.get(key);
          transaction.oncomplete = () => { db.close(); resolve(writing ? true : cleanName(request.result)); };
          transaction.onabort = transaction.onerror = () => { db.close(); resolve(fallback); };
        } catch {
          db.close();
          resolve(fallback);
        }
      });
    });
  }

  function cacheName(key, name) {
    try {
      localStorage.setItem(key, name);
      return Promise.resolve(true);
    } catch {
      return profileRecord(key, name);
    }
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
    const listen = () => {
      if (active !== account) return;
      account.unwatch = watch?.((value, preserveCached = false) => {
        const name = cleanName(value);
        if (active !== account || account.saving || !name || name === account.name ||
          (preserveCached && account.name)) return;
        account.name = name;
        void cacheName(account.key, name);
        render();
      });
    };
    if (account.name) listen();
    else profileRecord(key).then(name => {
      if (active !== account) return;
      if (!account.name && !account.saving) {
        account.name = name;
        render();
      }
      listen();
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
      await account.save?.(name);
      if (active !== account) return;
      const persisted = await cacheName(account.key, name);
      if (active !== account) return;
      if (!account.save && !persisted) {
        status.textContent = 'El navegador no pudo guardar el nombre en este dispositivo.';
        return;
      }
      account.name = name;
      if (dialog.open) dialog.close();
    } catch (error) {
      if (active === account) {
        status.textContent = ['offline', 'auth/network-request-failed'].includes(error.code)
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
