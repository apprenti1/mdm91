// Icônes SVG simples, style "ionicon" (traits, currentColor), dessinées à la
// main pour un rendu identique sur toutes les plateformes (contrairement aux
// emojis, qui varient selon l'OS).
const ICONS = {
  // Logo du club par défaut (utilisé si aucun logo personnalisé n'est
  // envoyé depuis /admin/theme) : icône "anchor" de Feather Icons
  // (https://feathericons.com, licence MIT).
  brand: '<circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/>',
  // Bascule thème clair/sombre.
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/>',
  // Vignettes de la page d'accueil.
  pool: '<path d="M3 17c1.4 1.2 2.9 1.2 4.3 0 1.4-1.2 2.9-1.2 4.3 0 1.4 1.2 2.9 1.2 4.3 0 1.4-1.2 2.9-1.2 4.3 0"/><path d="M3 12.5c1.4 1.2 2.9 1.2 4.3 0 1.4-1.2 2.9-1.2 4.3 0 1.4 1.2 2.9 1.2 4.3 0 1.4-1.2 2.9-1.2 4.3 0"/><path d="M8 8l2-3.5L12 8l2-3.5L16 8"/>',
  depth: '<path d="M12 3v12.5"/><path d="M7 11l5 5 5-5"/><path d="M4 21h16"/>',
  cap: '<path d="M12 4 2.5 8.7 12 13.4l9.5-4.7L12 4z"/><path d="M6.3 10.8v4.6c0 1.7 2.6 3.1 5.7 3.1s5.7-1.4 5.7-3.1v-4.6"/><path d="M21.5 8.7v5.6"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  // Réseau (menu, filtres…)
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  // Lien "Espace admin" : icône "shield" de Feather Icons (MIT).
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
};

const DEFAULT_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

function icon(name, className) {
  const inner = ICONS[name];
  if (!inner) return '';
  const cls = className ? ` class="${className}"` : '';
  return `<svg${cls} ${DEFAULT_ATTRS} aria-hidden="true" focusable="false">${inner}</svg>`;
}

module.exports = { icon, ICONS };
