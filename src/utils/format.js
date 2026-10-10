const NBSP = ' ';

// Joint tous les mots d'un texte par des espaces insécables, sauf l'espace
// juste avant `pivotWord`, qui reste un espace normal. C'est donc le seul
// endroit où le navigateur peut couper la ligne. Si le mot pivot n'est pas
// trouvé dans le texte (ex: texte personnalisé par un admin), le texte est
// renvoyé tel quel et le navigateur choisit librement où couper.
function breakBefore(text, pivotWord) {
  if (!text) return '';
  const words = text.split(' ').filter((w) => w.length > 0);
  const pivotIndex = words.findIndex((w, i) => i > 0 && w.toLowerCase() === pivotWord.toLowerCase());
  if (pivotIndex === -1) return text;
  return words
    .map((w, i) => {
      if (i === 0) return w;
      const sep = i === pivotIndex ? ' ' : NBSP;
      return sep + w;
    })
    .join('');
}

module.exports = { breakBefore };
