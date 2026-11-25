/* Metriqa Musical v2: modelo puro, sin dependencias de DOM ni Firebase. */
(function (root) {
  'use strict';
  const PPQ = 960;
  const clone = value => JSON.parse(JSON.stringify(value));
  const integer = (n, min = 0) => Number.isSafeInteger(n) && n >= min;
  const token = prefix => prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);

  function parseMeter(text) {
    const match = /^(\d{1,2})\/(2|4|8|16)$/.exec(String(text || '4/4'));
    if (!match) throw Error('Cifra de compás inválida.');
    const numerator = Number(match[1]), denominator = Number(match[2]);
    if (numerator < 1 || numerator > 32) throw Error('Numerador de compás inválido.');
    return { numerator, denominator };
  }
  function durationTicks(meter) {
    const ticks = PPQ * 4 * meter.numerator / meter.denominator;
    if (!integer(ticks, 1)) throw Error('Duración de compás no representable.');
    return ticks;
  }
  function pulseTicks(meter) {
    return PPQ * 4 / meter.denominator;
  }
  function create(song) {
    if (!song || !Array.isArray(song.notas) || !song.notas.length) throw Error('Canción inválida.');
    const baseMeter = parseMeter(song.estudio && song.estudio.meter);
    const measures = song.notas.map((_, index) => ({ id: token('m'), displayNumber: index + 1 }));
    return {
      schemaVersion: 2,
      resolutionPPQ: PPQ,
      measures,
      meterEvents: [{ measureId: measures[0].id, numerator: baseMeter.numerator, denominator: baseMeter.denominator }],
      defaultKeySignature: { fifths: 0 },
      fragments: [],
      accentOverrides: {}
    };
  }
  function ensure(song) {
    if (!song || !Array.isArray(song.notas)) throw Error('Canción inválida.');
    if (!song.musica) song.musica = create(song);
    const music = song.musica;
    if (music.schemaVersion !== 2 || music.resolutionPPQ !== PPQ || !Array.isArray(music.measures) ||
        !Array.isArray(music.meterEvents) || !Array.isArray(music.fragments)) {
      throw Error('Versión musical incompatible. No se ha modificado la canción.');
    }
    if (music.measures.length > song.notas.length) {
      const deleted = new Set(music.measures.slice(song.notas.length).map(m => m.id));
      const hasReferences = music.fragments.some(f => deleted.has(f.start && f.start.measureId) ||
        deleted.has(f.end && f.end.measureId) || (f.events || []).some(n => deleted.has(n.measureId)));
      if (hasReferences) throw Error('Hay fragmentos en compases eliminados. Recupera el compás antes de continuar.');
      music.measures.length = song.notas.length;
      music.meterEvents = music.meterEvents.filter(e => !deleted.has(e.measureId));
    }
    while (music.measures.length < song.notas.length) {
      music.measures.push({ id: token('m'), displayNumber: music.measures.length + 1 });
    }
    return music;
  }
  // La lectura del reloj y las validaciones nunca reconcilian ni alteran datos.
  function readModel(song) {
    const m = song && song.musica;
    if (!m || m.schemaVersion !== 2 || m.resolutionPPQ !== PPQ ||
        !Array.isArray(song.notas) || !song.notas.length ||
        !Array.isArray(m.measures) || !Array.isArray(m.meterEvents) ||
        !Array.isArray(m.fragments)) throw Error('Modelo musical v2 inválido.');
    if (m.measures.length !== song.notas.length) throw Error('Compases desincronizados: requiere reconciliación explícita.');
    const ids = new Set();
    for (const measure of m.measures) {
      if (!measure || typeof measure.id !== 'string' || !measure.id || ids.has(measure.id))
        throw Error('Identificador de compás inválido o duplicado.');
      ids.add(measure.id);
    }
    const changes = new Set();
    for (const event of m.meterEvents) {
      if (!event || !ids.has(event.measureId) || changes.has(event.measureId))
        throw Error('Cambio de métrica huérfano o duplicado.');
      parseMeter(event.numerator + '/' + event.denominator);
      changes.add(event.measureId);
    }
    return m;
  }
  function timeline(song, options = {}) {
    const music = options.readOnly ? readModel(song) : ensure(song);
    const changes = new Map(music.meterEvents.map(e => [e.measureId, e]));
    const fallback = parseMeter(song.estudio && song.estudio.meter);
    let meter = fallback, startTick = 0;
    return music.measures.map((measure, index) => {
      if (changes.has(measure.id)) meter = parseMeter(changes.get(measure.id).numerator + '/' + changes.get(measure.id).denominator);
      const out = {
        id: measure.id, index, displayNumber: measure.displayNumber,
        startTick, numerator: meter.numerator, denominator: meter.denominator,
        pulseTicks: pulseTicks(meter), durationTicks: durationTicks(meter)
      };
      startTick += out.durationTicks;
      return out;
    });
  }
  function absolute(song, position) {
    const measure = timeline(song).find(m => m.id === position.measureId);
    if (!measure || !integer(position.tick) || position.tick > measure.durationTicks) throw Error('Posición musical inválida.');
    return measure.startTick + position.tick;
  }
  function fromAbsolute(song, tick) {
    const measures = timeline(song);
    if (!integer(tick)) throw Error('Tick inválido.');
    const measure = measures.find(m => tick < m.startTick + m.durationTicks) || (tick === measures.at(-1).startTick + measures.at(-1).durationTicks ? measures.at(-1) : null);
    if (!measure) throw Error('Posición fuera de la canción.');
    return { measureId: measure.id, tick: tick - measure.startTick };
  }
  function createFragment(song, opts) {
    const music = ensure(song);
    const measures = timeline(song);
    const idx = integer(opts && opts.measureIndex) ? opts.measureIndex : 0;
    const measure = measures[idx];
    if (!measure) throw Error('Compás fuera de rango.');
    const mode = opts && opts.mode || 'rhythm';
    if (!['rhythm', 'melody', 'percussion'].includes(mode)) throw Error('Modalidad inválida.');
    const id = token('fragment');
    const fragment = {
      id, name: String(opts && opts.name || 'Fragmento musical').trim().slice(0, 100),
      mode, instrumentId: mode === 'percussion' ? 'drums' : mode === 'melody' ? 'piano' : null,
      start: { measureId: measure.id, tick: 0 },
      end: { measureId: measure.id, tick: measure.durationTicks },
      events: [],
      comments: '',
      keySignature: { mode: 'inherit' },
      keyChanges: []
    };
    music.fragments.push(fragment);
    return fragment;
  }
  function fragmentById(song, id) {
    return ensure(song).fragments.find(f => f.id === id) || null;
  }
  function checkEvent(song, fragment, value) {
    const start = absolute(song, { measureId: value.measureId, tick: value.tick });
    const measures = timeline(song), measure = measures.find(m => m.id === value.measureId);
    const duration = Number(value.durationTicks);
    if (!measure || !integer(value.tick) || !integer(duration, 1) ||
        value.tick + duration > measure.durationTicks || ![1, 2].includes(value.voice) ||
        !['note', 'rest'].includes(value.kind)) throw Error('Figura o duración inválida para el compás.');
    if (value.kind === 'note') {
      if (fragment.mode === 'melody' && (!integer(value.pitch, 0) || value.pitch > 127)) throw Error('Altura MIDI inválida.');
      if (fragment.mode === 'percussion' && !/^[a-z0-9-]{1,40}$/.test(String(value.instrumentId || ''))) throw Error('Instrumento inválido.');
    }
    const lo = absolute(song, fragment.start), hi = absolute(song, fragment.end);
    if (start < lo || start + duration > hi) throw Error('La figura queda fuera de los límites del fragmento.');
    return { start, end: start + duration };
  }
  function addEvent(song, fragmentId, draft) {
    const fragment = fragmentById(song, fragmentId);
    if (!fragment) throw Error('Fragmento inexistente.');
    const event = {
      id: token('evt'),
      kind: draft.kind || 'note',
      measureId: draft.measureId, tick: Number(draft.tick),
      durationTicks: Number(draft.durationTicks), voice: Number(draft.voice || 1)
    };
    if (event.kind === 'note' && fragment.mode === 'melody') event.pitch = Number(draft.pitch);
    if (event.kind === 'note' && fragment.mode === 'percussion') event.instrumentId = String(draft.instrumentId || 'kick');
    const span = checkEvent(song, fragment, event);
    for (const existing of fragment.events) {
      if (existing.voice !== event.voice || existing.id === event.id) continue;
      const other = checkEvent(song, fragment, existing);
      const overlap = span.start < other.end && other.start < span.end;
      const chord = span.start === other.start && span.end === other.end &&
        existing.kind === 'note' && event.kind === 'note' &&
        ((fragment.mode === 'melody' && event.pitch !== existing.pitch) ||
         (fragment.mode === 'percussion' && event.instrumentId !== existing.instrumentId));
      if (overlap && !chord) throw Error('La figura se superpone a otra de la misma voz.');
    }
    fragment.events.push(event);
    fragment.events.sort((a, b) => absolute(song, a) - absolute(song, b) || a.voice - b.voice);
    return event;
  }
  function removeEvent(song, fragmentId, eventId) {
    const fragment = fragmentById(song, fragmentId);
    if (!fragment) return false;
    const before = fragment.events.length;
    fragment.events = fragment.events.filter(event => event.id !== eventId);
    return fragment.events.length !== before;
  }
  function setMeterAtSection(song, sectionId, meter) {
    const music = ensure(song);
    const section = (song.secciones || []).find(s => s.id === sectionId);
    if (!section || !integer(section.desde, 1)) throw Error('Sección inexistente.');
    const parsed = parseMeter(meter);
    const measure = music.measures[section.desde - 1];
    if (!measure) throw Error('Compás inexistente.');
    const oldEvents = clone(music.meterEvents);
    const collision = music.meterEvents.find(e => e.measureId === measure.id);
    if (collision) {
      collision.numerator = parsed.numerator;
      collision.denominator = parsed.denominator;
    } else {
      music.meterEvents.push({ measureId: measure.id, numerator: parsed.numerator, denominator: parsed.denominator });
    }
    const errors = validate(song);
    if (errors.length) {
      music.meterEvents = oldEvents;
      throw Error('La métrica requiere revisión de fragmentos: ' + errors.join('; '));
    }
  }
  function validate(song) {
    try {
      // Validar no habilita el editor ni modifica compases heredados.
      if (!song || !Array.isArray(song.notas) || !song.notas.length) return ['Canción inválida.'];
      if (!song.musica) { parseMeter(song.estudio && song.estudio.meter); return []; }
      const music = readModel(song), measures = timeline(song, {readOnly:true});
      const ids = new Set(measures.map(m => m.id));
      const errors = [], fragmentIds = new Set(), eventIds = new Set();
      for (const fragment of music.fragments) {
        if (!fragment || typeof fragment.id !== 'string' || !fragment.id || fragmentIds.has(fragment.id)) {
          errors.push('Identificador de fragmento inválido o duplicado.'); continue;
        }
        fragmentIds.add(fragment.id);
        if (!['rhythm','melody','percussion'].includes(fragment.mode) || !Array.isArray(fragment.events)) {
          errors.push('Modalidad o eventos inválidos en ' + fragment.name); continue;
        }
        if (!ids.has(fragment.start && fragment.start.measureId) || !ids.has(fragment.end && fragment.end.measureId)) {
          errors.push('Referencias inexistentes en ' + fragment.name); continue;
        }
        try {
          if (absolute(song, fragment.start) >= absolute(song, fragment.end)) {
            errors.push('Límites inválidos en ' + fragment.name); continue;
          }
        } catch (e) { errors.push(fragment.name + ': ' + e.message); continue; }
        const spans = [];
        for (const event of fragment.events) {
          if (!event || typeof event.id !== 'string' || !event.id || eventIds.has(event.id)) {
            errors.push('Identificador de evento inválido o duplicado en ' + fragment.name); continue;
          }
          eventIds.add(event.id);
          try {
            const span = checkEvent(song, fragment, event);
            for (const prior of spans) {
              const other = prior.event;
              if (other.voice !== event.voice || span.start >= prior.end || prior.start >= span.end) continue;
              const chord = span.start === prior.start && span.end === prior.end &&
                event.kind === 'note' && other.kind === 'note' &&
                ((fragment.mode === 'melody' && event.pitch !== other.pitch) ||
                 (fragment.mode === 'percussion' && event.instrumentId !== other.instrumentId));
              if (!chord) errors.push('Figuras superpuestas en ' + fragment.name);
            }
            spans.push({...span,event});
          } catch (e) { errors.push(fragment.name + ': ' + e.message); }
        }
      }
      const overrides = music.accentOverrides ?? {};
      if (typeof overrides !== 'object' || Array.isArray(overrides)) errors.push('Acentos inválidos.');
      else for (const [id, accents] of Object.entries(overrides)) {
        const measure = measures.find(m => m.id === id);
        if (!measure || !Array.isArray(accents) ||
            accents.some(n => !integer(n,1) || n > measure.numerator) ||
            new Set(accents).size !== accents.length) errors.push('Acentos inválidos en compás ' + id);
      }
      return errors;
    } catch (e) { return [e.message]; }
  }
  const api = { PPQ, clone, parseMeter, durationTicks, pulseTicks, create, ensure, timeline, absolute, fromAbsolute, createFragment, fragmentById, addEvent, removeEvent, setMeterAtSection, validate };
  root.MetriqaMusicCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
