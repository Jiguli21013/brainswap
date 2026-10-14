'use strict';
// Measure the natural layout, then apply one scale to the entire interface.
// Width candidates allow useful wrapping without shrinking individual sections.
let viewportFitFrame = null;
function fitViewport() {
  const viewport = document.querySelector('.viewport');
  const shell = document.querySelector('.shell');
  if (!viewport || !shell) return;
  const visual = window.visualViewport;
  const width = Math.max(1, Math.min(viewport.clientWidth, visual?.width || viewport.clientWidth));
  const height = Math.max(1, Math.min(viewport.clientHeight, visual?.height || viewport.clientHeight));
  const inset = Math.min(10, width * .015, height * .015);
  const availableWidth = Math.max(1, width - 2 * inset);
  const availableHeight = Math.max(1, height - 2 * inset);
  const candidates = [];
  if (width >= 850) {
    candidates.push({layout: 'wide', width: 1340});
    candidates.push({layout: 'wide', width: Math.min(1340, Math.max(1120, availableWidth))});
  }
  if (width < 1120) {
    const stackedWidth = Math.min(820, Math.max(480, availableWidth));
    candidates.push({layout: 'stacked', width: stackedWidth});
    candidates.push({layout: 'stacked', width: Math.min(820, Math.max(560, availableWidth * 1.45))});
    candidates.push({layout: 'stacked', width: Math.min(820, Math.max(640, availableWidth * 1.65))});
  }
  const stage = document.getElementById?.('card-stage');
  if (stage?.classList.contains('is-transitioning') && shell.dataset.layout) {
    candidates.length = 0;
    candidates.push({layout:shell.dataset.layout, width:Number(shell.style.width.replace('px',''))});
  }
  let best = null;
  const measured = new Set();
  for (const candidate of candidates) {
    const key = `${candidate.layout}:${candidate.width}`;
    if (measured.has(key)) continue;
    measured.add(key);
    shell.dataset.layout = candidate.layout;
    shell.style.width = `${candidate.width}px`;
    const naturalWidth = shell.offsetWidth;
    const naturalHeight = shell.offsetHeight;
    const scale = Math.min(1, availableWidth / Math.max(1, naturalWidth), availableHeight / Math.max(1, naturalHeight));
    if (!best || scale > best.scale) best = {...candidate, scale, naturalWidth, naturalHeight};
  }
  if (!best) return;
  // Round downward so subpixel rounding cannot push content outside the viewport.
  const scale = Math.floor(best.scale * 100000) / 100000;
  shell.dataset.layout = best.layout;
  shell.style.width = `${best.width}px`;
  shell.style.left = `${(visual?.offsetLeft || 0) + width / 2}px`;
  shell.style.top = `${(visual?.offsetTop || 0) + height / 2}px`;
  shell.style.setProperty('--interface-scale', scale);
  shell.dataset.fitScale = String(scale);
  shell.dataset.fit = 'ready';
  if (typeof positionThemeToggle === 'function') positionThemeToggle();
}
function scheduleViewportFit() {
  if (viewportFitFrame !== null) return;
  viewportFitFrame = requestAnimationFrame(() => {
    viewportFitFrame = null;
    fitViewport();
  });
}
window.addEventListener('resize', scheduleViewportFit, {passive: true});
window.visualViewport?.addEventListener('resize', scheduleViewportFit, {passive: true});
window.visualViewport?.addEventListener('scroll', scheduleViewportFit, {passive: true});
// Observe the available space, not the scaled shell, to avoid resize feedback loops.
if (typeof ResizeObserver !== 'undefined') {
  const viewport = document.querySelector('.viewport');
  if (viewport) new ResizeObserver(scheduleViewportFit).observe(viewport);
}
document.fonts?.ready.then(scheduleViewportFit);
scheduleViewportFit();
