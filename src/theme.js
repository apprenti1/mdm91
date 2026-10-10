const { db, kvGetAll, kvSet, kvDelete } = require('./db');

const DEFAULT_COLORS = {
  color_deep: '#06283D',
  color_navy: '#08415C',
  color_blue: '#1B6FA8',
  color_teal: '#47B5FF',
  color_sand: '#FFD369',
  color_coral: '#FF6B6B',
};

const COLOR_FIELDS = [
  { key: 'color_deep', label: 'Bleu très foncé' },
  { key: 'color_navy', label: 'Bleu marine' },
  { key: 'color_blue', label: 'Bleu' },
  { key: 'color_teal', label: 'Turquoise' },
  { key: 'color_sand', label: 'Sable / jaune' },
  { key: 'color_coral', label: 'Corail' },
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function getThemeColors() {
  const stored = kvGetAll('settings');
  const colors = {};
  for (const key of Object.keys(DEFAULT_COLORS)) {
    colors[key] = stored[key] && HEX_RE.test(stored[key]) ? stored[key] : DEFAULT_COLORS[key];
  }
  return colors;
}

function setThemeColors(values) {
  for (const key of Object.keys(DEFAULT_COLORS)) {
    const v = values[key];
    if (v && HEX_RE.test(v)) kvSet('settings', key, v);
  }
}

function resetThemeColors() {
  for (const key of Object.keys(DEFAULT_COLORS)) kvDelete('settings', key);
}

module.exports = { DEFAULT_COLORS, COLOR_FIELDS, getThemeColors, setThemeColors, resetThemeColors };
