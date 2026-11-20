'use strict';

(() => {
  const title = document.getElementById('desktop-study-title');
  const repertoire = document.getElementById('desktop-study-repertoire');
  const index = document.getElementById('desktop-study-index');
  const list = document.getElementById('desktop-study-sections');
  const empty = document.getElementById('desktop-study-no-sections');
  const position = document.getElementById('desktop-study-position');
  const meter = document.getElementById('desktop-study-progress');
  const percent = document.getElementById('desktop-study-percent');
  const score = document.getElementById('score');
  let measure = null;
  let loop = '';

  function updateProgress() {
    const song = ui.study ? current() : null;
    if (!song) return;
    const progress = window.KernnelStudyData.progress(song.id, activeStudyMeasureKeys(song));
    meter.max = song.notas.length;
    meter.value = progress.studied;
    percent.textContent = progress.percent.toLocaleString('es-CL') + ' %';
  }

  function highlight(scoreRebuilt = false) {
    const song = ui.study ? current() : null;
    if (!song) return;

    const nextLoop = clock.loop ? clock.playStart + ':' + clock.playEnd : '';
    if (scoreRebuilt || loop !== nextLoop) {
      loop = nextLoop;
      for (const element of score.querySelectorAll('.measure[data-measure]')) {
        const number = Number(element.dataset.measure);
        element.toggleAttribute('data-desktop-loop', clock.loop && number >= clock.playStart && number <= clock.playEnd);
      }
    }

    const next = clock.visualMeasure || clock.playStart;
    if (measure === next) return;
    measure = next;
    position.textContent = 'Compás ' + next + ' de ' + song.notas.length;
    const sections = [...list.querySelectorAll('button')];
    const visible = sections.find(button => next >= Number(button.dataset.start) && next <= Number(button.dataset.end));
    for (const button of sections) {
      if (button === visible) button.setAttribute('aria-current', 'location');
      else button.removeAttribute('aria-current');
    }
  }

  function render() {
    const song = ui.study ? current() : null;
    if (!song) return;
    title.textContent = song.nombre;
    const source = D.repertorios.find(item => item.id === originForSongV2(song.id));
    repertoire.textContent = source?.nombre || 'Canciones sin repertorio';
    const sections = [...(song.secciones || [])].sort((left, right) => left.desde - right.desde || left.hasta - right.hasta);
    list.replaceChildren();
    empty.hidden = sections.length > 0;
    for (const section of sections) {
      const range = section.desde === section.hasta ? String(section.desde) : section.desde + '–' + section.hasta;
      const button = mk('button', {
        type: 'button',
        'data-start': section.desde,
        'data-end': section.hasta,
        'aria-label': section.nombre + ', compases ' + range
      }, [
        mk('span', { class: 'desktop-section-color', 'aria-hidden': 'true' }),
        mk('span', { class: 'desktop-section-name', text: section.nombre }),
        mk('small', { class: 'desktop-section-range', text: range })
      ]);
      button.style.setProperty('--section-color', section.color);
      list.append(mk('li', {}, [button]));
    }
    measure = null;
    loop = null;
    highlight();
    updateProgress();
  }

  index.addEventListener('click', event => {
    const button = event.target.closest('button[data-start]');
    if (button && ui.study) seekStudyMeasure(Number(button.dataset.start), clock.playing);
  });

  window.addEventListener('kernnel-study-data-updated', updateProgress);
  window.MetriqaDesktopStudy = Object.freeze({ render, highlight });
})();
