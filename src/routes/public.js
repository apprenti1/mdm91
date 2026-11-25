const express = require('express');
const { db } = require('../db');
const { resolveOgContent, renderOgImage } = require('../og');

const router = express.Router();

const CATEGORY_LABELS = {
  actu: 'Actualité',
  evenement: 'Événement',
  bulle: "Bulle d'info",
  calendrier: 'Calendrier / Formation',
};

const LEVELS = ['Baptême', 'Niveau 1', 'Niveau 2', 'Niveau 3', 'Autre'];

function getPage(slug) {
  return db.prepare('SELECT * FROM pages WHERE slug = ?').get(slug);
}

function insertSubmission(type, data) {
  db.prepare(`INSERT INTO submissions (type, name, email, phone, level, subject, message)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    type, data.name, data.email, data.phone || '', data.level || '', data.subject || '', data.message || ''
  );
}

function excerptOf(text, len = 155) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  return clean.length > len ? clean.slice(0, len - 1).trim() + '…' : clean;
}

// robots.txt et sitemap.xml sont générés dynamiquement (pas des fichiers
// figés) : le sitemap reflète toujours le contenu réel de la base (actus
// publiées, pages), et le domaine s'adapte automatiquement au déploiement.
router.get('/robots.txt', (req, res) => {
  const { u, baseUrl } = res.locals;
  res.type('text/plain').send(
    `User-agent: *\nDisallow: ${u('/admin/')}\nAllow: ${u('/')}\n\nSitemap: ${baseUrl}${u('/sitemap.xml')}\n`
  );
});

router.get('/sitemap.xml', (req, res) => {
  const { u, baseUrl } = res.locals;
  const staticUrls = ['/', '/presentation', '/actualites', '/calendrier', '/photos', '/adhesion', '/contacts'];
  const posts = db.prepare('SELECT slug, published_at FROM posts ORDER BY published_at DESC').all();
  const entries = [
    ...staticUrls.map((loc) => ({ loc, lastmod: null })),
    ...posts.map((p) => ({ loc: `/actualites/${p.slug}`, lastmod: (p.published_at || '').slice(0, 10) })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map((e) => `  <url>\n    <loc>${baseUrl}${u(e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''}\n  </url>`)
    .join('\n')}\n</urlset>\n`;
  res.type('application/xml').send(xml);
});

// Vignettes d'aperçu pour les réseaux sociaux (Open Graph / Twitter Card).
// "/og/accueil.png" -> page d'accueil, "/og/<chemin>.png" -> page <chemin>.
// Un chemin inconnu retombe sur la vignette d'accueil.
router.get(/^\/og\/(.+)\.png$/, async (req, res, next) => {
  try {
    const { t, colors } = res.locals;
    const name = req.params[0];
    const logical = name === 'accueil' ? '/' : '/' + name;
    const content = resolveOgContent(logical, t) || resolveOgContent('/', t);
    const { buffer, etag } = await renderOgImage({ content, colors, t, host: req.get('host') });
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('ETag', `"${etag}"`);
    if (req.fresh) return res.status(304).end();
    res.type('png').send(buffer);
  } catch (err) {
    next(err);
  }
});

router.get('/', (req, res) => {
  const posts = db.prepare('SELECT * FROM posts ORDER BY published_at DESC LIMIT 6').all();
  const photos = db.prepare('SELECT * FROM photos ORDER BY uploaded_at DESC LIMIT 6').all();
  res.render('index', { posts, photos, CATEGORY_LABELS });
});

router.get('/actualites', (req, res) => {
  const cat = req.query.cat;
  let posts;
  if (cat && CATEGORY_LABELS[cat]) {
    posts = db.prepare('SELECT * FROM posts WHERE category = ? ORDER BY published_at DESC').all(cat);
  } else {
    posts = db.prepare('SELECT * FROM posts ORDER BY published_at DESC').all();
  }
  const t = res.locals.t;
  const pageTitle = cat && CATEGORY_LABELS[cat] ? `${t('actualites.title')} — ${CATEGORY_LABELS[cat]}` : t('actualites.title');
  res.render('actualites', { posts, CATEGORY_LABELS, activeCat: cat || '', pageTitle, metaDescription: t('actualites.subtitle') });
});

router.get('/actualites/:slug', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE slug = ?').get(req.params.slug);
  if (!post) return res.status(404).render('404');
  res.render('post', { post, CATEGORY_LABELS, pageTitle: post.title, metaDescription: excerptOf(post.excerpt || post.content) });
});

