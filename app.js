// --- Sélection des éléments du DOM ---
const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const resultsSection = document.getElementById("results");
const paginationNav = document.getElementById("pagination");
const errorLiveRegion = document.getElementById("error-live-region");

// --- État global pour la pagination ---
let currentController = null;
let currentResults = [];   // tous les résultats renvoyés par l'API
let currentPage = 1;       // page en cours
const ITEMS_PER_PAGE = 4; // nombre d'items par page

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
    clearPagination();
  }
}

// --- Affichage d'un message d'erreur + annonce lecteur d'écran ---
function showError(message) {
  resultsSection.innerHTML = `<p>${message}</p>`;
  clearPagination();
  errorLiveRegion.textContent = message;
}

// --- Nettoyage de la pagination ---
function clearPagination() {
  if (paginationNav) {
    paginationNav.innerHTML = "";
  }
}

// --- Affiche une page précise à partir de currentResults ---
function renderPage(page) {
  const total = currentResults.length;
  if (!total) {
    resultsSection.innerHTML = "<p>Aucun résultat trouvé.</p>";
    clearPagination();
    return;
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  // on borne la page demandée
  currentPage = Math.min(Math.max(1, page), totalPages);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, total);
  const pageItems = currentResults.slice(startIndex, endIndex);

  // on vide d'abord la zone de résultats et l'erreur
  errorLiveRegion.textContent = "";
  resultsSection.innerHTML = "";

  // message visible pour tout le monde (annonce aussi via aria-live)
  const info = document.createElement("p");
  info.className = "results-info";
  info.textContent = `Résultats ${startIndex + 1}–${endIndex} sur ${total} (page ${currentPage}/${totalPages}).`;
  resultsSection.appendChild(info);

  // on construit la grille pour la page courante
  const fragment = document.createDocumentFragment();

  pageItems.forEach(({ show }) => {
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

  renderPagination(totalPages);
}

// --- Construit les boutons de pagination ---
function renderPagination(totalPages) {
  if (!paginationNav) return;

  paginationNav.innerHTML = "";

  if (totalPages <= 1) {
    return; // pas de pagination si une seule page
  }

  const list = document.createElement("ul");
  list.className = "pagination__list";

  const createPageButton = (label, page, options = {}) => {
    const { disabled = false, isCurrent = false } = options;

    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = "pagination__btn";

    if (disabled) {
      button.disabled = true;
      button.classList.add("is-disabled");
    }

    if (isCurrent) {
      button.classList.add("is-current");
      button.setAttribute("aria-current", "page");
    }

    if (!disabled && !isCurrent) {
      button.addEventListener("click", () => {
        changePage(page);
      });
    }

    li.appendChild(button);
    list.appendChild(li);
  };

  const total = Math.ceil(currentResults.length / ITEMS_PER_PAGE);

  // Bouton Précédent
  createPageButton("Précédent", currentPage - 1, {
    disabled: currentPage === 1,
  });

  // Boutons de pages
  for (let page = 1; page <= total; page++) {
    createPageButton(String(page), page, {
      isCurrent: page === currentPage,
    });
  }

  // Bouton Suivant
  createPageButton("Suivant", currentPage + 1, {
    disabled: currentPage === total,
  });

  paginationNav.appendChild(list);
}

// --- Change de page ---
function changePage(page) {
  renderPage(page);
}

// --- Fonction appelée après le fetch : enregistre les résultats et affiche la page 1 ---
function renderResults(series) {
  currentResults = series;
  if (!series.length) {
    resultsSection.innerHTML = "<p>Aucun résultat trouvé.</p>";
    clearPagination();
    return;
  }
  renderPage(1);
}

// --- Fonction pour effectuer la recherche avec AbortController ---
async function searchSeries(query) {
  // annuler la requête précédente si elle existe
  if (currentController) {
    currentController.abort();
  }

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
    // si on efface la recherche, on vide tout
    if (currentController) {
      currentController.abort();
      currentController = null;
    }
    currentResults = [];
    currentPage = 1;
    resultsSection.innerHTML = "";
    resultsSection.setAttribute("aria-busy", "false");
    errorLiveRegion.textContent = "";
    clearPagination();
  }
});
