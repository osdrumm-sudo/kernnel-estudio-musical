/* Metrónomo de sala. El audio se genera en cada dispositivo. */
(function(root){
  'use strict';

  const meters = new Set(['2/4', '3/4', '4/4', '6/8', '9/8', '12/8']);
  const lookahead = 110;
  const schedulingMargin = 8;

  function gridFor(transport, meter) {
    if (!transport || !meters.has(meter)) return null;
    const {mode, bpm, from, to, loop, startBeat, startsAt} = transport;
    if (!['ready', 'playing', 'paused'].includes(mode) || !Number.isFinite(bpm) ||
        bpm < 30 || bpm > 300 || !Number.isInteger(from) || !Number.isInteger(to) ||
        from < 1 || to < from || to > 256 || typeof loop !== 'boolean') return null;

    const beats = Number(meter.split('/')[0]);
    const total = (to - from + 1) * beats;
    if (!Number.isInteger(startBeat) || startBeat < 0 || startBeat >= total ||
        !Number.isSafeInteger(startsAt) || startsAt < 0) return null;

    return {mode, from, loop, startBeat, startsAt, beats, total, period: 60000 / bpm,
      key: [mode, bpm, from, to, loop, startBeat, startsAt, meter].join(':')};
  }

  function atPosition(grid, now) {
    const playing = grid.mode === 'playing';
    const waiting = playing && now < grid.startsAt;
    const elapsedBeats = playing && !waiting ? Math.floor((now - grid.startsAt) / grid.period) : 0;
    const absolute = grid.startBeat + elapsedBeats;
    const ended = playing && !grid.loop && absolute >= grid.total;
    const index = grid.loop ? absolute % grid.total : Math.min(absolute, grid.total - 1);
    return {
      measure: grid.from + Math.floor(index / grid.beats),
      beat: index % grid.beats,
      index,
      waiting,
      ended
    };
  }

  function position(transport, meter, serverNow) {
    const grid = gridFor(transport, meter);
    return grid && Number.isFinite(serverNow) ? atPosition(grid, serverNow) : null;
  }

  function create({tick, onError = () => {}}) {
    let grid = null;
    let offset = 0;
    let timer = null;
    let audio = null;
    let reported = null;
    let scheduled = -1;
    const voices = new Set();

    function stopTimer() {
      if (timer === null) return;
      root.clearInterval(timer);
      timer = null;
    }

    function mutePending() {
      for (const voice of voices) {
        voice.source.onended = null;
        try { voice.source.stop(); } catch {}
        voice.source.disconnect();
        voice.gain.disconnect();
      }
      voices.clear();
    }

    function click(at, accent) {
      const source = audio.createOscillator();
      const gain = audio.createGain();
      const voice = {source, gain};
      source.frequency.value = accent ? 1250 : 850;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(accent ? 0.17 : 0.1, at + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.045);
      source.connect(gain);
      gain.connect(audio.destination);
      source.onended = () => {
        voices.delete(voice);
        source.disconnect();
        gain.disconnect();
      };
      source.start(at);
      source.stop(at + 0.05);
      voices.add(voice);
    }

    function sample() {
      const current = grid;
      if (!current) return;
      const now = Date.now() + offset;
      const next = atPosition(current, now);
      const key = [next.index, next.waiting, next.ended].join(':');
      if (key !== reported) {
        reported = key;
        tick(next);
      }
      if (grid !== current) return;
      if (next.ended) {
        stopTimer();
        return;
      }
      if (current.mode !== 'playing' || audio?.state !== 'running') return;

      // Medir juntos los relojes después de actualizar la interfaz.
      const audioTime = audio.currentTime;
      const serverNow = Date.now() + offset;
      const firstFuture = current.startBeat + Math.ceil((serverNow + schedulingMargin - current.startsAt) / current.period);
      const pulse = Math.max(current.startBeat, firstFuture, scheduled + 1);
      if (!current.loop && pulse >= current.total) return;
      const delay = current.startsAt + (pulse - current.startBeat) * current.period - serverNow;
      if (delay > lookahead) return;

      try {
        click(audioTime + delay / 1000, pulse % current.beats === 0);
        scheduled = pulse;
      } catch (error) {
        mutePending();
        audio.close?.().catch(() => {});
        audio = null;
        onError(error);
      }
    }

    function stop() {
      stopTimer();
      mutePending();
      grid = null;
      reported = null;
      scheduled = -1;
    }

    function set(transport, meter, offsetMs = 0) {
      const next = gridFor(transport, meter);
      if (!next || !Number.isFinite(offsetMs)) {
        stop();
        return false;
      }
      if (grid?.key === next.key && offset === offsetMs) return true;
      stop();
      grid = next;
      offset = offsetMs;
      if (next.mode === 'playing') timer = root.setInterval(sample, 25);
      sample();
      return true;
    }

    async function enableAudio() {
      try {
        if (!audio) {
          const Audio = root.AudioContext || root.webkitAudioContext;
          if (!Audio) throw new Error('Este navegador no admite el audio del metrónomo.');
          audio = new Audio();
        }
        if (audio.state !== 'running') await audio.resume();
        if (audio.state !== 'running') throw new Error('No se pudo activar el audio del metrónomo.');
        sample();
        return true;
      } catch (error) {
        onError(error);
        return false;
      }
    }

    return Object.freeze({set, enableAudio, stop});
  }

  const api = Object.freeze({position, create});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KernnelRoomClock = api;
})(typeof window === 'undefined' ? globalThis : window);
