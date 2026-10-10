// Définition de tous les textes "en dur" du site rendus éditables depuis
// /admin/textes. Chaque entrée a une valeur par défaut (utilisée tant que
// l'admin n'a rien changé) et est rangée dans un groupe pour l'affichage
// admin. La clé est utilisée dans les vues via t('groupe.cle').
const TEXT_DEFINITIONS = [
  // En-tête / pied de page
  { key: 'header.club_name', group: 'En-tête', label: 'Nom du club (en-tête)', type: 'text', default: 'Les Mousquetaires Des Mers' },
  { key: 'header.subtitle', group: 'En-tête', label: 'Sous-titre (en-tête)', type: 'text', default: "Club de plongée dans l'Essonne" },
  { key: 'footer.tagline', group: 'Pied de page', label: 'Texte sous le nom du club', type: 'text', default: 'Association loi 1901 affiliée FFESSM & CMAS — Essonne (91)' },
  { key: 'footer.copy', group: 'Pied de page', label: 'Texte de copyright (après l\'année)', type: 'text', default: 'Les Mousquetaires Des Mers — Site propulsé par une palanquée de bénévoles 🌊' },

  // Accueil
  { key: 'home.hero.eyebrow', group: 'Accueil', label: "Accroche au-dessus du titre", type: 'text', default: 'Essonne · FFESSM · CMAS' },
  { key: 'home.hero.title', group: 'Accueil', label: 'Titre principal', type: 'text', default: 'Plongez avec Les Mousquetaires Des Mers' },
  { key: 'home.hero.subtitle', group: 'Accueil', label: 'Sous-titre', type: 'textarea', default: "Cours piscine, sorties en carrière et en mer, formations FFESSM du baptême au Niveau 3 : rejoignez un club associatif chaleureux, actif depuis plus de 30 ans dans l'Essonne." },
  { key: 'home.hero.cta_primary', group: 'Accueil', label: 'Bouton principal', type: 'text', default: 'Rejoindre le club' },
  { key: 'home.hero.cta_secondary', group: 'Accueil', label: 'Bouton secondaire', type: 'text', default: 'Voir les photos' },
  { key: 'home.news.title', group: 'Accueil', label: 'Titre section actualités', type: 'text', default: 'Dernières actualités' },
  { key: 'home.news.more', group: 'Accueil', label: 'Lien "voir plus" actualités', type: 'text', default: 'Toutes les actualités →' },
  { key: 'home.news.empty', group: 'Accueil', label: 'Message si aucune actualité', type: 'text', default: 'Aucune actualité publiée pour le moment.' },
  { key: 'home.photos.title', group: 'Accueil', label: 'Titre section photos', type: 'text', default: 'Dernières photos' },
  { key: 'home.photos.more', group: 'Accueil', label: 'Lien "voir plus" photos', type: 'text', default: 'Toute la galerie →' },
  { key: 'home.photos.empty', group: 'Accueil', label: 'Message si aucune photo', type: 'text', default: "Aucune photo publiée pour le moment — l'équipe du club ajoutera bientôt des souvenirs de plongée !" },
  { key: 'home.highlight1.title', group: 'Accueil', label: 'Vignette 1 — titre', type: 'text', default: 'Cours piscine' },
  { key: 'home.highlight1.text', group: 'Accueil', label: 'Vignette 1 — texte', type: 'textarea', default: 'Mercredi et vendredi de 20h30 à 23h30 à Breuillet, encadrés par nos moniteurs FFESSM.' },
  { key: 'home.highlight2.title', group: 'Accueil', label: 'Vignette 2 — titre', type: 'text', default: 'Fosse de plongée' },
  { key: 'home.highlight2.text', group: 'Accueil', label: 'Vignette 2 — texte', type: 'textarea', default: 'Séances en profondeur certains vendredis soir à Antony, dans un cadre sécurisé.' },
  { key: 'home.highlight3.title', group: 'Accueil', label: 'Vignette 3 — titre', type: 'text', default: 'Formations FFESSM' },
  { key: 'home.highlight3.text', group: 'Accueil', label: 'Vignette 3 — texte', type: 'textarea', default: 'Du baptême aux Niveaux 1, 2, 3, en passant par le RIFAP, N5, Rescue et EFR.' },
  { key: 'home.highlight4.title', group: 'Accueil', label: 'Vignette 4 — titre', type: 'text', default: 'Sorties & voyages' },
  { key: 'home.highlight4.text', group: 'Accueil', label: 'Vignette 4 — texte', type: 'textarea', default: 'Validations en Méditerranée, sorties carrière et voyages organisés entre membres.' },

  // Bulles d'info / actualités
  { key: 'actualites.title', group: "Bulles d'info", label: 'Titre de page', type: 'text', default: "Bulles d'info & actualités" },
  { key: 'actualites.subtitle', group: "Bulles d'info", label: 'Sous-titre de page', type: 'text', default: 'Toutes les nouvelles du club : vie associative, formations, sorties et événements.' },
  { key: 'actualites.empty', group: "Bulles d'info", label: 'Message si aucun article', type: 'text', default: 'Aucun article dans cette catégorie pour le moment.' },
  { key: 'actualites.filter.all', group: "Bulles d'info", label: 'Filtre "Tout"', type: 'text', default: 'Tout' },
  { key: 'actualites.filter.actu', group: "Bulles d'info", label: 'Filtre "Actualités"', type: 'text', default: 'Actualités' },
  { key: 'actualites.filter.bulle', group: "Bulles d'info", label: 'Filtre "Bulles d\'info"', type: 'text', default: "Bulles d'info" },
  { key: 'actualites.filter.evenement', group: "Bulles d'info", label: 'Filtre "Événements"', type: 'text', default: 'Événements' },
  { key: 'actualites.filter.calendrier', group: "Bulles d'info", label: 'Filtre "Calendrier / Formations"', type: 'text', default: 'Calendrier / Formations' },
  { key: 'post.back', group: "Bulles d'info", label: 'Lien retour (article)', type: 'text', default: '← Retour aux actualités' },

  // Calendrier
  { key: 'calendrier.title', group: 'Calendrier', label: 'Titre de page (si aucune intro admin)', type: 'text', default: 'Calendrier / Formations' },
  { key: 'calendrier.upcoming_title', group: 'Calendrier', label: 'Titre section échéances', type: 'text', default: 'Prochaines échéances' },
  { key: 'calendrier.empty', group: 'Calendrier', label: 'Message si aucune échéance', type: 'text', default: 'Aucune échéance publiée pour le moment.' },

  // Photos
  { key: 'photos.title', group: 'Photos', label: 'Titre de page', type: 'text', default: 'Photos & souvenirs de plongée' },
  { key: 'photos.subtitle', group: 'Photos', label: 'Sous-titre de page', type: 'text', default: 'Les meilleurs moments du club, sorties, formations et soirées.' },
  { key: 'photos.empty', group: 'Photos', label: 'Message si aucune photo', type: 'textarea', default: "Aucune photo publiée pour le moment. Les photos ajoutées par l'équipe du club apparaîtront ici." },

  // Adhésion
  { key: 'adhesion.form.title', group: 'Adhésion', label: 'Titre du formulaire', type: 'text', default: 'Formulaire de pré-inscription' },
  { key: 'adhesion.form.intro', group: 'Adhésion', label: 'Texte au-dessus du formulaire', type: 'textarea', default: 'Laissez-nous vos coordonnées, un membre du bureau vous recontactera rapidement pour finaliser votre inscription.' },
  { key: 'adhesion.form.submit', group: 'Adhésion', label: 'Texte du bouton d\'envoi', type: 'text', default: 'Envoyer ma demande' },
  { key: 'adhesion.form.success', group: 'Adhésion', label: 'Message de confirmation', type: 'textarea', default: 'Merci ! Votre demande a bien été envoyée, un membre du bureau revient vers vous rapidement.' },

  // Contacts
  { key: 'contacts.form.title', group: 'Contacts', label: 'Titre du formulaire', type: 'text', default: 'Nous écrire' },
  { key: 'contacts.form.intro', group: 'Contacts', label: 'Texte au-dessus du formulaire', type: 'textarea', default: 'Une question ? Écrivez-nous, nous vous répondrons dès que possible.' },
  { key: 'contacts.form.submit', group: 'Contacts', label: 'Texte du bouton d\'envoi', type: 'text', default: 'Envoyer le message' },
  { key: 'contacts.form.success', group: 'Contacts', label: 'Message de confirmation', type: 'textarea', default: 'Merci, votre message a bien été envoyé ! Nous vous répondrons dès que possible.' },

  // Page 404
  { key: '404.title', group: 'Page 404', label: 'Titre', type: 'text', default: '🫧 404' },
  { key: '404.text', group: 'Page 404', label: 'Texte', type: 'text', default: 'Cette page a coulé au fond de l\'eau… Retour à la surface :' },
  { key: '404.cta', group: 'Page 404', label: 'Bouton', type: 'text', default: 'Accueil' },
];

const DEFAULT_TEXTS = {};
for (const t of TEXT_DEFINITIONS) DEFAULT_TEXTS[t.key] = t.default;

const GROUPS = [];
for (const t of TEXT_DEFINITIONS) if (!GROUPS.includes(t.group)) GROUPS.push(t.group);

function makeT(storedMap) {
  return function t(key) {
    const v = storedMap[key];
    if (v !== undefined && v !== null && v !== '') return v;
    return DEFAULT_TEXTS[key] !== undefined ? DEFAULT_TEXTS[key] : key;
  };
}

module.exports = { TEXT_DEFINITIONS, DEFAULT_TEXTS, GROUPS, makeT };
