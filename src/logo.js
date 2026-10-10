const path = require('path');
const { kvGetAll, kvSet, kvDelete } = require('./db');

const MIME_BY_EXT = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function getCustomLogo() {
  const settings = kvGetAll('settings');
  const filename = settings.logo_filename;
  if (!filename) return null;
  const ext = path.extname(filename).toLowerCase();
  return {
    url: `/uploads/logo/${filename}`,
    mime: MIME_BY_EXT[ext] || 'image/png',
  };
}

function setCustomLogo(filename) {
  kvSet('settings', 'logo_filename', filename);
}

function clearCustomLogo() {
  kvDelete('settings', 'logo_filename');
}

module.exports = { getCustomLogo, setCustomLogo, clearCustomLogo, MIME_BY_EXT };
