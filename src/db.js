const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'mdm91.sqlite'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL DEFAULT 'actu', -- actu | evenement | bulle | calendrier
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  event_date TEXT,
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  album TEXT NOT NULL,
  caption TEXT,
  filename TEXT NOT NULL,
  credit TEXT,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pages (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL, -- adhesion | contact
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  level TEXT,
  subject TEXT,
  message TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS site_texts (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS banners (
  section TEXT PRIMARY KEY,
  base_filename TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

function slugify(str) {
  return str
    .toString()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90);
}

function ensureUniqueSlug(base, table = 'posts') {
  let slug = slugify(base) || 'article';
  let i = 1;
  const exists = (s) => db.prepare(`SELECT 1 FROM ${table} WHERE slug = ?`).get(s);
  let candidate = slug;
  while (exists(candidate)) {
    i += 1;
    candidate = `${slug}-${i}`;
  }
  return candidate;
}

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'plongee91!';
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)')
      .run(username, hash, 'Bureau du club');
    console.log(`[seed] Compte admin cree -> identifiant: ${username} / mot de passe: ${password}`);
  }

  const pageCount = db.prepare('SELECT COUNT(*) AS c FROM pages').get().c;
  if (pageCount === 0) {
    const pages = [
      {
        slug: 'presentation',
        title: 'Présentation du club',
        content: `Les Mousquetaires Des Mers est une association loi 1901, exclusivement géré et animée par une équipe de bénévoles passionnés de plongée. Le club est affilié à la Fédération Française d'Études et de Sports Sous-Marins (FFESSM) et à la Confédération Mondiale des Activités Subaquatiques (CMAS).\n\nNous proposons de nombreuses activités accessibles dès 9 ans : cours en piscine, plongées en fosse protégée, validations en milieu naturel, sorties en eau douce et en mer, formations spécialisées, voyages organisés et événements à thème.\n\nLe club délivre une gamme complète de diplômes : pour les enfants à partir de 8 ans (baptêmes, niveaux Bronze, Argent, Or, passeports plongée) et pour les adultes à partir de 14 ans (Niveaux 1, 2 et 3, avec équivalences CMAS).\n\nNos cours en piscine ont lieu à Breuillet le mercredi et le vendredi de 20h30 à 23h30. Les séances en fosse de plongée se déroulent à Antony certains vendredis soir. Les validations en milieu naturel se font le plus souvent en Méditerranée.\n\nEn 2024, le club a fêté ses 30 ans !`,
      },
      {
        slug: 'adhesion',
        title: 'Adhésion au club',
        content: `L'adhésion annuelle comprend pour tous les membres : la licence et l'assurance RC plongeur, les entrées et cours à la piscine, ainsi que le gonflage des bouteilles et le prêt du matériel principal (bouteilles, détendeurs, gilets).\n\nÀ partir du Niveau 1, s'ajoutent les entrées aux séances en fosse de plongée ainsi que les cours théoriques dispensés par nos moniteurs FFESSM.\n\nNe sont pas inclus : l'équipement PMT (palmes, masque, tuba, obligatoire), les supports pédagogiques pour les niveaux N1 et plus, les validations en milieu naturel, les voyages et sorties organisées, ainsi que les frais de déplacement.\n\nPour vous inscrire, vous devez fournir une fiche d'inscription complétée, un certificat médical d'absence de contre-indication à la pratique de la plongée (CACI), ainsi que les autres pièces indiquées sur la checklist d'inscription. Les tarifs exacts figurent sur la fiche d'inscription officielle, disponible auprès du bureau du club.\n\nPour toute question, contactez-nous via la page Contacts.`,
      },
      {
        slug: 'contacts',
        title: 'Contacts',
        content: `Le bureau du club :\n\nPrésident : Serge — mdm91@free.fr\nTrésorier et Vice-Président : Stéphane — sg.mdm91@laposte.net\nSecrétaire : Viorelia — secretariat.mdm91@free.fr\n\nNos moniteurs et encadrants : Alain, Eric, Thomas, Laurent, Stéphane, Yann, Bruno, Serge, José, Sébastien et Anthony.\n\nLe club est basé dans l'Essonne (91). Retrouvez-nous à la piscine de Breuillet le mercredi et le vendredi soir, et aux séances de fosse à Antony.`,
      },
      {
        slug: 'calendrier',
        title: 'Calendrier & Formations',
        content: `Retrouvez ici les grands rendez-vous de la saison : calendrier des sorties techniques (carrières et mer), planning des séances en fosse à Antony, cours théoriques N1/N2/N3, formation RIFAP (Réactions et Interventions Face à un Accident de Plongée), et les parcours N5 / Rescue / EFR (Enseignant Fédéral Régional).\n\nLes dates précises de chaque session sont publiées au fil de la saison dans les actualités du club — pensez à consulter régulièrement cette page et la rubrique Actualités.`,
      },
    ];
    const insert = db.prepare('INSERT INTO pages (slug, title, content) VALUES (?, ?, ?)');
    for (const p of pages) insert.run(p.slug, p.title, p.content);
  }

  const postCount = db.prepare('SELECT COUNT(*) AS c FROM posts').get().c;
  if (postCount === 0) {
    const posts = [
      {
        title: 'Adhésion au club — saison 2026-2027',
        category: 'actu',
        excerpt: "L'adhésion annuelle inclut licence, assurance RC plongeur, accès piscine et gonflage des bouteilles.",
        content: `L'adhésion annuelle comprend la licence et l'assurance RC plongeur, les entrées et cours à la piscine, ainsi que le gonflage des bouteilles. À partir du Niveau 1, s'ajoutent les entrées aux séances en fosse et les cours théoriques.\n\nDocuments à fournir : fiche d'inscription complétée et certificat médical (CACI). Contactez le bureau du club pour recevoir la fiche d'inscription et connaître les tarifs en vigueur.`,
        event_date: '2026-09-04',
      },
      {
        title: 'Calendrier des sorties techniques 2026-2027',
        category: 'calendrier',
        excerpt: 'Le calendrier prévisionnel des sorties en carrière et en mer pour la nouvelle saison.',
        content: `Le calendrier prévisionnel des sorties techniques de la saison 2026-2027 est en cours de finalisation. Il couvrira les sorties en carrière (validations, entraînements) ainsi que les sorties en mer.\n\nLes dates seront communiquées au fur et à mesure dans les actualités et affichées lors des séances piscine.`,
        event_date: '2026-08-29',
      },
      {
        title: 'Planning des Fosses 2026-2027',
        category: 'calendrier',
        excerpt: 'Les séances en fosse de plongée à Antony reprennent certains vendredis soir.',
        content: `Le club organise des séances en fosse de plongée protégée à Antony, certains vendredis soir tout au long de la saison. Ces séances permettent de s'entraîner en profondeur dans un cadre sécurisé, encadré par nos moniteurs FFESSM.\n\nLe planning détaillé des dates est disponible auprès du bureau et affiché à la piscine.`,
        event_date: '2026-08-29',
      },
      {
        title: 'Essonne sur l\'eau 2026',
        category: 'evenement',
        excerpt: "Rendez-vous le dimanche 6 septembre 2026 de 10h30 à 16h00 pour découvrir les sports nautiques de l'Essonne.",
        content: `Le Comité Départemental Olympique organise "Essonne sur l'eau", un événement qui permet de découvrir gratuitement de nombreux sports nautiques et subaquatiques du département.\n\nLes Mousquetaires Des Mers y tiendront un stand avec baptêmes de plongée. Rendez-vous le dimanche 6 septembre 2026, de 10h30 à 16h00.`,
        event_date: '2026-09-06',
      },
      {
        title: 'Cours théoriques N3 — saison 2026-2027',
        category: 'calendrier',
        excerpt: 'Reprise des cours théoriques de Niveau 3 pour la nouvelle saison.',
        content: `Les cours théoriques du Niveau 3 reprennent pour la saison 2026-2027. Ces cours, dispensés par nos moniteurs FFESSM, couvrent la physique et la physiologie de la plongée, la réglementation, l'organisation de palanquées autonomes et la préparation aux plongées profondes.\n\nInscriptions auprès du bureau du club.`,
        event_date: '2026-08-20',
      },
      {
        title: "Piscine de Noël 2025 — photos",
        category: 'bulle',
        excerpt: 'Retour en images sur notre traditionnelle séance piscine de Noël.',
        content: `Merci à toutes et tous pour votre participation à la séance piscine de Noël 2025 ! Décorations, bonne humeur et plongée étaient au rendez-vous. Les photos de la soirée sont disponibles dans la galerie Photos du site.`,
        event_date: '2025-12-21',
      },
    ];
    const insert = db.prepare(`INSERT INTO posts (title, slug, category, excerpt, content, event_date, published_at)
      VALUES (@title, @slug, @category, @excerpt, @content, @event_date, @published_at)`);
    for (const p of posts) {
      insert.run({
        ...p,
        slug: ensureUniqueSlug(p.title),
        published_at: p.event_date ? `${p.event_date} 09:00:00` : new Date().toISOString(),
      });
    }
  }
}

seed();

function kvGetAll(table) {
  const rows = db.prepare(`SELECT key, value FROM ${table}`).all();
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

function kvSet(table, key, value) {
  db.prepare(`INSERT INTO ${table} (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
    .run(key, value);
}

function kvDelete(table, key) {
  db.prepare(`DELETE FROM ${table} WHERE key = ?`).run(key);
}

module.exports = { db, slugify, ensureUniqueSlug, kvGetAll, kvSet, kvDelete };
