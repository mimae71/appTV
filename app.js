// --- Sélection des éléments du DOM ---
const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const resultsSection = document.getElementById("results");

// --- Fonction gestion du submit du formulaire ---

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = input.value;

  if (query.trim().length === 0) {
    return;
  }
  searchSeries(query);
});

// --- Fonction pour construire l'URL de recherche ---
function buildSearchUrl(query) {
  const encoded = encodeURIComponent(query.trim());
  return `https://api.tvmaze.com/search/shows?q=${encoded}`;
}

// --- Fonction pour effectuer la recherche ---
async function searchSeries(query) {
  const url = buildSearchUrl(query);
  resultsSection.innerHTML = "<p>Chargement...</p>";
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Erreur réseau");
    }
    const data = await response.json();
    console.log(data);
    renderResults(data);
  } catch (error) {
    console.log(error);
    resultsSection.innerHTML =
      "<p>Une erreur est survenue. Veuillez réessayer plus tard.</p>";
  } finally {
  }
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
