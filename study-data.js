/* Notas y progreso privados, independientes de la biblioteca musical. */
(() => {
  'use strict';

  const maxBytes = 3 * 1024 * 1024;
  const partSize = 200000;
  const maxParts = Math.ceil((4 * Math.ceil(maxBytes / 3)) / partSize);
  const types = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'image/bmp', 'application/pdf']);
  const blankNote = Object.freeze({ text: '', attachment: null });
  const emptyProgress = Object.freeze({ opens: 0, measures: [] });
  let database;
  let active;

  function openDatabase() {
    if (!database) database = new Promise((resolve, reject) => {
      const request = indexedDB.open('kernnel-study-v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('records');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch(error => {
      database = null;
      throw error;
    });
    return database;
  }

  async function editLocal(key, update) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('records', 'readwrite');
      const store = tx.objectStore('records');
      const lookup = store.get(key);
      let value, failure;
      lookup.onsuccess = () => {
        try {
          value = update(lookup.result);
          if (value !== lookup.result) store.put(value, key);
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve(value);
      tx.onabort = () => reject(failure || tx.error || new Error('No se pudo guardar en este dispositivo.'));
      tx.onerror = () => reject(tx.error || new Error('No se pudo guardar en este dispositivo.'));
    });
  }

  async function readAccount(uid) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const range = IDBKeyRange.bound(['account', uid], ['account', uid, []]);
      const request = db.transaction('records').objectStore('records').getAll(range);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function localKey(session, kind, songId = '') {
    return ['account', session.uid, kind, songId];
  }

  function emit(detail) {
    window.dispatchEvent(new CustomEvent('kernnel-study-data-updated', { detail }));
  }

  function setStatus(session, status) {
    if (active !== session || session.status === status) return;
    session.status = status;
    window.dispatchEvent(new CustomEvent('kernnel-study-sync-status', { detail: { status } }));
  }

  function disconnect() {
    if (!active) return;
    const session = active;
    active = null;
    clearTimeout(session.timer);
    for (const unsubscribe of session.unsubscribe) unsubscribe();
    emit({ accountChanged: true });
  }

  function connectLocal(uid) {
    if (active?.uid === uid) return active.ready;
    disconnect();
    const session = {
      uid, notes: new Map(), progress: new Map(), remoteProgress: new Map(), noteRequests: new Map(),
      pendingProgress: new Set(), unsubscribe: [], errors: new Set(), status: 'local', timer: null,
      syncingProgress: false, syncingNotes: false, retries: 0, notesReady: false, progressReady: false
    };
    active = session;
    session.ready = Promise.all([
      editLocal(['installation'], current => current || { id: crypto.randomUUID() }),
      readAccount(uid)
    ]).then(([device, records]) => {
      session.device = device.id;
      for (const record of records) {
        if (record.kind === 'note') session.notes.set(record.songId, record);
        if (record.kind === 'progress') session.progress.set(record.songId, record);
        if (record.kind === 'remote-progress') session.remoteProgress = groupProgress(record.rows);
      }
    }).catch(error => {
      session.localError = error;
      setStatus(session, 'error');
    }).finally(() => {
      if (active === session) emit({ accountChanged: true });
    });
    return session.ready;
  }

  function decodeAttachment(attachment) {
    if (!attachment) return null;
    const { name, type, dataUrl } = attachment;
    const prefix = `data:${type};base64,`;
    if (!types.has(type) || typeof name !== 'string' || !name.trim() || name.length > 200
      || typeof dataUrl !== 'string' || !dataUrl.startsWith(prefix)) {
      throw new Error('El adjunto debe ser una imagen compatible o un PDF.');
    }
    const encoded = dataUrl.slice(prefix.length);
    const trailing = encoded.endsWith('==') ? 2 : Number(encoded.endsWith('='));
    const bytes = (encoded.length / 4) * 3 - trailing;
    if (bytes > maxBytes) throw new Error('El adjunto supera el límite de 3 MB.');
    if (!encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      throw new Error('El adjunto no se pudo leer.');
    }
    return { name, type, dataUrl };
  }

  function getNote(songId) {
    const note = active?.notes.get(songId);
    if (!note) return blankNote;
    return { text: note.text, attachment: note.attachment ? { ...note.attachment } : null };
  }

  async function saveNote(songId, note) {
    const session = active;
    if (!session || !songId) throw new Error('Inicia sesión para guardar la nota.');
    const { text } = note;
    if (typeof text !== 'string' || text.length > 12000) throw new Error('La nota admite hasta 12.000 caracteres.');
    const attachment = decodeAttachment(note.attachment);
    await session.ready;
    if (session.localError) throw new Error('No se pudo guardar la nota en este dispositivo.');
    if (active !== session) throw new Error('La sesión cambió.');
    const record = { kind: 'note', songId, text, attachment, revision: crypto.randomUUID(), dirty: true };
    try { await editLocal(localKey(session, 'note', songId), () => record); }
    catch { throw new Error('No se pudo guardar la nota en este dispositivo. Comprueba el espacio disponible.'); }
    if (active === session) {
      session.notes.set(songId, record);
      emit({ songId });
      schedule(session);
    }
    return true;
  }

  function measureKey(value) {
    if (Number.isInteger(value) && value > 0 && value <= 256) return String(value);
    return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value) ? value : null;
  }
  const cleanMeasures = values => [...new Set(values.map(measureKey).filter(Boolean))];
  const asMeasures = values => Array.isArray(values) ? cleanMeasures(values) : [];

  function groupProgress(rows) {
    const grouped = new Map();
    for (const row of rows) {
      if (typeof row.songId !== 'string' || typeof row.device !== 'string' || !Number.isSafeInteger(row.opens) || row.opens < 0) continue;
      if (!grouped.has(row.songId)) grouped.set(row.songId, new Map());
      grouped.get(row.songId).set(row.device, { opens: row.opens, measures: asMeasures(row.measures) });
    }
    return grouped;
  }

  function progress(songId, currentMeasures) {
    const song = active?.progress.get(songId) || emptyProgress;
    const remotes = active?.remoteProgress.get(songId);
    const measures = new Set(song.measures);
    let opens = song.opens;
    for (const [device, value] of remotes || []) {
      opens += device === active.device ? Math.max(0, value.opens - song.opens) : value.opens;
      for (const measure of value.measures) measures.add(measure);
    }
    const current = Array.isArray(currentMeasures) ? cleanMeasures(currentMeasures)
      : Array.from({ length: Number.isInteger(currentMeasures) ? Math.min(currentMeasures, 256) : 0 }, (_, i) => String(i + 1));
    const total = current.length;
    const studied = current.filter(key => measures.has(key)).length;
    return { opens, studied, percent: total > 0 ? Math.round((1000 * studied) / total) / 10 : 0 };
  }

  async function record(songId, measure) {
    const session = active;
    if (!session || !songId) return;
    await session.ready;
    if (active !== session || session.localError) return;
    if (measure && (session.progress.get(songId)?.measures.includes(measure)
      || [...(session.remoteProgress.get(songId)?.values() || [])].some(row => row.measures.includes(measure)))) return;
    try {
      const kind = 'progress';
      const value = await editLocal(localKey(session, kind, songId), previous => {
        const current = previous || { kind, songId, opens: 0, measures: [] };
        return measure
          ? { ...current, measures: cleanMeasures([...current.measures, measure]) }
          : { ...current, opens: current.opens + 1 };
      });
      if (active !== session) return;
      session.progress.set(songId, value);
      session.pendingProgress.add(songId);
      emit({ songId });
      schedule(session);
    } catch (error) {
      setStatus(session, 'error');
      console.warn('[Estudio] No se pudo guardar el avance', error);
    }
  }

  function activeCloud(session) {
    return active === session && !!session.cloud;
  }

  function collection(session, name) {
    const { sdk, db } = session.cloud;
    return sdk.collection(db, 'users', session.uid, name);
  }

  function notePart(session, key, index) {
    const { sdk, db } = session.cloud;
    return sdk.doc(db, 'users', session.uid, 'studyNotes', key, 'parts', String(index));
  }

  async function saveCloudNote(session, note) {
    const { sdk, db } = session.cloud;
    const hash = window.KernnelSyncCore.hash;
    const key = await hash(note.songId);
    const encoded = note.attachment?.dataUrl?.split(',', 2)[1];
    const fingerprint = encoded ? await hash(encoded) : null;
    const ref = sdk.doc(collection(session, 'studyNotes'), key);
    await sdk.runTransaction(db, async tx => {
      if (!activeCloud(session)) throw new Error('La sesión cambió.');
      const snap = await tx.get(ref);
      if (!activeCloud(session)) throw new Error('La sesión cambió.');
      const head = snap.exists() ? snap.data() : null;
      if (head?.revision === note.revision) return;
      const keepAttachment = !!fingerprint && head?.attachment?.fingerprint === fingerprint;
      const currentPartCount = Math.min(head?.attachment?.parts || 0, maxParts);
      let attachment = null;
      if (encoded) {
        const parts = Math.ceil(encoded.length / partSize);
        const { name, type } = note.attachment;
        attachment = { name, type, parts, fingerprint, version: keepAttachment ? head.attachment.version : note.revision };
        if (!keepAttachment) for (let i = 0; i < parts; i++) {
          tx.set(notePart(session, key, i), { version: attachment.version, payload: encoded.slice(i * partSize, (i + 1) * partSize) });
        }
      }
      for (let i = attachment?.parts || 0; i < currentPartCount; i++) tx.delete(notePart(session, key, i));
      tx.set(ref, { songId: note.songId, revision: note.revision, text: note.text, attachment });
    });
    if (!activeCloud(session)) return;
    const persisted = await editLocal(localKey(session, 'note', note.songId), current =>
      current?.revision === note.revision ? { ...current, fingerprint, dirty: false } : current);
    if (!activeCloud(session)) return;
    if (persisted) session.notes.set(note.songId, persisted);
    // Escucha la versión vigente aunque otra pestaña haya escrito mientras marcábamos la nota local.
    const latest = await sdk.getDocFromServer(ref);
    if (activeCloud(session) && latest.exists()) await receiveNote(session, key, latest.data());
  }

  async function receiveNote(session, key, head, isLatest = () => true) {
    const { songId, text, revision, attachment } = head;
    if (!activeCloud(session) || !isLatest() || !songId || typeof revision !== 'string') return;
    const cached = session.notes.get(songId);
    if (cached?.dirty || cached?.revision === revision || session.noteRequests.get(key) === revision) return;
    session.noteRequests.set(key, revision);
    try {
      let file = null;
      if (attachment) {
        if (!Number.isInteger(attachment.parts) || attachment.parts < 1 || attachment.parts > maxParts) throw new Error('Adjunto incompleto.');
        const sameFile = cached?.fingerprint === attachment.fingerprint && cached.attachment;
        const encoded = sameFile ? cached.attachment.dataUrl.split(',', 2)[1] : await readNoteParts(session, key, attachment);
        file = decodeAttachment({ name: attachment.name, type: attachment.type, dataUrl: `data:${attachment.type};base64,${encoded}` });
      }
      const valid = () => activeCloud(session) && isLatest() && session.noteRequests.get(key) === revision;
      if (!valid()) return;
      const persisted = await editLocal(localKey(session, 'note', songId), current => {
        if (!valid() || current?.dirty) return current;
        return { kind: 'note', songId, revision, text, attachment: file, fingerprint: attachment?.fingerprint || null, dirty: false };
      });
      if (!valid() || !persisted) return;
      session.notes.set(songId, persisted);
      emit({ songId });
    } finally {
      if (session.noteRequests.get(key) === revision) session.noteRequests.delete(key);
    }
  }

  async function readNoteParts(session, key, attachment) {
    const { sdk, db } = session.cloud;
    const docs = await sdk.getDocsFromServer(sdk.collection(db, 'users', session.uid, 'studyNotes', key, 'parts'));
    const parts = new Map(docs.docs.map(doc => [doc.id, doc.data()]));
    let encoded = '';
    for (let i = 0; i < attachment.parts; i++) {
      const part = parts.get(String(i));
      if (part?.version !== attachment.version || typeof part.payload !== 'string') throw new Error('La nota cambió en otro dispositivo.');
      encoded += part.payload;
    }
    if (await window.KernnelSyncCore.hash(encoded) !== attachment.fingerprint) throw new Error('El adjunto no pasó la comprobación de integridad.');
    return encoded;
  }

  function progressCovered(local, cloud) {
    return !!cloud && local.opens <= cloud.opens && local.measures.every(n => cloud.measures.includes(n));
  }

  async function saveCloudProgress(session, songId, row) {
    const { sdk, db } = session.cloud;
    const key = await window.KernnelSyncCore.hash([songId, session.device]);
    const ref = sdk.doc(collection(session, 'studyProgress'), key);
    await sdk.runTransaction(db, async tx => {
      if (!activeCloud(session)) throw new Error('La sesión cambió.');
      const snap = await tx.get(ref);
      if (!activeCloud(session)) throw new Error('La sesión cambió.');
      const current = snap.exists() ? snap.data() : emptyProgress;
      if (progressCovered(row, current)) return;
      tx.set(ref, {
        songId,
        device: session.device,
        opens: Math.max(row.opens, current.opens),
        measures: cleanMeasures([...row.measures, ...current.measures])
      });
    });
    if (session.progress.get(songId) === row) session.pendingProgress.delete(songId);
  }

  function pending(session) {
    return session.pendingProgress.size > 0 || [...session.notes.values()].some(note => note.dirty);
  }

  function reflectStatus(session) {
    if (!session.cloud) return;
    if (!navigator.onLine) setStatus(session, 'offline');
    else if (session.errors.size) setStatus(session, 'error');
    else if (!session.notesReady || !session.progressReady || pending(session)) setStatus(session, 'pending');
    else setStatus(session, 'synced');
  }

  function schedule(session, delay = 2200) {
    if (!activeCloud(session)) return;
    reflectStatus(session);
    if (!navigator.onLine || session.timer) return;
    session.timer = setTimeout(() => {
      session.timer = null;
      flush(session);
    }, delay);
  }

  async function flushCategory(session, category, job) {
    const flag = category === 'notes' ? 'syncingNotes' : 'syncingProgress';
    if (session[flag]) return;
    session[flag] = true;
    try {
      await job();
      session.errors.delete(category);
    } catch (error) {
      if (activeCloud(session)) {
        session.errors.add(category);
        console.warn('[Estudio] No se pudo sincronizar', error);
      }
    } finally {
      session[flag] = false;
    }
  }

  async function flush(session) {
    if (!activeCloud(session) || !navigator.onLine) return;
    await Promise.all([
      flushCategory(session, 'notes', async () => {
        for (const note of session.notes.values()) {
          if (!activeCloud(session)) return;
          if (note.dirty) await saveCloudNote(session, note);
        }
      }),
      flushCategory(session, 'progress', async () => {
        for (const songId of [...session.pendingProgress]) {
          if (!activeCloud(session)) return;
          await saveCloudProgress(session, songId, session.progress.get(songId));
        }
      })
    ]);
    if (pending(session) && !session.syncingNotes && !session.syncingProgress) {
      const delay = session.errors.size ? Math.min(60000, 2000 * 2 ** Math.min(++session.retries, 5)) : 2200;
      schedule(session, delay);
    } else if (!pending(session)) {
      session.retries = 0;
      reflectStatus(session);
    }
  }

  async function connectCloud({ uid, sdk, db }) {
    const ready = connectLocal(uid);
    const session = active;
    await ready;
    if (active !== session || session.cloud || session.localError || !sdk || !db) return;
    session.cloud = { sdk, db };
    const listen = (name, receive) => {
      session.unsubscribe.push(sdk.onSnapshot(collection(session, name), { includeMetadataChanges: true }, snapshot => {
        if (!activeCloud(session) || snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
        Promise.resolve(receive(snapshot)).catch(error => {
          if (!activeCloud(session)) return;
          session.errors.add(name);
          reflectStatus(session);
          console.warn('[Estudio] No se pudieron leer los datos de la cuenta', error);
        });
      }, error => {
        if (!activeCloud(session)) return;
        session.errors.add(name);
        reflectStatus(session);
        console.warn('[Estudio] No se pudo conectar con la cuenta', error);
      }));
    };
    listen('studyProgress', async snapshot => {
      const rows = snapshot.docs.map(doc => doc.data());
      const grouped = groupProgress(rows);
      session.remoteProgress = grouped;
      for (const [songId, local] of session.progress) {
        if (!progressCovered(local, grouped.get(songId)?.get(session.device))) session.pendingProgress.add(songId);
      }
      session.progressReady = true;
      session.errors.delete('studyProgress');
      emit({});
      if (session.pendingProgress.size) schedule(session);
      else reflectStatus(session);
      await editLocal(localKey(session, 'remote-progress'), () => ({ kind: 'remote-progress', rows }));
    });
    let latestNotes = new Map();
    listen('studyNotes', async snapshot => {
      const notes = new Map(snapshot.docs.map(doc => [doc.id, doc.data()]));
      latestNotes = notes;
      for (const [key, head] of notes) {
        if (!activeCloud(session) || latestNotes !== notes) return;
        await receiveNote(session, key, head, () => latestNotes.get(key)?.revision === head.revision);
      }
      if (!activeCloud(session) || latestNotes !== notes) return;
      session.notesReady = true;
      session.errors.delete('studyNotes');
      reflectStatus(session);
    });
    if (pending(session)) schedule(session);
    else reflectStatus(session);
  }

  window.addEventListener('online', () => { if (active) schedule(active, 0); });
  window.addEventListener('offline', () => { if (active) reflectStatus(active); });

  window.KernnelStudyData = Object.freeze({
    connectLocal, connectCloud, disconnect, getNote, saveNote, progress,
    getStatus: () => active?.status || 'local',
    recordOpen: songId => record(songId, 0),
    recordMeasure: (songId, value) => {
      const key = measureKey(value);
      return key ? record(songId, key) : undefined;
    }
  });
})();
