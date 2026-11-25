require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const helmet = require('helmet');

const { db, kvGetAll } = require('./src/db');
const publicRoutes = require('./src/routes/public');
const adminRoutes = require('./src/routes/admin');
const { makeT } = require('./src/texts');
const { getThemeColors } = require('./src/theme');
const { breakBefore } = require('./src/utils/format');
const { icon } = require('./src/utils/icons');
const { getBanner, bannerPaths } = require('./src/banners');
const { getCustomLogo } = require('./src/logo');
const { ogImagePathFor, W: OG_W, H: OG_H } = require('./src/og');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

// Préfixe de chemin quand le site est servi derrière un reverse proxy sous un
// sous-dossier (ex: BASE_PATH=/mdm91 pour https://exemple.fr/mdm91/...).
// Normalisé : toujours soit '' (racine), soit "/xxx" sans slash final.
function normalizeBasePath(raw) {
  if (!raw) return '';
  let p = raw.trim();
  if (!p || p === '/') return '';
  if (!p.startsWith('/')) p = '/' + p;
  if (p.endsWith('/')) p = p.slice(0, -1);
  return p;
}
const BASE_PATH = normalizeBasePath(process.env.BASE_PATH);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false, // simple site, inline styles/scripts kept minimal & local
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(BASE_PATH || '/', express.static(path.join(__dirname, 'src', 'public')));

app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: DATA_DIR }),
  secret: process.env.SESSION_SECRET || 'mdm91-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8, // 8h
    httpOnly: true,
    sameSite: 'lax',
  },
}));

// Make current admin session + shared view helpers available in all views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  // currentPath reste "logique" (sans BASE_PATH) pour que les comparaisons
  // de navigation active (currentPath.startsWith('/xxx')) marchent pareil,
  // avec ou sans reverse proxy sous-chemin.
  res.locals.currentPath = BASE_PATH && req.path.startsWith(BASE_PATH)
    ? (req.path.slice(BASE_PATH.length) || '/')
    : req.path;
  const t = makeT(kvGetAll('site_texts'));
  res.locals.t = t;
  res.locals.siteName = t('header.club_name');
  res.locals.breakBefore = breakBefore;
  res.locals.icon = icon;
  res.locals.colors = getThemeColors();
  res.locals.getBanner = getBanner;
  res.locals.bannerPaths = bannerPaths;
  res.locals.logo = getCustomLogo();
  res.locals.basePath = BASE_PATH;
  res.locals.u = (p) => BASE_PATH + p;
  res.locals.baseUrl = `${req.protocol}://${req.get('host')}`;
  res.locals.canonicalUrl = `${res.locals.baseUrl}${req.originalUrl}`;
  res.locals.ogImage = {
    url: `${res.locals.baseUrl}${BASE_PATH}${ogImagePathFor(res.locals.currentPath)}`,
    width: OG_W,
    height: OG_H,
  };
  next();
});

app.use(BASE_PATH + '/admin', adminRoutes);
app.use(BASE_PATH || '/', publicRoutes);

app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MDM91 site en ligne sur http://localhost:${PORT}${BASE_PATH}`);
});
