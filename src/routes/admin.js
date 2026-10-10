const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const { db, ensureUniqueSlug, kvGetAll } = require('../db');
const { TEXT_DEFINITIONS, GROUPS, DEFAULT_TEXTS, makeT } = require('../texts');
const { COLOR_FIELDS, getThemeColors, setThemeColors, resetThemeColors } = require('../theme');
const { SECTIONS: BANNER_SECTIONS, WIDTHS: BANNER_WIDTHS, isValidSection, getAllBanners } = require('../banners');
const { getCustomLogo, setCustomLogo, clearCustomLogo } = require('../logo');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const LOGO_DIR = path.join(UPLOAD_DIR, 'logo');
if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, LOGO_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.svg', '.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext : '.png';
    cb(null, `logo-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`);
  },
});
const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Seules les images sont acceptées'));
  },
});

const BANNER_DIR = path.join(UPLOAD_DIR, 'banners');
if (!fs.existsSync(BANNER_DIR)) fs.mkdirSync(BANNER_DIR, { recursive: true });

// Upload en mémoire : le fichier original n'est jamais écrit sur disque,
// seules les tailles générées par sharp le sont.
const uploadBanner = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Seules les images sont acceptées'));
  },
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Seules les images sont acceptées'));
  },
});

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect(res.locals.u('/admin/login'));
}

router.get('/login', (req, res) => {
  res.render('admin/login', { error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get((username || '').trim());
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).render('admin/login', { error: 'Identifiants incorrects.' });
  }
  req.session.user = { id: user.id, username: user.username, display_name: user.display_name };
  res.redirect(res.locals.u('/admin'));
});

router.post('/logout', (req, res) => {
  const u = res.locals.u;
  req.session.destroy(() => res.redirect(u('/')));
});

router.use(requireAuth);

router.use((req, res, next) => {
  res.locals.unreadCount = db.prepare("SELECT COUNT(*) c FROM submissions WHERE is_read = 0").get().c;
  next();
});

router.get('/', (req, res) => {
  const posts = db.prepare('SELECT * FROM posts ORDER BY published_at DESC').all();
  const photos = db.prepare('SELECT * FROM photos ORDER BY uploaded_at DESC').all();
  res.render('admin/dashboard', { posts, photos });
});

// ---- Posts (actus / evenements / calendrier / bulles) ----
router.get('/posts/new', (req, res) => {
  res.render('admin/post-form', { post: null });
});

