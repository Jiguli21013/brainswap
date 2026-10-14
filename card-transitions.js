'use strict';
let cardTransitionVersion = 0;
let cardTransitionTimer = null;
function finishCardTransition() {
  const stage = document.getElementById('card-stage');
  const card = document.getElementById('card');
  if (cardTransitionTimer !== null) clearTimeout(cardTransitionTimer);
  cardTransitionTimer = null;
  stage?.querySelector('.outgoing-card')?.remove();
  stage?.classList.remove('is-transitioning');
  stage?.style.removeProperty('--transition-height');
  card?.classList.remove('card-slide-in');
}
function animateCardNavigation(updateCard, direction = 'next') {
  const stage = document.getElementById('card-stage');
  const card = document.getElementById('card');
  if (!stage || !card) { updateCard(); return; }
  const kind = ['next','previous','random'].includes(direction) ? direction : 'next';
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Keep a same-direction slide already in flight; replace only its incoming content.
  // This avoids jumping back to the entry edge or flashing an empty stage on rapid input.
  if (!reduced && stage.classList.contains('is-transitioning') && stage.dataset.navigation === kind) {
    const priorHeight = card.offsetHeight;
    updateCard();
    stage.style.setProperty('--transition-height', Math.max(priorHeight, card.offsetHeight) + 'px');
    if (typeof scheduleViewportFit === 'function') scheduleViewportFit();
    return;
  }
  const version = ++cardTransitionVersion;
  const currentStyle = getComputedStyle(card);
  const startTransform = currentStyle.transform;
  const startOpacity = currentStyle.opacity;
  const oldHeight = card.offsetHeight;
  finishCardTransition();
  stage.dataset.navigation = kind;
  if (reduced) {
    updateCard(); if (typeof scheduleViewportFit === 'function') scheduleViewportFit(); return;
  }
  const outgoing = card.cloneNode(true);
  outgoing.removeAttribute('id');
  for (const node of outgoing.querySelectorAll('[id]')) node.removeAttribute('id');
  for (const image of outgoing.querySelectorAll('img')) image.classList?.remove('portrait-arrive');
  outgoing.setAttribute('aria-hidden','true'); outgoing.setAttribute('inert','');
  outgoing.classList.remove('fade','card-slide-in'); outgoing.classList.add('outgoing-card');
  outgoing.style.setProperty('--outgoing-start-transform', startTransform === 'none' ? 'translateX(0)' : startTransform);
  outgoing.style.setProperty('--outgoing-start-opacity', startOpacity);
  // Text is updated synchronously. No image/network promise is awaited here.
  updateCard();
  const height = Math.max(oldHeight, card.offsetHeight);
  stage.style.setProperty('--transition-height', height + 'px');
  stage.classList.add('is-transitioning');
  stage.append(outgoing);
  void stage.offsetWidth;
  outgoing.classList.add('card-slide-out'); card.classList.add('card-slide-in');
  if (typeof scheduleViewportFit === 'function') scheduleViewportFit();
  cardTransitionTimer = setTimeout(() => {
    if (version !== cardTransitionVersion) return;
    finishCardTransition();
    if (typeof scheduleViewportFit === 'function') scheduleViewportFit();
  }, 310);
}

if (typeof matchMedia === 'function') {
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', event => {
    if (event.matches) {
      ++cardTransitionVersion; finishCardTransition();
      if (typeof scheduleViewportFit === 'function') scheduleViewportFit();
    }
  });
}
