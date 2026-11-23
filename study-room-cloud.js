/* Transporte de salas privadas mediante Firestore. El audio se genera en cada equipo. */
(() => {
  'use strict';

  const roomIdPattern = /^[0-9a-f]{32}$/;
  const meters = new Set(['2/4', '3/4', '4/4', '6/8', '9/8', '12/8']);
  const maxScoreBytes = 6 * 1024 * 1024;
  const maxScoreParts = 36;
  const partLength = 180000;
  const text = (value, limit) => typeof value === 'string' ? value.slice(0, limit) : '';
  const rgbColor = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : '';
  const newId = () => crypto.randomUUID().replace(/-/g, '');

  function roomError(message, code = 'room/invalid') {
    return Object.assign(new Error(message), { code });
  }

  function normalizeInvites(invitees, email) {
    const addresses = [...new Set(invitees.map(address => address.trim().toLowerCase()))]
      .filter(address => address !== email);
    if (addresses.length > 30) throw roomError('Puedes invitar hasta 30 cuentas por sala.');
    if (addresses.some(address => address.length > 254 || !/^[^@/\s]+@[^@/\s]+\.[^@/\s]+$/.test(address))) {
      throw roomError('Revisa los correos de la invitación.');
    }
    return addresses;
  }

  function projectScore(source) {
    const meter = source?.estudio?.meter;
    if (!source || !Array.isArray(source.notas) || source.notas.length < 1 || source.notas.length > 256
      || !meters.has(meter) || typeof source.id !== 'string' || !source.id) {
      throw roomError('La canción seleccionada no tiene una partitura compatible.');
    }
    const length = source.notas.length;
    const beats = Number(meter.split('/')[0]);
    return {
      id: text(source.id, 500),
      nombre: text(source.nombre, 150),
      notas: source.notas.map(value => text(value, 20000)),
      nombres: Array.from({ length }, (_, i) => text(source.nombres?.[i], 150)),
      tiempos: Array.from({ length }, (_, i) => {
        const row = Array.isArray(source.tiempos?.[i]) ? source.tiempos[i] : [];
        return row.slice(0, beats).map(value => {
          if (!value || typeof value !== 'object') return null;
          const img = typeof value.img === 'string'
            && /^data:image\/(?:png|jpeg|gif|webp|bmp|avif);base64,/.test(value.img)
            ? value.img : null;
          return { txt: text(value.txt, 20000), color: rgbColor(value.color), img };
        });
      }),
      secciones: (Array.isArray(source.secciones) ? source.secciones : [])
        .filter(value => value && Number.isInteger(value.desde) && Number.isInteger(value.hasta)
          && value.desde >= 1 && value.hasta >= value.desde && value.hasta <= length)
        .map(value => ({
          id: text(value.id, 100), nombre: text(value.nombre, 150),
          desde: value.desde, hasta: value.hasta, color: rgbColor(value.color)
        })),
      estudio: {
        meter,
        bpm: Number.isFinite(source.estudio.bpm) ? source.estudio.bpm : 120,
        practiceBpm: Number.isFinite(source.estudio.practiceBpm) ? source.estudio.practiceBpm : 120
      }
    };
  }

  async function scoreHash(bytes) {
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
      byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function encodeScore(source) {
    const song = projectScore(source);
    const raw = JSON.stringify(song);
    const bytes = new TextEncoder().encode(raw);
    if (bytes.byteLength > maxScoreBytes) {
      throw roomError('La partitura compartida supera los 6 MB. Reduce el tamaño de las imágenes del tema.');
    }
    const parts = [];
    for (let start = 0; start < raw.length;) {
      let end = Math.min(start + partLength, raw.length);
      if (end < raw.length && /[\uD800-\uDBFF]/.test(raw[end - 1])) end--;
      parts.push(raw.slice(start, end));
      start = end;
    }
    return {
      head: {
        version: newId(), parts: parts.length, bytes: bytes.byteLength, hash: await scoreHash(bytes),
        measures: song.notas.length, beats: Number(song.estudio.meter.split('/')[0])
      },
      parts
    };
  }

  function validateTransport(transport, score) {
    const { mode, bpm, from, to, loop, startBeat, startsAt } = transport;
    if (!['ready', 'playing', 'paused'].includes(mode)
      || !Number.isInteger(bpm) || bpm < 30 || bpm > 300
      || !Number.isInteger(from) || !Number.isInteger(to)
      || from < 1 || to < from || to > score.measures
      || typeof loop !== 'boolean'
      || !Number.isInteger(startBeat) || startBeat < 0 || startBeat >= (to - from + 1) * score.beats
      || !Number.isSafeInteger(startsAt) || startsAt < 0 || (mode === 'playing' && startsAt === 0)) {
      throw roomError('La configuración de reproducción de la sala no es válida.');
    }
    return { mode, bpm, from, to, loop, startBeat, startsAt };
  }

  function create({ uid, email, sdk, db }) {
    email = email.toLowerCase();

    function roomRef(id) {
      if (!roomIdPattern.test(id)) throw roomError('El enlace de la sala no es válido.');
      return sdk.doc(db, 'studyRooms', id);
    }
    function partsRef(id, version) {
      return sdk.collection(db, 'studyRooms', id, 'scores', version, 'parts');
    }
    function partRef(id, version, index) {
      return sdk.doc(partsRef(id, version), String(index));
    }
    async function batchEntries(entries, write) {
      // Cada lote pequeño mantiene acotadas las consultas de acceso de las reglas.
      for (let first = 0; first < entries.length; first += 6) {
        const batch = sdk.writeBatch(db);
        entries.slice(first, first + 6).forEach((entry, at) => write(batch, entry, first + at));
        await batch.commit();
      }
    }

    async function removeScore(id, score) {
      if (!score) return;
      try {
        await batchEntries(Array.from({ length: score.parts }, (_, index) => index),
          (batch, index) => batch.delete(partRef(id, score.version, index)));
      } catch (error) {
        // Un fallo de limpieza no revierte el puntero ni afecta a la sala.
        console.warn('[Sala] No se pudo retirar una partitura anterior', error.code);
      }
    }

    function getOwnerHead(snapshot) {
      const value = snapshot.data();
      if (!snapshot.exists() || value?.ownerUid !== uid) {
        throw roomError('Solo el director puede cambiar esta sala.', 'room/forbidden');
      }
      return value;
    }

    async function publishScore(id, score, transport) {
      const ref = roomRef(id);
      const settings = validateTransport(transport, score.head);
      try {
        await batchEntries(score.parts, (batch, payload, index) =>
          batch.set(partRef(id, score.head.version, index), { index, payload }));
        const old = await sdk.runTransaction(db, async tx => {
          const current = getOwnerHead(await tx.get(ref));
          if (current.closed) throw roomError('La sala está cerrada.', 'room/closed');
          tx.update(ref, { score: score.head, transport: settings });
          return current.score;
        });
        void removeScore(id, old);
      } catch (error) {
        // Las reglas impiden borrar la versión visible si el cambio sí se confirmó.
        void removeScore(id, score.head);
        throw error;
      }
    }

    async function createRoom({ name, invitees, song, transport }) {
      const title = name.trim();
      if (!title || title.length > 120) throw roomError('Escribe un nombre de sala de hasta 120 caracteres.');
      const emails = normalizeInvites(invitees, email);
      const score = await encodeScore(song);
      validateTransport(transport, score.head);
      const id = newId();
      const ref = roomRef(id);
      await sdk.setDoc(ref, {
        ownerUid: uid, name: title, createdAt: sdk.serverTimestamp(),
        closed: false, score: null, transport: null
      });
      try {
        await batchEntries(emails, (batch, address) =>
          batch.set(sdk.doc(db, 'studyRooms', id, 'invites', address), { invited: true }));
        await publishScore(id, score, transport);
        return id;
      } catch (error) {
        // La sala incompleta no es visible desde una invitación.
        void closeRoom(id).catch(() => {});
        throw error;
      }
    }

    async function readScore(id, head) {
      if (!roomIdPattern.test(head?.version) || !Number.isInteger(head.parts) || head.parts < 1
        || head.parts > maxScoreParts || !Number.isInteger(head.bytes) || head.bytes < 1 || head.bytes > maxScoreBytes) {
        throw roomError('No se pudo leer la partitura compartida.');
      }
      const result = await sdk.getDocsFromServer(partsRef(id, head.version));
      const parts = new Map(result.docs.map(snapshot => [snapshot.id, snapshot.data()]));
      const ordered = Array.from({ length: head.parts }, (_, index) => {
        const part = parts.get(String(index));
        if (part?.index !== index || typeof part.payload !== 'string' || part.payload.length > partLength) {
          throw roomError('La partitura compartida está incompleta.');
        }
        return part.payload;
      });
      const raw = ordered.join('');
      const bytes = new TextEncoder().encode(raw);
      if (bytes.byteLength !== head.bytes || await scoreHash(bytes) !== head.hash) {
        throw roomError('La partitura compartida no pasó la comprobación de integridad.');
      }
      const song = projectScore(JSON.parse(raw));
      if (song.notas.length !== head.measures || Number(song.estudio.meter.split('/')[0]) !== head.beats) {
        throw roomError('La partitura compartida no coincide con la sala.');
      }
      return song;
    }

    function watchRoom(id, onRoom, onError) {
      let ref;
      try { ref = roomRef(id); }
      catch (error) {
        let pending = true;
        queueMicrotask(() => { if (pending) onError(error); });
        return () => { pending = false; };
      }
      let active = true;
      let latest;
      let cached;
      let loading;
      let lastRoom;

      function emit(head, song) {
        lastRoom = {
          id, name: head.name, ownerUid: head.ownerUid, closed: head.closed,
          song, transport: head.transport, scoreVersion: head.score?.version
        };
        onRoom(lastRoom);
      }
      function accept(head) {
        if (!active) return;
        latest = head;
        if (head.closed) { emit(head, null); return; }
        if (!head.score) return;
        const version = head.score.version;
        if (cached?.version === version) { emit(head, cached.song); return; }
        if (loading === version) return;
        loading = version;
        if (lastRoom?.song) {
          onRoom({
            ...lastRoom,
            loadingScore: true,
            transport: { ...lastRoom.transport, mode: 'ready', startBeat: 0, startsAt: 0 }
          });
        }
        readScore(id, head.score).then(song => {
          if (active && !latest.closed && latest.score?.version === version) {
            cached = { version, song };
            emit(latest, song);
          }
        }).catch(async error => {
          if (!active || latest.closed || latest.score?.version !== version) return;
          // El director puede cambiar de versión mientras un participante descarga la partitura.
          try {
            const newer = await sdk.getDocFromServer(ref);
            if (!active || latest.closed || latest.score?.version !== version) return;
            const next = newer.data();
            if (next && (next.closed || next.score?.version !== version)) { accept(next); return; }
          } catch {}
          if (active && !latest.closed && latest.score?.version === version) onError(error);
        }).finally(() => { if (loading === version) loading = null; });
      }

      const unwatch = sdk.onSnapshot(ref, { includeMetadataChanges: true }, snapshot => {
        if (!active || snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
        if (!snapshot.exists()) {
          onError(roomError('La sala no está disponible.', 'room/missing'));
          return;
        }
        accept(snapshot.data());
      }, error => { if (active) onError(error); });

      return () => { active = false; unwatch(); };
    }

    async function updateTransport(id, transport) {
      const ref = roomRef(id);
      return sdk.runTransaction(db, async tx => {
        const value = getOwnerHead(await tx.get(ref));
        if (value.closed || !value.score) throw roomError('La sala está cerrada.', 'room/closed');
        tx.update(ref, { transport: validateTransport(transport, value.score) });
      });
    }

    async function shareSong(id, song, transport) {
      const score = await encodeScore(song);
      const settings = validateTransport(transport, score.head);
      const ref = roomRef(id);
      await sdk.runTransaction(db, async tx => {
        const room = getOwnerHead(await tx.get(ref));
        if (room.closed || !room.score) throw roomError('La sala está cerrada.', 'room/closed');
        const playback = room.transport;
        if (playback.mode !== 'ready' || playback.startBeat !== 0 || playback.startsAt !== 0) {
          tx.update(ref, { transport: { ...playback, mode: 'ready', startBeat: 0, startsAt: 0 } });
        }
      });
      await publishScore(id, score, settings);
    }

    async function closeRoom(id) {
      const ref = roomRef(id);
      const old = await sdk.runTransaction(db, async tx => {
        const value = getOwnerHead(await tx.get(ref));
        if (!value.closed) tx.update(ref, { closed: true });
        return value.score;
      });
      void removeScore(id, old);
    }

    function sampleClock(id) {
      roomRef(id);
      const ref = sdk.doc(db, 'studyRooms', id, 'clocks', uid, 'samples', newId());
      return new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const monotonic = performance.now();
        let finish, unwatch;
        let accepted = false;
        const settle = (error, value) => {
          if (!finish) return;
          clearTimeout(finish);
          finish = null;
          unwatch?.();
          if (error) reject(error);
          else resolve(value);
        };
        finish = setTimeout(() => settle(roomError('No se pudo ajustar el reloj de la sala.', 'room/clock-timeout')), 5000);
        unwatch = sdk.onSnapshot(ref, { includeMetadataChanges: true }, snapshot => {
          if (!finish || !snapshot.exists() || snapshot.metadata.hasPendingWrites) return;
          const stamp = snapshot.data().at?.toMillis();
          if (!Number.isFinite(stamp)) return;
          const elapsed = performance.now() - monotonic;
          accepted = true;
          settle(null, { offset: stamp - startedAt - elapsed / 2, elapsed });
          void sdk.deleteDoc(ref).catch(() => {});
        }, error => settle(error));
        sdk.setDoc(ref, { at: sdk.serverTimestamp() }).then(() => {
          if (!finish && !accepted) void sdk.deleteDoc(ref).catch(() => {});
        }, error => settle(error));
      });
    }

    async function clockOffset(id) {
      const first = await sampleClock(id);
      // Una segunda lectura sólo compensa una primera respuesta lenta.
      if (first.elapsed < 300) return Math.round(first.offset);
      const second = await sampleClock(id).catch(() => null);
      return Math.round(second && second.elapsed < first.elapsed ? second.offset : first.offset);
    }

    return { uid, email, createRoom, watchRoom, updateTransport, shareSong, closeRoom, clockOffset };
  }

  window.KernnelRoomCloud = Object.freeze({ create });
})();
