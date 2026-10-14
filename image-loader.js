'use strict';
const imageCacheKey = 'brainswap:wikipedia-images:v1';
const imageCacheLifetime = 30 * 24 * 60 * 60 * 1000;
const wikipediaImageCache = new Map();
const pendingWikipediaImages = new Map();
const wikipediaImageFailures = new Map();
const observedCardImages = new Map();
// Keep only a few successfully decoded images for instant back/forward navigation.
const decodedCardImages = new Map();
function rememberDecodedImage(url, image) {
  decodedCardImages.delete(url); decodedCardImages.set(url, image);
  while (decodedCardImages.size > 6) decodedCardImages.delete(decodedCardImages.keys().next().value);
}
let wikipediaCooldownUntil = 0;
let imageRenderGeneration = 0;
let cancelImageAttempt = null;
let activeImageCardId = null;
let currentImageLoading = false;
function imageHttpsUrl(value, wikimediaOnly = false) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    if (wikimediaOnly && !['upload.wikimedia.org', 'thumb.wikimedia.org'].includes(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}
function imageSourceUrl(value) {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}
function imageTitleKey(title) { return typeof title === 'string' ? title.trim().replace(/_/g, ' ') : ''; }
function persistWikipediaImages() {
  try { localStorage.setItem(imageCacheKey, JSON.stringify({entries:Object.fromEntries(wikipediaImageCache)})); }
  catch { /* Private browsing, disabled storage, or quota errors must not block images. */ }
}
try {
  const saved = JSON.parse(localStorage.getItem(imageCacheKey) || '{}');
  for (const [title, entry] of Object.entries(saved.entries || {})) {
    if (entry && imageHttpsUrl(entry.url, true) && Date.now() - entry.savedAt >= 0 && Date.now() - entry.savedAt < imageCacheLifetime)
      wikipediaImageCache.set(title, entry);
  }
} catch { /* Ignore corrupted or unavailable storage. */ }
function cachedWikipediaImage(title) {
  const entry = wikipediaImageCache.get(title);
  if (entry && Date.now() - entry.savedAt < imageCacheLifetime) return {...entry, cached:true};
  wikipediaImageCache.delete(title);
  return null;
}
function forgetWikipediaImage(title) { wikipediaImageCache.delete(title); persistWikipediaImages(); }
function rememberWikipediaImage(title, candidate, loadedUrl) {
  wikipediaImageCache.set(title, {...candidate, url:loadedUrl, savedAt:Date.now()});
  persistWikipediaImages();
}
function deferWikipediaTitle(title, reason, duration) {
  wikipediaImageFailures.set(title, {reason, until:Date.now() + duration});
}
async function requestWikipediaImage(wikiTitle) {
  const title = imageTitleKey(wikiTitle);
  if (!title) return null;
  const cached = cachedWikipediaImage(title);
  if (cached) return cached;
  if (Date.now() < wikipediaCooldownUntil || Date.now() < (wikipediaImageFailures.get(title)?.until || 0)) return null;
  if (pendingWikipediaImages.has(title)) return pendingWikipediaImages.get(title);
  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      // Anonymous CORS GET requests work from both localhost and GitHub Pages.
      const params = new URLSearchParams({action:'query',format:'json',formatversion:'2',origin:'*',redirects:'1',titles:title,prop:'pageimages|info|pageprops',inprop:'url',ppprop:'disambiguation',piprop:'thumbnail|original|name',pithumbsize:'800',pilicense:'any'});
      const response = await fetch('https://en.wikipedia.org/w/api.php?' + params, {credentials:'omit',signal:controller.signal});
      if (response.status === 429) {
        const retry = response.headers?.get('Retry-After');
        const seconds = Number(retry);
        const retryDate = Date.parse(retry || '');
        const delay = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : Number.isFinite(retryDate) ? retryDate - Date.now() : 60000;
        wikipediaCooldownUntil = Date.now() + Math.max(30000, delay);
        deferWikipediaTitle(title, 'rate_limited', Math.max(30000, delay));
        return null;
      }
      if (!response.ok) throw new Error('Wikipedia API request failed');
      const payload = await response.json();
      if (payload.error) {
        if (['ratelimited','maxlag'].includes(payload.error.code)) wikipediaCooldownUntil = Date.now() + 60000;
        throw new Error('Wikipedia API error');
      }
      const page = payload.query?.pages?.[0];
      if (!page || page.missing || page.invalid || page.pageprops?.disambiguation !== undefined) {
        deferWikipediaTitle(title, 'missing_or_ambiguous_article', 24 * 60 * 60 * 1000); return null;
      }
      const url = imageHttpsUrl(page.thumbnail?.source, true) || imageHttpsUrl(page.original?.source, true);
      if (!url || /logo|wordmark|signature/i.test(page.pageimage || '')) {
        deferWikipediaTitle(title, 'no_suitable_lead_image', 24 * 60 * 60 * 1000); return null;
      }
      return {url,originalUrl:imageHttpsUrl(page.original?.source, true),source:imageSourceUrl(page.fullurl) || 'https://en.wikipedia.org/wiki/' + encodeURIComponent((page.title || title).replace(/ /g, '_')),fileTitle:page.pageimage || null};
    } catch {
      deferWikipediaTitle(title, 'network_or_api_error', 60000); return null;
    } finally { clearTimeout(timeout); }
  })();
  pendingWikipediaImages.set(title, request);
  try { return await request; }
  finally { pendingWikipediaImages.delete(title); }
}
function refitImageContent() { if (typeof scheduleViewportFit === 'function') scheduleViewportFit(); }
function appendImageLink(text, href) {
  const url = imageSourceUrl(href);
  if (!url) return;
  const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
  link.style.color = 'var(--link)'; link.textContent = text;
  document.getElementById('image-credit').append(link);
}
function appendStoredAttribution(card, historical = false) {
  const credit = document.getElementById('image-credit');
  const a = card.imageAttribution;
  if (historical && (a || card.imageSource)) credit.append(document.createTextNode(' · Stored image record: '));
  const artist = typeof a === 'string' ? a : a?.artist;
  if (imageSourceUrl(card.imageSource)) appendImageLink(artist || 'Image source', card.imageSource);
  else if (artist) credit.append(document.createTextNode(artist));
  if (a && typeof a === 'object') {
    if (a.license) {
      credit.append(document.createTextNode(' · '));
      if (imageSourceUrl(a.licenseUrl)) appendImageLink(a.license, a.licenseUrl);
      else credit.append(document.createTextNode(a.license));
    }
    if (a.changes) credit.append(document.createTextNode(' · ' + a.changes));
    if (a.restrictions) credit.append(document.createTextNode(' · ' + a.restrictions));
  }
}
function setImageCredit(card, kind, candidate) {
  const credit = document.getElementById('image-credit'); credit.replaceChildren();
  if (kind === 'wikipedia') {
    credit.append(document.createTextNode('Unverified Wikipedia image — reuse rights and identity have not been checked. '));
    appendImageLink('Wikipedia image source ↗', candidate.source);
    if (candidate.fileTitle) {
      credit.append(document.createTextNode(' · '));
      const wiki = candidate.url.includes('/commons/') ? 'https://commons.wikimedia.org/wiki/' : 'https://en.wikipedia.org/wiki/';
      appendImageLink('Image file / rights ↗', wiki + encodeURIComponent('File:' + candidate.fileTitle.replace(/^File:/, '')));
    }
    appendStoredAttribution(card, true);
  } else {
    if (!['metadata_verified_visual_check_pending','metadata_and_visually_verified'].includes(card.imageVerificationStatus))
      credit.append(document.createTextNode('Unverified stored image — reuse rights and identity have not been checked. '));
    appendStoredAttribution(card);
  }
  if (card.imageIssue?.reason) credit.append(document.createTextNode(' · Stored image note: ' + card.imageIssue.reason));
  refitImageContent();
}
function tryImageUrl(url) {
  const cached = decodedCardImages.get(url);
  if (cached?.naturalWidth > 0 && cached.complete) return Promise.resolve(true);
  return new Promise(resolve => {
    const probe = new Image();
    let settled = false;
    const finish = result => {
      if (settled) return;
      settled = true; clearTimeout(timeout); probe.onload = null; probe.onerror = null;
      if (cancelImageAttempt === cancel) cancelImageAttempt = null;
      resolve(result);
    };
    const cancel = () => { finish(false); probe.src = ''; };
    const timeout = setTimeout(cancel, 10000);
    cancelImageAttempt = cancel;
    probe.onload = async () => {
      try {
        if (typeof probe.decode === 'function') await probe.decode();
        if (settled) return;
        if (probe.naturalWidth > 0) rememberDecodedImage(url, probe);
        finish(probe.naturalWidth > 0);
      } catch { finish(false); }
    };
    probe.onerror = () => finish(false);
    probe.referrerPolicy = 'no-referrer';
    probe.src = url;
  });
}
function loadingImagePlaceholder() {
  return fallbackImage().replace(encodeURIComponent('Image unavailable'), encodeURIComponent('Loading image…'));
}
function getImageLoadingStats() {
  const counts = {stored:0,wikipedia:0,placeholder:0};
  for (const result of observedCardImages.values()) counts[result.kind]++;
  return {...counts,loading:currentImageLoading ? 1 : 0,currentCardId:activeImageCardId,cardsObserved:observedCardImages.size,scope:'Last completed outcome for each unique card visited in this page session; loading reports the current request separately.'};
}
async function showCardImage(card) {
  activeImageCardId = card.id;
  const generation = ++imageRenderGeneration;
  if (cancelImageAttempt) cancelImageAttempt();
  let img = document.createElement('img');
  img.id = 'portrait'; img.referrerPolicy = 'no-referrer';
  img.dataset.cardId = String(card.id);
  img.dataset.imageState = 'loading';
  // A new element has no previously painted bitmap, even before the SVG decodes.
  const previousImage = document.getElementById('portrait');
  previousImage.onload = null; previousImage.onerror = null;
  previousImage.replaceWith(img);
  const current = () => generation === imageRenderGeneration && activeImageCardId === card.id && document.getElementById('portrait') === img;
  const title = imageTitleKey(card.wikiTitle);
  const tried = new Set();
  img.onload = null; img.onerror = null; img.src = loadingImagePlaceholder(); img.alt = 'Image loading or unavailable for ' + card.name;
  document.getElementById('image-credit').replaceChildren();
  if (imageHttpsUrl(card.imageUrl)) setImageCredit(card, 'stored');
  currentImageLoading = true;
  img.dataset.imageKind = 'loading';
  refitImageContent();
  const commit = (kind, url, candidate) => {
    if (!current()) return;
    observedCardImages.set(card.id, {kind,url});
    currentImageLoading = false;
    const loadedImage = decodedCardImages.get(url);
    if (!loadedImage) return;
    const instant = loadedImage.dataset.cardId !== undefined;
    loadedImage.onload = null; loadedImage.onerror = null;
    loadedImage.id = 'portrait'; loadedImage.referrerPolicy = 'no-referrer';
    loadedImage.dataset.cardId = String(card.id);
    loadedImage.dataset.imageState = 'loaded';
    loadedImage.dataset.imageKind = kind;
    loadedImage.classList.toggle('portrait-arrive', !instant);
    img.replaceWith(loadedImage); img = loadedImage;
    img.alt = 'Image of ' + card.name;
    setImageCredit(card, kind, candidate);
    // Cached image bytes normally serve this assignment. Still handle a display-stage failure.
    img.onerror = () => {
      if (!current()) return;
      img.onerror = null; decodedCardImages.delete(url);
      if (kind === 'stored') void useWikipedia();
      else { forgetWikipediaImage(title); placeholder('wikipedia_image_failed'); }
    };
    // The decoded probe itself is displayed; no second src change can retain old pixels.
  };
  const placeholder = reason => {
    if (!current()) return;
    observedCardImages.set(card.id, {kind:'placeholder',reason});
    currentImageLoading = false;
    img.dataset.imageKind = 'placeholder';
    img.dataset.imageState = 'failed'; img.classList.remove('portrait-arrive');
    img.onerror = null; img.src = fallbackImage(); img.alt = 'Labeled image fallback for ' + card.name;
    document.getElementById('image-credit').replaceChildren();
    // Keep existing rights notes and source metadata even when neither image can load.
    appendStoredAttribution(card);
    if (card.imageIssue?.reason) document.getElementById('image-credit').append(document.createTextNode(' · ' + card.imageIssue.reason));
    refitImageContent();
  };
  const useWikipedia = async () => {
    if (!current()) return;
    currentImageLoading = true;
    img.dataset.imageKind = 'loading';
    const loadingImage = document.createElement('img');
    loadingImage.id = 'portrait'; loadingImage.referrerPolicy = 'no-referrer';
    loadingImage.dataset.cardId = String(card.id); loadingImage.dataset.imageState = 'loading'; loadingImage.dataset.imageKind = 'loading';
    img.onload = null; img.onerror = null; img.replaceWith(loadingImage); img = loadingImage;
    img.src = loadingImagePlaceholder(); img.alt = 'Image loading or unavailable for ' + card.name;
    let candidate = await requestWikipediaImage(title);
    if (!current()) return;
    if (candidate?.cached && tried.has(candidate.url)) { forgetWikipediaImage(title); candidate = await requestWikipediaImage(title); }
    if (candidate) setImageCredit(card, 'wikipedia', candidate);
    for (let pass = 0; candidate && pass < 2; pass++) {
      for (const url of [...new Set([imageHttpsUrl(candidate.url, true),imageHttpsUrl(candidate.originalUrl, true)].filter(Boolean))]) {
        if (!current()) return;
        if (tried.has(url)) continue;
        tried.add(url);
        const loaded = await tryImageUrl(url);
        if (!current()) return;
        if (loaded) { rememberWikipediaImage(title, candidate, url); commit('wikipedia', url, {...candidate,url}); return; }
      }
      if (!candidate.cached) break;
      forgetWikipediaImage(title); candidate = await requestWikipediaImage(title);
      if (!current()) return;
    }
    if (Date.now() >= (wikipediaImageFailures.get(title)?.until || 0)) deferWikipediaTitle(title, 'no_loadable_image', 60000);
    placeholder(wikipediaImageFailures.get(title)?.reason || 'no_wikipedia_image');
  };
  const stored = imageHttpsUrl(card.imageUrl);
  if (stored) {
    tried.add(stored);
    if (decodedCardImages.get(stored)?.complete && decodedCardImages.get(stored)?.naturalWidth > 0) { commit('stored', stored); return; }
    const loaded = await tryImageUrl(stored);
    if (!current()) return;
    if (loaded) { commit('stored', stored); return; }
  }
  await useWikipedia();
}