router.post('/posts/new', (req, res) => {
  const { title, category, excerpt, content, event_date } = req.body;
  if (!title || !content) return res.status(400).render('admin/post-form', { post: req.body, error: 'Titre et contenu requis.' });
  const slug = ensureUniqueSlug(title);
  db.prepare(`INSERT INTO posts (title, slug, category, excerpt, content, event_date, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    title, slug, category || 'actu', excerpt || '', content, event_date || null,
    event_date ? `${event_date} 09:00:00` : new Date().toISOString()
  );
  res.redirect(res.locals.u('/admin'));
});

router.get('/posts/:id/edit', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.redirect(res.locals.u('/admin'));
  res.render('admin/post-form', { post });
});

router.post('/posts/:id/edit', (req, res) => {
  const { title, category, excerpt, content, event_date } = req.body;
  db.prepare(`UPDATE posts SET title = ?, category = ?, excerpt = ?, content = ?, event_date = ? WHERE id = ?`)
    .run(title, category || 'actu', excerpt || '', content, event_date || null, req.params.id);
  res.redirect(res.locals.u('/admin'));
});

router.post('/posts/:id/delete', (req, res) => {
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.redirect(res.locals.u('/admin'));
});

// ---- Photos ----
router.post('/photos', upload.single('photo'), (req, res) => {
  if (!req.file) return res.redirect(res.locals.u('/admin'));
  const { album, caption, credit } = req.body;
  db.prepare('INSERT INTO photos (album, caption, filename, credit) VALUES (?, ?, ?, ?)')
    .run(album || 'Général', caption || '', req.file.filename, credit || '');
  res.redirect(res.locals.u('/admin'));
});

router.post('/photos/:id/delete', (req, res) => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
  if (photo) {
    const filePath = path.join(UPLOAD_DIR, photo.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
  }
  res.redirect(res.locals.u('/admin'));
});

// ---- Static pages (présentation / adhésion / contacts / calendrier intro) ----
router.get('/pages/:slug/edit', (req, res) => {
  const page = db.prepare('SELECT * FROM pages WHERE slug = ?').get(req.params.slug);
  if (!page) return res.redirect(res.locals.u('/admin'));
  res.render('admin/page-form', { page });
});

router.post('/pages/:slug/edit', (req, res) => {
  const { title, content } = req.body;
  db.prepare("UPDATE pages SET title = ?, content = ?, updated_at = datetime('now') WHERE slug = ?")
    .run(title, content, req.params.slug);
  res.redirect(res.locals.u('/admin'));
});

// ---- Messages (soumissions des formulaires adhésion / contact) ----
router.get('/messages', (req, res) => {
  const messages = db.prepare('SELECT * FROM submissions ORDER BY is_read ASC, created_at DESC').all();
  res.render('admin/messages', { messages });
});

router.post('/messages/:id/read', (req, res) => {
  db.prepare('UPDATE submissions SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.redirect(res.locals.u('/admin/messages'));
});

router.post('/messages/:id/unread', (req, res) => {
  db.prepare('UPDATE submissions SET is_read = 0 WHERE id = ?').run(req.params.id);
  res.redirect(res.locals.u('/admin/messages'));
});

router.post('/messages/:id/delete', (req, res) => {
  db.prepare('DELETE FROM submissions WHERE id = ?').run(req.params.id);
  res.redirect(res.locals.u('/admin/messages'));
});

// ---- Thème (couleurs de la charte) ----
router.get('/theme', (req, res) => {
  res.render('admin/theme', { colorFields: COLOR_FIELDS, values: getThemeColors(), success: null });
});

router.post('/theme', (req, res) => {
  setThemeColors(req.body);
  // res.locals.colors a été calculé par le middleware global avant cette
  // mutation : on le rafraîchit pour que l'en-tête de CETTE réponse reflète
  // déjà les nouvelles couleurs (sinon seule la navigation suivante les verrait).
  res.locals.colors = getThemeColors();
  res.render('admin/theme', { colorFields: COLOR_FIELDS, values: res.locals.colors, success: 'Couleurs enregistrées.' });
});

router.post('/theme/reset', (req, res) => {
  resetThemeColors();
  res.locals.colors = getThemeColors();
  res.render('admin/theme', { colorFields: COLOR_FIELDS, values: res.locals.colors, success: 'Couleurs réinitialisées aux valeurs par défaut.' });
});

// ---- Logo personnalisé (en-tête + favicon) ----
function deleteLogoFile(logo) {
  if (!logo) return;
  const filePath = path.join(LOGO_DIR, path.basename(logo.url));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

router.post('/theme/logo', uploadLogo.single('logo'), (req, res) => {
  if (req.file) {
    const old = getCustomLogo();
    setCustomLogo(req.file.filename);
    deleteLogoFile(old);
  }
  res.redirect(res.locals.u('/admin/theme'));
});

router.post('/theme/logo/delete', (req, res) => {
  deleteLogoFile(getCustomLogo());
  clearCustomLogo();
  res.redirect(res.locals.u('/admin/theme'));
});

// ---- Bannières responsives par section ----
function deleteBannerFiles(baseFilename) {
  if (!baseFilename) return;
  for (const w of BANNER_WIDTHS) {
    const p = path.join(BANNER_DIR, `${baseFilename}-${w}.jpg`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

router.get('/bannieres', (req, res) => {
  res.render('admin/bannieres', { sections: BANNER_SECTIONS, banners: getAllBanners() });
});

router.post('/bannieres', uploadBanner.single('banner'), async (req, res) => {
  const { section } = req.body;
  if (!isValidSection(section) || !req.file) {
    return res.redirect(res.locals.u('/admin/bannieres'));
  }
  try {
    const base = `${section}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    for (const w of BANNER_WIDTHS) {
      await sharp(req.file.buffer)
        .rotate() // corrige l'orientation EXIF
        .resize({ width: w, withoutEnlargement: true })
        .jpeg({ quality: 78 })
        .toFile(path.join(BANNER_DIR, `${base}-${w}.jpg`));
    }
    const old = db.prepare('SELECT base_filename FROM banners WHERE section = ?').get(section);
    db.prepare(`INSERT INTO banners (section, base_filename, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(section) DO UPDATE SET base_filename = excluded.base_filename, updated_at = excluded.updated_at`)
      .run(section, base);
    if (old) deleteBannerFiles(old.base_filename);
  } catch (err) {
    console.error('[bannieres] échec du traitement image:', err.message);
  }
  res.redirect(res.locals.u('/admin/bannieres'));
});

router.post('/bannieres/:section/delete', (req, res) => {
  const { section } = req.params;
  const old = db.prepare('SELECT base_filename FROM banners WHERE section = ?').get(section);
  if (old) {
    deleteBannerFiles(old.base_filename);
    db.prepare('DELETE FROM banners WHERE section = ?').run(section);
  }
  res.redirect(res.locals.u('/admin/bannieres'));
});

// ---- Textes éditables du site ----
router.get('/textes', (req, res) => {
  const stored = kvGetAll('site_texts');
  res.render('admin/textes', { definitions: TEXT_DEFINITIONS, groups: GROUPS, stored, success: null });
});

router.post('/textes', (req, res) => {
  for (const def of TEXT_DEFINITIONS) {
    const submitted = req.body[def.key];
    if (submitted === undefined) continue;
    const trimmed = submitted.trim();
    if (trimmed === '' || trimmed === def.default) {
      // Revenir à la valeur par défaut : on supprime la ligne stockée.
      db.prepare('DELETE FROM site_texts WHERE key = ?').run(def.key);
    } else {
      db.prepare(`INSERT INTO site_texts (key, value, updated_at) VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).run(def.key, submitted);
    }
  }
  const stored = kvGetAll('site_texts');
  // Même raison que pour /theme : rafraîchir t()/siteName pour que l'en-tête
  // de CETTE réponse reflète déjà les textes qu'on vient d'enregistrer.
  res.locals.t = makeT(stored);
  res.locals.siteName = res.locals.t('header.club_name');
  res.render('admin/textes', { definitions: TEXT_DEFINITIONS, groups: GROUPS, stored, success: 'Textes enregistrés.' });
});

// ---- Account ----
router.get('/password', (req, res) => {
  res.render('admin/password', { error: null, success: null });
});

router.post('/password', (req, res) => {
  const { current_password, new_password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  if (!bcrypt.compareSync(current_password || '', user.password_hash)) {
    return res.status(401).render('admin/password', { error: 'Mot de passe actuel incorrect.', success: null });
  }
  if (!new_password || new_password.length < 8) {
    return res.status(400).render('admin/password', { error: 'Le nouveau mot de passe doit faire au moins 8 caractères.', success: null });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  res.render('admin/password', { error: null, success: 'Mot de passe mis à jour.' });
});

module.exports = router;
