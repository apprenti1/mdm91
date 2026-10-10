const { db } = require('./db');

const SECTIONS = [
  { key: 'accueil', label: 'Accueil' },
  { key: 'presentation', label: 'Présentation' },
  { key: 'actualites', label: "Bulles d'info / actualités" },
  { key: 'calendrier', label: 'Calendrier' },
  { key: 'photos', label: 'Photos' },
  { key: 'adhesion', label: 'Adhésion' },
  { key: 'contacts', label: 'Contacts' },
];

const WIDTHS = [480, 960, 1600];

function isValidSection(section) {
  return SECTIONS.some((s) => s.key === section);
}

// Renvoie uniquement le nom de base du fichier : la construction des chemins
// (préfixés par BASE_PATH le cas échéant) se fait dans les vues via bannerPaths().
function getBanner(section) {
  const row = db.prepare('SELECT base_filename FROM banners WHERE section = ?').get(section);
  if (!row) return null;
  return { baseFilename: row.base_filename };
}

// Chemins (non préfixés) des 3 tailles générées pour un nom de base donné.
function bannerPaths(baseFilename) {
  return WIDTHS.map((w) => ({ width: w, path: `/uploads/banners/${baseFilename}-${w}.jpg` }));
}

function getAllBanners() {
  const rows = db.prepare('SELECT * FROM banners').all();
  const map = {};
  for (const r of rows) map[r.section] = r;
  return map;
}

module.exports = { SECTIONS, WIDTHS, isValidSection, getBanner, bannerPaths, getAllBanners };
