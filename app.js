
// --- Sélection des éléments du DOM ---
const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const resultsSection = document.getElementById("results");

// --- Région d'erreur pour les lecteurs d'écran (créée en JS) ---
const errorLiveRegion = document.getElementById("error-live-region");
// --- AbortController courant (pour la dernière requête) ---
let currentController = null;

// --- Fonction utilitaire : debounce générique ---
function debounce(fn, delay = 400) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// --- Fonction pour construire l'URL de recherche ---
function buildSearchUrl(query) {
  const encoded = encodeURIComponent(query.trim());
  return `https://api.tvmaze.com/search/shows?q=${encoded}`;
}

// --- Gestion de l'état de chargement (visuel + aria) ---
function setLoading(isLoading) {
  resultsSection.setAttribute("aria-busy", String(isLoading));

  if (isLoading) {
    resultsSection.innerHTML = "<p>Chargement…</p>";
  }
}

// --- Affichage d'un message d'erreur + annonce pour lecteur d'écran ---
function showError(message) {
  resultsSection.innerHTML = `<p>${message}</p>`;
  errorLiveRegion.textContent = message;
}

// --- Fonction pour afficher les résultats dans la grille ---
function renderResults(series) {
  // on efface l'erreur précédente le cas échéant
  errorLiveRegion.textContent = "";
  resultsSection.innerHTML = "";

  if (!series.length) {
    const message = "Aucun résultat trouvé.";
    resultsSection.textContent = message;
    return;
  }

  // Affichage du nombre de résultats (annoncé automatiquement)
  resultsSection.innerHTML = `<p class="results-info">${series.length} résultat(s).</p>`;

  const fragment = document.createDocumentFragment();

  series.forEach(({ show }) => {
    const imageUrl = show.image
      ? show.image.medium
      : "https://placehold.co/210x295?text=No+Image";

    const title = show.name ?? "Titre inconnu";

    const article = document.createElement("article");
    article.classList.add("card");

    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = `Affiche de la série ${title}`;

    const p = document.createElement("p");
    p.classList.add("card-title");
    p.textContent = title;

    article.appendChild(img);
    article.appendChild(p);

    fragment.appendChild(article);
  });

  resultsSection.appendChild(fragment);
}
//   // petite info pour les lecteurs d'écran : nombre de résultats
//   const info = document.createElement("p");
//   info.textContent = `${series.length} série(s) trouvée(s).`;
//   Object.assign(info.style, {
//     position: "absolute",
//     width: "1px",
//     height: "1px",
//     padding: "0",
//     margin: "-1px",
//     border: "0",
//     overflow: "hidden",
//     clip: "rect(0 0 0 0)",
//     clipPath: "inset(50%)",
//     whiteSpace: "nowrap",
//   });

//   resultsSection.prepend(info);
// }

// --- Fonction pour effectuer la recherche avec AbortController ---
async function searchSeries(query) {
  // 1. Annuler la requête précédente si elle existe
  if (currentController) {
    currentController.abort();
  }

  // 2. Créer un nouveau controller pour cette requête
  currentController = new AbortController();
  const { signal } = currentController;

  const url = buildSearchUrl(query);
  setLoading(true);

  try {
    const response = await fetch(url, { signal });

    if (!response.ok) {
      throw new Error("Erreur réseau");
    }

    const data = await response.json();
    renderResults(data);
  } catch (error) {
    // si la requête a été annulée, on ne fait rien
    if (error.name === "AbortError") {
      console.log("Requête annulée (nouvelle recherche déclenchée)");
      return;
    }

    console.error(error);
    showError("Une erreur est survenue. Veuillez réessayer plus tard.");
  } finally {
    setLoading(false);
    currentController = null;
  }
}

// --- Gestion du submit du formulaire (clic sur le bouton ou Enter) ---
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = input.value;

  if (query.trim().length === 0) {
    return;
  }

  searchSeries(query);
});

// --- Recherche live avec debounce ---
const handleLiveSearch = debounce((query) => {
  searchSeries(query);
}, 400);

input.addEventListener("input", () => {
  const query = input.value.trim();

  if (query.length >= 2) {
    handleLiveSearch(query);
  } else {
    // si on efface la recherche, on vide les résultats
    resultsSection.innerHTML = "";
    resultsSection.setAttribute("aria-busy", "false");
    errorLiveRegion.textContent = "";

    // on annule aussi une éventuelle requête en cours
    if (currentController) {
      currentController.abort();
      currentController = null;
    }
  }
})
