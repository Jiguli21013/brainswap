'use strict';
const $ = id => document.getElementById(id);
// Excluded from the displayed deck at the project owner's request; canonical IDs remain stable.
const excludedCardIds = new Set([478, 492]);
let collection = [], deck = [], cursor = 0, history = [], position = -1;
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function newDeck() {
  deck = shuffle(collection.map((_, i) => i));
  if (deck.length > 1 && collection[deck[0]].id === history[position]?.id)
    [deck[0], deck[1]] = [deck[1], deck[0]];
  cursor = 0;
}
function fallbackImage() {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 900"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#013BA7"/><stop offset="1" stop-color="#04B8EB"/></linearGradient></defs><rect width="700" height="900" fill="url(#g)"/><circle cx="350" cy="335" r="120" fill="#2EEBE0" opacity=".35"/><path d="M115 800 Q120 500 350 500 Q580 500 585 800" fill="#2EEBE0" opacity=".35"/><text x="350" y="100" text-anchor="middle" font-family="Arial" font-size="26" fill="white">Image unavailable</text></svg>');
}
function safeUrl(value) {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}
function fillList(id, entries) {
  $(id).replaceChildren(...entries.map(text => {
    const li = document.createElement('li'); li.textContent = text; return li;
  }));
  $(id).closest('section').hidden = entries.length === 0;
}
function render(p, initialAnimation = true) {
  $('card').classList.remove('fade');
  if (initialAnimation) { void $('card').offsetWidth; $('card').classList.add('fade'); }
  $('name').textContent = p.name; $('role').textContent = p.role;
  $('bio').textContent = p.biography || ''; $('bio').hidden = !p.biography;
  $('question').textContent = p.question;
  $('traits').replaceChildren(...p.adjectives.map(text => {
    const span = document.createElement('span'); span.className = 'trait'; span.textContent = text; return span;
  }));
  fillList('works', p.notableWorks); fillList('facts', p.interestingFacts);
  showCardImage(p);
  $('counter').textContent = `${position + 1} seen · ${collection.length} in collection`;
  $('previous').disabled = position <= 0;
  $('review-status').textContent = p.verificationStatus === 'verified' ? '' : 'Content review in progress';
  const source = safeUrl(p.sources[0]); const link = $('source');
  link.hidden = !source; if (source) link.href = source; else link.removeAttribute('href');
  if (typeof scheduleViewportFit === 'function') scheduleViewportFit();
}
function displayNavigationCard(card, direction) {
  if (typeof animateCardNavigation === 'function') animateCardNavigation(() => render(card, false), direction);
  else render(card);
}
function next(direction = 'next') {
  if (!collection.length) return;
  if (position < history.length - 1) { position++; displayNavigationCard(history[position], direction); return; }
  if (cursor >= deck.length) newDeck();
  history.push(collection[deck[cursor++]]); position++; displayNavigationCard(history[position], direction);
}
function prev() { if (position > 0) { position--; displayNavigationCard(history[position], 'previous'); } }
$('next').onclick = () => next('random'); $('previous').onclick = prev;
document.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey || e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
});
async function start() {
  $('next').disabled = true; $('previous').disabled = true;
  try {
    const response = await fetch('data/cards.json'); if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length !== 594 || !data.every((c,i) => c.id === i+1 && typeof c.name === 'string' && Array.isArray(c.adjectives) && Array.isArray(c.notableWorks) && Array.isArray(c.interestingFacts) && Array.isArray(c.sources))) throw new Error('Invalid card dataset');
    collection = data.filter(card => !excludedCardIds.has(card.id)); newDeck(); history.push(collection[deck[cursor++]]); position++; render(history[position]); $('next').disabled = false;
  } catch (error) {
    $('counter').textContent = 'Cards could not be loaded';
    $('bio').textContent = location.protocol === 'file:' ? 'Open this website through a local web server. See README.md for instructions.' : 'The card data could not be loaded. Please refresh or check the website files.';
    console.error(error);
    if (typeof scheduleViewportFit === 'function') scheduleViewportFit();
  }
}
start();
