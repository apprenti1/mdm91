// Génération des images d'aperçu (Open Graph / Twitter Card) : une vignette
// 1200x630 aux couleurs du thème, propre à chaque page (titre, catégorie,
// description), avec la bannière de la section en fond si elle existe.
// Le rendu passe par un SVG converti en PNG par sharp, mis en cache mémoire.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const { db } = require('./db');
const { getBanner, bannerPaths } = require('./banners');
const { getCustomLogo } = require('./logo');

const W = 1200;
const H = 630;
const PUBLIC_DIR = path.join(__dirname, 'public');
const FONT = "Poppins, Montserrat, 'Segoe UI', 'Helvetica Neue', 'DejaVu Sans', Arial, sans-serif";
const FONT_BODY = "Inter, 'Segoe UI', 'Helvetica Neue', 'DejaVu Sans', Arial, sans-serif";

const CATEGORY_LABELS = {
  actu: 'Actualité',
  evenement: 'Événement',
  bulle: "Bulle d'info",
  calendrier: 'Formation',
};

function excerptOf(text, len = 150) {
  const clean = (text || '').replace(/<[^>]*>/g, ' ').replace(/[#*_>`]/g, '').replace(/\s+/g, ' ').trim();
  return clean.length > len ? clean.slice(0, len - 1).trim() + '…' : clean;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Découpe un texte en lignes selon une largeur estimée (pas de mesure de
// police côté serveur : on approxime la largeur moyenne d'un caractère).
function wrap(text, maxChars, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? line + ' ' + w : w;
    if (next.length <= maxChars || !line) {
      line = next;
    } else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    if (last.length > maxChars - 1) last = last.slice(0, maxChars - 1);
    kept[maxLines - 1] = last.replace(/[\s,.;:!?-]+$/, '') + '…';
    return kept;
  }
  return lines;
}

function getPage(slug) {
  return db.prepare('SELECT * FROM pages WHERE slug = ?').get(slug);
}

// Contenu de la vignette pour un chemin "logique" (sans BASE_PATH).
// Ne renvoie que du contenu issu de la base / des textes du site : aucun
// texte arbitraire venant de l'URL n'est affiché.
function resolveOgContent(logicalPath, t) {
  const p = (logicalPath || '/').replace(/\/+$/, '') || '/';
  const pageEntry = (slug, fallbackTitle, section, kicker) => {
    const page = getPage(slug);
    return {
      kicker,
      title: page ? page.title : fallbackTitle,
      subtitle: page ? excerptOf(page.content) : t('header.subtitle'),
      section,
    };
  };

  if (p === '/') {
    return {
      kicker: t('home.hero.eyebrow'),
      title: t('home.hero.title'),
      subtitle: t('home.hero.subtitle'),
      section: 'accueil',
    };
  }
  if (p === '/presentation') return pageEntry('presentation', 'Présentation', 'presentation', 'Le club');
  if (p === '/adhesion') return pageEntry('adhesion', 'Adhésion', 'adhesion', 'Rejoindre le club');
  if (p === '/contacts') {
    // Pas d'extrait du contenu ici : la page liste noms et e-mails du bureau.
    const e = pageEntry('contacts', 'Contacts', 'contacts', 'Nous contacter');
    e.subtitle = 'Une question, une envie de plonger ? Écrivez-nous, le bureau du club vous répond.';
    return e;
  }
  if (p === '/calendrier') {
    const e = pageEntry('calendrier', t('calendrier.title'), 'calendrier', 'Calendrier · Formations');
    return e;
  }
  if (p === '/actualites') {
    return { kicker: "Bulles d'info", title: t('actualites.title'), subtitle: t('actualites.subtitle'), section: 'actualites' };
  }
  if (p === '/photos') {
    return { kicker: 'Galerie', title: t('photos.title'), subtitle: t('photos.subtitle'), section: 'photos' };
  }
  const m = p.match(/^\/actualites\/([^/]+)$/);
  if (m) {
    const post = db.prepare('SELECT * FROM posts WHERE slug = ?').get(m[1]);
    if (post) {
      let kicker = CATEGORY_LABELS[post.category] || 'Actualité';
      const date = post.event_date || (post.published_at || '').slice(0, 10);
      if (date && /^\d{4}-\d{2}-\d{2}/.test(date)) {
        const d = new Date(date.slice(0, 10) + 'T12:00:00');
        kicker += ' · ' + d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      return { kicker, title: post.title, subtitle: excerptOf(post.excerpt || post.content), section: 'actualites' };
    }
  }
  return null;
}

// Chemin du fichier image (sur disque) de la bannière d'une section, avec
// repli sur la bannière d'accueil.
function bannerFile(section) {
  for (const s of [section, 'accueil']) {
    const b = s && getBanner(s);
    if (b) {
      const file = path.join(PUBLIC_DIR, bannerPaths(b.baseFilename)[2].path);
      if (fs.existsSync(file)) return file;
    }
  }
  return null;
}

function logoFile() {
  const logo = getCustomLogo();
  if (!logo) return null;
  const file = path.join(PUBLIC_DIR, logo.url);
  return fs.existsSync(file) ? file : null;
}

function buildSvg({ kicker, title, subtitle, clubName, clubSubtitle, host, colors, hasPhoto, hasLogo }) {
  const c = colors;

  // Taille du titre adaptée à sa longueur.
  let titleSize = 76;
  let titleChars = 24;
  if (title.length > 40) { titleSize = 64; titleChars = 29; }
  if (title.length > 70) { titleSize = 54; titleChars = 35; }
  const titleLines = wrap(title, titleChars, 3);
  const lineH = Math.round(titleSize * 1.12);

  // Position verticale : catégorie, titre puis sous-titre, en s'arrêtant
  // avant les vagues du bas (ligne de base max du sous-titre : 520px).
  const kickerY = 212;
  const titleY0 = kickerY + 54 + titleSize * 0.82;
  const titleEnd = titleY0 + (titleLines.length - 1) * lineH;
  const subY0 = titleEnd + 54;
  const subMaxLines = Math.max(0, Math.min(2, Math.floor((520 - subY0) / 36) + 1));
  const subLines = subMaxLines ? wrap(subtitle, 62, subMaxLines) : [];

  const kickerText = (kicker || '').toUpperCase();
  const kickerW = Math.min(760, Math.round(kickerText.length * 15 + 48));

  const bubbles = [
    [1010, 200, 46], [1092, 296, 22], [948, 360, 14], [1124, 168, 12],
    [1040, 430, 30], [905, 235, 9], [1135, 390, 9], [985, 488, 16],
  ]
    .map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#bubble)" stroke="#ffffff" stroke-opacity="${0.35 - i * 0.025}" stroke-width="2"/>`)
    .join('');

  const anchor = `
    <g transform="translate(860 160) scale(15)" fill="none" stroke="#ffffff" stroke-opacity="0.07" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
    </g>`;

  const brandIcon = hasLogo
    ? `<circle cx="102" cy="104" r="36" fill="#ffffff"/>`
    : `<circle cx="102" cy="104" r="36" fill="${c.color_navy}" stroke="${c.color_teal}" stroke-width="3"/>
       <g transform="translate(83 85) scale(1.6)" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
         <circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
       </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sea" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c.color_deep}"/>
      <stop offset="0.55" stop-color="${c.color_navy}"/>
      <stop offset="1" stop-color="${c.color_blue}"/>
    </linearGradient>
    <linearGradient id="veil" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${c.color_deep}" stop-opacity="0.94"/>
      <stop offset="0.55" stop-color="${c.color_deep}" stop-opacity="0.78"/>
      <stop offset="1" stop-color="${c.color_navy}" stop-opacity="0.35"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.1" r="0.7">
      <stop offset="0" stop-color="${c.color_teal}" stop-opacity="0.45"/>
      <stop offset="1" stop-color="${c.color_teal}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bubble" cx="0.35" cy="0.3" r="0.7">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.02"/>
    </radialGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${c.color_sand}"/>
      <stop offset="1" stop-color="${c.color_coral}"/>
    </linearGradient>
  </defs>

  ${hasPhoto ? `<rect width="${W}" height="${H}" fill="url(#veil)"/>` : `<rect width="${W}" height="${H}" fill="url(#sea)"/>`}
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${anchor}
  ${bubbles}

  <!-- Vagues -->
  <path d="M0,548 C200,508 380,590 600,556 C820,522 1000,580 1200,540 L1200,630 L0,630 Z" fill="${c.color_teal}" fill-opacity="0.22"/>
  <path d="M0,578 C240,548 420,616 640,586 C860,556 1020,606 1200,574 L1200,630 L0,630 Z" fill="${c.color_blue}" fill-opacity="0.55"/>
  <path d="M0,604 C260,584 460,630 700,610 C900,594 1060,622 1200,604 L1200,630 L0,630 Z" fill="${c.color_deep}" fill-opacity="0.85"/>

  <!-- Marque -->
  ${brandIcon}
  <text x="156" y="98" font-family="${FONT}" font-weight="700" font-size="28" fill="#ffffff">${esc(clubName)}</text>
  <text x="156" y="130" font-family="${FONT_BODY}" font-weight="500" font-size="20" fill="${c.color_sand}">${esc(clubSubtitle)}</text>

  <!-- Catégorie -->
  ${kickerText ? `<rect x="66" y="${kickerY - 30}" width="${kickerW}" height="44" rx="22" fill="url(#accent)"/>
  <text x="88" y="${kickerY}" font-family="${FONT}" font-weight="700" font-size="19" letter-spacing="2" fill="${c.color_deep}">${esc(kickerText)}</text>` : ''}

  <!-- Titre -->
  ${titleLines
    .map((l, i) => `<text x="64" y="${Math.round(titleY0 + i * lineH)}" font-family="${FONT}" font-weight="800" font-size="${titleSize}" fill="#ffffff">${esc(l)}</text>`)
    .join('\n  ')}

  <!-- Sous-titre -->
  ${subLines
    .map((l, i) => `<text x="66" y="${Math.round(subY0 + i * 36)}" font-family="${FONT_BODY}" font-size="26" fill="#ffffff" fill-opacity="0.82">${esc(l)}</text>`)
    .join('\n  ')}

  <!-- Domaine, en haut à droite -->
  ${host ? `<text x="${W - 64}" y="111" text-anchor="end" font-family="${FONT}" font-weight="600" font-size="22" fill="${c.color_teal}">${esc(host)}</text>
  <rect x="${W - 64 - Math.round(host.length * 10.5) - 70}" y="101" width="54" height="5" rx="2.5" fill="url(#accent)"/>` : ''}
</svg>`;
}

const cache = new Map();
const CACHE_MAX = 100;

async function renderOgImage({ content, colors, t, host }) {
  const photo = bannerFile(content.section);
  const logo = logoFile();
  const params = {
    kicker: content.kicker || '',
    title: content.title || t('header.club_name'),
    subtitle: content.subtitle || '',
    clubName: t('header.club_name'),
    clubSubtitle: t('header.subtitle'),
    host: host || '',
    colors,
    hasPhoto: !!photo,
    hasLogo: !!logo,
  };

  const statOf = (f) => (f ? `${f}:${fs.statSync(f).mtimeMs}` : '');
  const key = crypto
    .createHash('sha1')
    .update(JSON.stringify(params) + statOf(photo) + statOf(logo))
    .digest('hex');
  if (cache.has(key)) return { buffer: cache.get(key), etag: key };

  const svg = Buffer.from(buildSvg(params));
  let base = photo
    ? sharp(photo).resize(W, H, { fit: 'cover', position: 'attention' }).modulate({ saturation: 1.1 })
    : sharp({ create: { width: W, height: H, channels: 4, background: colors.color_deep } });

  const layers = [{ input: svg, top: 0, left: 0 }];
  if (logo) {
    const mask = Buffer.from('<svg width="64" height="64"><circle cx="32" cy="32" r="32" fill="#fff"/></svg>');
    const logoImg = await sharp(logo, { density: 300 })
      .resize(64, 64, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .flatten({ background: '#ffffff' })
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer();
    layers.push({ input: logoImg, top: 72, left: 70 });
  }

  const buffer = await base.composite(layers).png({ compressionLevel: 9, palette: false }).toBuffer();
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, buffer);
  return { buffer, etag: key };
}

// Chemin (non préfixé) de la vignette d'une page : "/og/accueil.png",
// "/og/presentation.png", "/og/actualites/mon-article.png"...
function ogImagePathFor(logicalPath) {
  const p = (logicalPath || '/').replace(/\/+$/, '');
  return p ? `/og${p}.png` : '/og/accueil.png';
}

module.exports = { resolveOgContent, renderOgImage, ogImagePathFor, W, H };
