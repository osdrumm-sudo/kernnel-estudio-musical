/* Presenta las anotaciones de la partitura sin modificar la canción. */
'use strict';

const studyComments = (() => {
  const score = document.getElementById('score');
  const popup = document.getElementById('study-comment-popup');
  const transport = document.querySelector('.transport');
  const touch = matchMedia('(pointer: coarse)');
  const selector = '[data-study-note],[data-study-measure]';
  let manual = null;
  let playback = [];
  let visible = [];
  let visibleImage = null;
  let dismissed = null;
  let hideTimer;

  function targetFor(element, wholeMeasure = false) {
    if (!element || !score.contains(element)) return null;
    return element.closest?.(selector)
      ?? (wholeMeasure ? element.closest?.('.measure')?.querySelector('[data-study-measure]') : null);
  }

  function position() {
    if (popup.hidden) return;
    const margin = 8;
    const anchor = visibleImage ? null : manual?.anchor ?? (!touch.matches ? visible.at(-1) : null);
    const bounds = anchor?.getBoundingClientRect();
    const width = popup.offsetWidth, height = popup.offsetHeight;
    let left = (innerWidth - width) / 2;
    let top = visibleImage ? (innerHeight - height) / 2 : innerHeight - height - margin;
    if (bounds && bounds.bottom > 0 && bounds.top < innerHeight) {
      left = bounds.left + (bounds.width - width) / 2;
      const above = bounds.top - height - margin;
      top = above >= margin ? above : bounds.bottom + margin;
    } else if (!visibleImage && !anchor && getComputedStyle(transport).position === 'fixed') {
      top = transport.getBoundingClientRect().top - height - margin;
    }
    popup.style.left = `${Math.max(margin, Math.min(left, innerWidth - width - margin))}px`;
    popup.style.top = `${Math.max(margin, Math.min(top, innerHeight - height - margin))}px`;
  }

  function render() {
    if (manual && !score.contains(manual.anchor)) manual = null;
    const anchors = manual ? [manual.anchor] : playback;
    const next = anchors.filter(anchor => anchor !== dismissed && score.contains(anchor));
    const image = manual?.kind === 'tap' && next.length ? manual.anchor.querySelector('img') : null;
    if (image === visibleImage && next.length === visible.length && next.every((anchor, i) => anchor === visible[i])) {
      if (manual && visible.length) manual.anchor.setAttribute('aria-describedby', popup.id);
      else if (visible.length === 1) visible[0].removeAttribute('aria-describedby');
      return;
    }
    for (const anchor of visible) anchor.removeAttribute('aria-describedby');
    visible = next;
    visibleImage = image;
    popup.classList.toggle('study-comment-popup-with-image', Boolean(image));
    popup.replaceChildren();
    for (const anchor of visible) {
      const number = anchor.closest('.measure').dataset.measure;
      const beat = anchor.dataset.beat;
      const heading = document.createElement('strong');
      heading.textContent = beat === undefined ? `Compás ${number}`
        : `Compás ${number} · Pulso ${Number(beat) + 1}`;
      popup.append(heading);
      const comment = anchor.dataset.studyNote ?? anchor.dataset.studyMeasure;
      if (comment || !image) {
        const text = document.createElement('p');
        text.textContent = comment || 'Pulsa la nota para ver la imagen adjunta.';
        popup.append(text);
      }
    }
    if (image) {
      const preview = image.cloneNode();
      preview.alt = 'Imagen adjunta a la nota';
      preview.addEventListener('load', position, { once: true });
      popup.append(preview);
    }
    if (manual && visible.length) manual.anchor.setAttribute('aria-describedby', popup.id);
    popup.hidden = !visible.length;
    popup.scrollTop = 0;
    position();
  }

  function select(anchor, kind) {
    clearTimeout(hideTimer);
    dismissed = null;
    manual = { anchor, kind };
    render();
  }

  function clearManual() {
    clearTimeout(hideTimer);
    manual = null;
    render();
  }

  function hideHoverSoon() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (manual?.kind === 'hover') clearManual();
    }, 160);
  }

  score.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch' || manual?.kind === 'tap') return;
    const anchor = targetFor(event.target, true);
    if (anchor && anchor !== targetFor(event.relatedTarget, true)) select(anchor, 'hover');
  });
  score.addEventListener('pointerout', event => {
    if (manual?.kind !== 'hover') return;
    if (targetFor(event.relatedTarget, true) !== manual.anchor) hideHoverSoon();
  });
  popup.addEventListener('pointerenter', () => clearTimeout(hideTimer));
  popup.addEventListener('pointerleave', event => {
    if (manual?.kind === 'hover' && targetFor(event.relatedTarget, true) !== manual.anchor) hideHoverSoon();
  });
  score.addEventListener('focusin', event => {
    const anchor = targetFor(event.target);
    if (anchor?.matches(':focus-visible')) select(anchor, 'focus');
  });
  score.addEventListener('focusout', event => {
    if (manual?.kind === 'focus' && event.target === manual.anchor) clearManual();
  });
  score.addEventListener('click', event => {
    const anchor = targetFor(event.target);
    if (!anchor) return;
    if (manual?.kind === 'tap' && manual.anchor === anchor) clearManual();
    else select(anchor, 'tap');
  });
  document.addEventListener('pointerdown', event => {
    if (manual && !popup.contains(event.target) && targetFor(event.target, true) !== manual.anchor) {
      clearManual();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || popup.hidden || document.querySelector('dialog[open]')) return;
    dismissed = visible.at(-1);
    playback = [];
    clearManual();
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, { capture: true, passive: true });

  return {
    update(measure, beat, stationary) {
      const annotatedBeat = beat?.dataset.studyNote ? beat : null;
      playback = measure && (touch.matches || stationary)
        ? [measure.querySelector('[data-study-measure]'), annotatedBeat].filter(Boolean)
        : [];
      if (dismissed && !playback.includes(dismissed) && manual?.anchor !== dismissed) dismissed = null;
      render();
    },
    reset() {
      playback = [];
      dismissed = null;
      clearManual();
    }
  };
})();
