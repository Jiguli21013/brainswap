'use strict';
const themeStorageKey = 'brainswap:theme';
let savedTheme = 'dark';
try { if (localStorage.getItem(themeStorageKey) === 'light') savedTheme = 'light'; } catch {}
document.documentElement.dataset.theme = savedTheme;
function positionThemeToggle() {
  const header = document.querySelector('.top');
  const brand = header?.firstElementChild;
  const counter = document.getElementById('counter');
  const toggle = document.getElementById('theme-toggle');
  if (!brand || !counter || !toggle) return;
  const gapCenter = (brand.offsetLeft + brand.offsetWidth + counter.offsetLeft) / 2;
  toggle.style.setProperty('--theme-toggle-x', gapCenter + 'px');
}
function updateThemeButton() {
  const button = document.getElementById('theme-toggle');
  if (!button) return;
  const light = document.documentElement.dataset.theme === 'light';
  const label = light ? 'Switch to dark theme' : 'Switch to light theme';
  button.setAttribute('aria-label', label); button.setAttribute('title', label);
  button.setAttribute('aria-pressed', String(light));
}
function setBrainSwapTheme(theme) {
  const nextTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nextTheme;
  try { localStorage.setItem(themeStorageKey, nextTheme); } catch {}
  updateThemeButton();
}
function bindThemeToggle() {
  const button = document.getElementById('theme-toggle');
  if (!button) return;
  button.addEventListener('click', () => setBrainSwapTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'));
  updateThemeButton(); positionThemeToggle();
  document.documentElement.classList.add('theme-ready');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindThemeToggle, {once:true});
else bindThemeToggle();
