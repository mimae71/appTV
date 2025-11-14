
// --- Sélection des éléments du DOM ---
const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const resultsSection = document.getElementById("results");

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

// --- Fonction pour afficher les résultats dans la grille ---
function renderResults(series) {
  resultsSection.innerHTML = "";

  if (!series.length) {
    resultsSection.textContent = "Aucun résultat trouvé.";
    return;
  }

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
  resultsSection.innerHTML = "<p>Chargement...</p>";

  try {
    const response = await fetch(url, { signal });

    if (!response.ok) {
      throw new Error("Erreur réseau");
    }

    const data = await response.json();
    renderResults(data);
  } catch (error) {
    // 3. Si la requête a été annulée, on ne fait rien de plus
    if (error.name === "AbortError") {
      console.log("Requête annulée (nouvelle recherche déclenchée)");
      return;
    }

    console.error(error);
    resultsSection.innerHTML =
      "<p>Une erreur est survenue. Veuillez réessayer plus tard.</p>";
  } finally {
    // 4. On libère le controller (optionnel, mais propre)
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
    // on peut aussi annuler la requête en cours
    if (currentController) {
      currentController.abort();
      currentController = null;
    }
  }
});