// Ancienne page /evenements : redirection permanente vers le filtre
// "événements" de /actualites pour ne pas casser les liens existants.
router.get('/evenements', (req, res) => {
  res.redirect(301, res.locals.u('/actualites?cat=evenement'));
});

router.get('/calendrier', (req, res) => {
  const page = getPage('calendrier');
  const posts = db.prepare("SELECT * FROM posts WHERE category = 'calendrier' ORDER BY published_at DESC").all();
  const pageTitle = page ? page.title : res.locals.t('calendrier.title');
  const metaDescription = page ? excerptOf(page.content) : undefined;
  res.render('calendrier', { page, posts, CATEGORY_LABELS, pageTitle, metaDescription });
});

router.get('/presentation', (req, res) => {
  const page = getPage('presentation');
  res.render('page', {
    page, heroSection: 'presentation',
    pageTitle: page ? page.title : 'Présentation',
    metaDescription: page ? excerptOf(page.content) : undefined,
  });
});

router.get('/adhesion', (req, res) => {
  const page = getPage('adhesion');
  res.render('adhesion', {
    page, submitted: false, error: null,
    pageTitle: page ? page.title : 'Adhésion',
    metaDescription: page ? excerptOf(page.content) : undefined,
  });
});

router.post('/adhesion', (req, res) => {
  const page = getPage('adhesion');
  const pageTitle = page ? page.title : 'Adhésion';
  const { name, email, phone, level, message, site_web } = req.body;
  if (site_web) {
    // Piège à robots rempli : on affiche quand même la confirmation, sans
    // rien enregistrer, pour ne pas révéler la détection au bot.
    return res.render('adhesion', { page, submitted: true, error: null, pageTitle });
  }
  if (!name || !email) {
    return res.status(400).render('adhesion', {
      page, submitted: false, error: 'Le nom et l\'email sont obligatoires.',
      values: { name, email, phone, level, message }, pageTitle,
    });
  }
  insertSubmission('adhesion', { name, email, phone, level: LEVELS.includes(level) ? level : 'Autre', message });
  res.render('adhesion', { page, submitted: true, error: null, pageTitle });
});

router.get('/contacts', (req, res) => {
  const page = getPage('contacts');
  res.render('contacts', {
    page, submitted: false, error: null,
    pageTitle: page ? page.title : 'Contacts',
    metaDescription: page ? excerptOf(page.content) : undefined,
  });
});

router.post('/contacts', (req, res) => {
  const page = getPage('contacts');
  const pageTitle = page ? page.title : 'Contacts';
  const { name, email, subject, message, site_web } = req.body;
  if (site_web) {
    return res.render('contacts', { page, submitted: true, error: null, pageTitle });
  }
  if (!name || !email || !subject || !message) {
    return res.status(400).render('contacts', {
      page, submitted: false, error: 'Tous les champs sont obligatoires.',
      values: { name, email, subject, message }, pageTitle,
    });
  }
  insertSubmission('contact', { name, email, subject, message });
  res.render('contacts', { page, submitted: true, error: null, pageTitle });
});

router.get('/photos', (req, res) => {
  const photos = db.prepare('SELECT * FROM photos ORDER BY uploaded_at DESC').all();
  const albums = {};
  for (const p of photos) {
    if (!albums[p.album]) albums[p.album] = [];
    albums[p.album].push(p);
  }
  const t = res.locals.t;
  res.render('photos', { albums, pageTitle: t('photos.title'), metaDescription: t('photos.subtitle') });
});

module.exports = router;
