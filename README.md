# Site des Mousquetaires Des Mers (MDM91)

Site web moderne et auto-hébergé pour le club de plongée **Les Mousquetaires Des Mers** (Essonne) : présentation, adhésion, contacts, calendrier/formations, actualités/bulles d'info, galerie photo — avec un espace d'administration complet permettant de tout piloter (contenus, thème, bannières, formulaires) sans toucher au code.

## Sommaire

- [Stack technique](#stack-technique)
- [Fonctionnalités](#fonctionnalités)
- [Démarrage avec Docker (recommandé)](#démarrage-avec-docker-recommandé)
- [Déploiement derrière un reverse proxy (sous-chemin)](#déploiement-derrière-un-reverse-proxy-sous-chemin)
- [Démarrage sans Docker](#démarrage-sans-docker)
- [Variables d'environnement](#variables-denvironnement)
- [Compte admin par défaut](#compte-admin-par-défaut)
- [Structure du projet](#structure-du-projet)
- [Référencement (SEO)](#référencement-seo)
- [Données persistantes & sauvegardes](#données-persistantes--sauvegardes)

## Stack technique

- **Node.js + Express** — serveur web, rendu de pages en **EJS** (rendu 100% côté serveur, pas de build front à maintenir, et directement lisible par les moteurs de recherche)
- **SQLite** (`better-sqlite3`) — base de données fichier, zéro configuration, adaptée à un petit site associatif
- **Sessions + bcrypt** (`express-session`, `connect-sqlite3`, `bcryptjs`) — authentification admin sécurisée (mot de passe haché, sessions persistées en base)
- **Helmet** — en-têtes HTTP de sécurité
- **Multer** — upload des photos et des bannières
- **sharp** — génération automatique de plusieurs tailles d'image pour les bannières responsives
- **Docker / docker-compose** — déploiement en une seule commande, identique sur n'importe quelle machine, avec volumes persistants pour la base et les fichiers uploadés

## Fonctionnalités

**Pages publiques**
- Accueil, Présentation, Adhésion, Contacts, Calendrier/Formations, Bulles d'info & actualités (filtre par catégorie), Photos (galerie par album)
- Formulaires **Adhésion** et **Contact** fonctionnels (piège à robots anti-spam inclus), qui remplissent la boîte de réception admin
- Navigation avec l'onglet courant mis en évidence, y compris sur les sous-pages
- Mode sombre / clair (bouton dédié, préférence mémorisée, clair par défaut)
- Bannières responsives par section (générées en plusieurs tailles, dégradé de couleur en repli si aucune image n'est définie)

**Espace admin** (`/admin`, protégé par identifiant/mot de passe)
- Tableau de bord : actualités, photos, compteur de messages non lus
- Actualités / bulles d'info / calendrier : création, édition, suppression
- Photos : upload par album avec légende et crédit
- Pages éditables (Présentation, Adhésion, Contacts, intro Calendrier)
- **Messages** (`/admin/messages`) : soumissions des formulaires Adhésion/Contact, marquage lu/non lu
- **Thème** (`/admin/theme`) : les 6 couleurs de la charte modifiables via sélecteurs de couleur (répercutées sur tout le site), réinitialisation en un clic, upload d'un logo personnalisé (remplace l'icône d'en-tête et le favicon)
- **Bannières** (`/admin/bannieres`) : upload d'une image par section, génération automatique de 3 tailles (480/960/1600px)
- **Textes** (`/admin/textes`) : tous les textes de l'interface (titres, boutons, messages...) modifiables individuellement, avec retour à la valeur par défaut
- Changement de mot de passe

**Référencement** : voir la section [dédiée](#référencement-seo) plus bas.

## Démarrage avec Docker (recommandé)

1. Copiez `.env.example` en `.env` et personnalisez au minimum `ADMIN_PASSWORD` et `SESSION_SECRET` :
   ```bash
   cp .env.example .env
   ```
2. Lancez tout en une seule commande :
   ```bash
   docker compose up -d --build
   ```
3. Le site est accessible sur **http://localhost** (port **80** par défaut).

Pour utiliser un autre port sans éditer `.env`, passez `HOST_PORT` directement dans la commande de démarrage :

```bash
# Linux / macOS
HOST_PORT=8080 docker compose up -d --build
```

```powershell
# Windows PowerShell
$env:HOST_PORT=8080; docker compose up -d --build
```

Le site sera alors accessible sur `http://localhost:8080`. Cette valeur peut aussi être fixée durablement dans `.env` (variable `HOST_PORT`).

Connectez-vous à l'admin sur `http://localhost/admin/login` (ou `http://localhost:<port>/admin/login`) avec les identifiants définis dans `.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`).

Les données (base SQLite, photos, bannières, logo) sont stockées dans `./data` et `./src/public/uploads` sur la machine hôte : elles survivent aux redémarrages, aux `docker compose down` et aux reconstructions de l'image.

Pour arrêter le site : `docker compose down` (les données restent sur le disque). Pour tout arrêter en supprimant aussi les données : supprimez en plus les dossiers `./data` et `./src/public/uploads`.

## Déploiement derrière un reverse proxy (sous-chemin)

Par défaut, le site est prévu pour être servi à la racine d'un domaine (`https://exemple.fr/`). Si un reverse proxy (nginx, Traefik, Caddy...) doit exposer le site sous un sous-dossier plutôt qu'à la racine — par exemple `https://exemple.fr/mdm91/` — définissez la variable `BASE_PATH` : toutes les routes, liens internes, formulaires, fichiers statiques (CSS/JS/favicon/photos/bannières), redirections, ainsi que `robots.txt`/`sitemap.xml`, s'adaptent automatiquement à ce préfixe.

Comme pour `HOST_PORT`, `BASE_PATH` peut être fixée dans `.env` ou passée directement dans la commande de démarrage :

```bash
# Linux / macOS
BASE_PATH=/mdm91 docker compose up -d --build
```

```powershell
# Windows PowerShell
$env:BASE_PATH="/mdm91"; docker compose up -d --build
```

Le site répond alors uniquement sur `http://localhost/mdm91/...` (une requête hors de ce préfixe renvoie une 404, comme attendu). Configurez ensuite votre reverse proxy pour transmettre les requêtes de `/mdm91/` vers ce conteneur sur son port interne (3000), en conservant le préfixe dans le chemin transmis (pas de réécriture qui le retirerait).

Sans `BASE_PATH` défini (ou vide), le site continue de fonctionner normalement à la racine, comme aujourd'hui — aucune configuration supplémentaire n'est nécessaire pour un déploiement classique.

## Démarrage sans Docker

```bash
npm install
cp .env.example .env   # puis éditez les valeurs
npm start
```
Le site écoute par défaut sur le port défini par `PORT` dans `.env` (3000 si absent — la variable `HOST_PORT`, elle, ne s'applique qu'au mode Docker).

## Variables d'environnement

Toutes définies dans `.env` (voir `.env.example`) :

| Variable | Rôle | Défaut |
|---|---|---|
| `HOST_PORT` | Port exposé sur la machine hôte (Docker uniquement) | `80` |
| `BASE_PATH` | Préfixe de chemin si le site est servi sous un sous-dossier via un reverse proxy (ex: `/mdm91`) — voir [section dédiée](#déploiement-derrière-un-reverse-proxy-sous-chemin) | *(vide, racine)* |
| `ADMIN_USERNAME` | Identifiant du compte admin créé au tout premier démarrage | `admin` |
| `ADMIN_PASSWORD` | Mot de passe du compte admin créé au tout premier démarrage | *(à définir)* |
| `SESSION_SECRET` | Clé de signature des cookies de session — à changer en production | *(à définir)* |
| `PORT` | Port d'écoute interne de Node (mode sans Docker uniquement) | `3000` |
| `DATA_DIR` | Emplacement de la base SQLite (géré automatiquement par Docker) | `./data` |

## Compte admin par défaut

Au tout premier démarrage (base vide), un compte admin est créé automatiquement à partir de `ADMIN_USERNAME` / `ADMIN_PASSWORD`. **Changez ce mot de passe dès la première connexion** via "Mot de passe" dans le tableau de bord, ou changez `ADMIN_PASSWORD` dans `.env` avant le tout premier démarrage (il n'a d'effet qu'à la création initiale du compte, pas ensuite).

## Structure du projet

```
server.js                     point d'entrée Express, middlewares globaux
src/db.js                     connexion SQLite, schéma, contenu initial
src/texts.js                  textes éditables (clés, valeurs par défaut, regroupement admin)
src/theme.js                  couleurs de la charte (défauts, lecture/écriture)
src/banners.js                bannières par section (lecture, sections valides)
src/logo.js                   logo personnalisé (en-tête + favicon)
src/utils/format.js           césure contrôlée des textes (espaces insécables)
src/utils/icons.js            icônes SVG inline
src/routes/public.js          routes publiques + formulaires + robots.txt/sitemap.xml
src/routes/admin.js           routes admin (auth, CRUD, thème, bannières, textes, messages)
src/views/                    templates EJS (pages publiques + admin)
src/public/css/style.css      design du site (variables CSS, thème clair/sombre)
src/public/js/main.js         menu mobile, bascule thème
src/public/uploads/           photos, bannières, logo (persistant via volume Docker)
data/                         base SQLite + sessions (persistant via volume Docker)
Dockerfile, docker-compose.yml, .dockerignore, .env.example
```

## Référencement (SEO)

Le site étant entièrement rendu côté serveur, chaque page envoyée à un robot d'indexation contient déjà le HTML complet (aucune génération statique n'est nécessaire, ni souhaitable puisque le contenu est modifiable en direct depuis l'admin). En complément :

- `/robots.txt` et `/sitemap.xml` sont générés dynamiquement à partir du contenu réel de la base (toujours à jour, s'adaptent automatiquement au nom de domaine)
- Titre et description uniques par page (articles, pages, catégories)
- Balises Open Graph / Twitter Card (aperçus de partage sur Facebook, WhatsApp, LinkedIn, Discord, X...) avec une **vignette 1200×630 générée automatiquement pour chaque page** (`/og/<page>.png`, ex. `/og/accueil.png`, `/og/actualites/<slug>.png`) : couleurs du thème, titre et catégorie de la page, logo personnalisé et bannière de la section en fond si définis. Les vignettes sont mises en cache en mémoire et se régénèrent dès que le contenu, le thème, le logo ou la bannière change (code : `src/og.js`)
- URL canonique sur chaque page publique
- `noindex, nofollow` automatique sur tout l'espace `/admin`
- Données structurées JSON-LD (`SportsOrganization`) sur la page d'accueil

## Données persistantes & sauvegardes

Deux emplacements à sauvegarder régulièrement :
- `./data/mdm91.sqlite` — tout le contenu du site (actus, pages, textes, couleurs, comptes admin, messages reçus)
- `./src/public/uploads/` — photos, bannières et logo uploadés

Une simple copie de ces deux dossiers (site arrêté, ou via un outil de sauvegarde à chaud compatible SQLite) suffit à restaurer le site à l'identique ailleurs.

## Contenu repris du site actuel

Le contenu initial (présentation du club, adhésion, contacts, quelques actualités/événements) a été récupéré depuis mdm91.gramacitee.com le 17-18/09/2026 afin que le nouveau site ne parte pas vide. Tout est modifiable depuis l'espace admin.
