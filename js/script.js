/* 
  ===============================
  CrepUra Menu Website Script
  ===============================

  This file does 5 main things:

  1. Loads products from data/products.json
  2. Renders categories and products
  3. Supports English and Arabic
  4. Sorts categories and products by order
  5. Opens and closes the product modal
*/

/* ================= GLOBAL STATE ================= */

/*
  The selected language is stored in localStorage.
  This means if the user chooses Arabic, the site remembers it next time.
*/
let currentLanguage = localStorage.getItem("crepura-language") || "en";

/*
  menuData will contain the full JSON data after loading:
  {
    categories: [],
    products: []
  }
*/
let menuData = null;

/*
  activeProduct stores the product currently shown in the modal.
  This helps us update modal text when language changes.
*/
let activeProduct = null;

/*
  Fallback image used if a product image fails to load.
*/
const FALLBACK_IMAGE = "https://placehold.co/400x400?text=Food";

/* ================= STATIC WEBSITE TEXT ================= */

/*
  Product text is stored in products.json.
  General website text is stored here.
*/
const siteText = {
  en: {
    tagline: "Shakes & Sweets",
    visitUs: "Visit Us",
    location: "Ghazieh, Lebanon",
    footerBottom: "© 2026 CrepUra. Built for speed.",
    loading: "Loading menu...",
    error: "Menu failed to load. Please try again later.",
    defaultDescription: "Indulge in our premium CrepUra specialty.",
  },

  ar: {
    tagline: "مشروبات وحلويات",
    visitUs: "زورونا",
    location: "الغازية، لبنان",
    footerBottom: "© 2026 CrepUra. صُمم للسرعة.",
    loading: "جارٍ تحميل القائمة...",
    error: "تعذر تحميل القائمة. يرجى المحاولة لاحقًا.",
    defaultDescription: "استمتعوا بأشهى أصناف CrepUra المميزة.",
  },
};

/* ================= DOM ELEMENTS ================= */

const menuContainer = document.getElementById("menu-container");
const navLinks = document.getElementById("nav-links");

const tagline = document.getElementById("tagline");
const footerTitle = document.getElementById("footer-title");
const footerLocation = document.getElementById("footer-location");
const footerBottom = document.getElementById("footer-bottom");

const langEnButton = document.getElementById("lang-en");
const langArButton = document.getElementById("lang-ar");

const modal = document.getElementById("item-modal");
const modalImg = document.getElementById("modal-img");
const modalTitle = document.getElementById("modal-title");
const modalPrice = document.getElementById("modal-price");
const modalDesc = document.getElementById("modal-desc");
const closeButton = document.querySelector(".close-btn");

/* ================= LANGUAGE HELPERS ================= */

/*
  Gets translated text from an object.

  Example:
  getText({
    en: "Nutella crepe",
    ar: "كريب نوتيلا"
  })

  If currentLanguage is "en", it returns "Nutella crepe".
  If currentLanguage is "ar", it returns "كريب نوتيلا".
*/
function getText(value) {
  if (!value) return "";

  /*
    This allows the website to still work if a value is just a normal string.
  */
  if (typeof value === "string") {
    return value;
  }

  /*
    Fallback order:
    1. Current language
    2. English
    3. Empty text
  */
  return value[currentLanguage] || value.en || "";
}

/*
  Gets general website text from siteText.
*/
function getSiteText(key) {
  return siteText[currentLanguage][key] || siteText.en[key] || "";
}

/*
  Applies the selected language to the whole page.

  English:
  <html lang="en" dir="ltr">

  Arabic:
  <html lang="ar" dir="rtl">
*/
function applyLanguageSettings() {
  const isArabic = currentLanguage === "ar";

  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = isArabic ? "rtl" : "ltr";

  tagline.textContent = getSiteText("tagline");
  footerTitle.textContent = getSiteText("visitUs");
  footerLocation.textContent = getSiteText("location");
  footerBottom.textContent = getSiteText("footerBottom");

  langEnButton.classList.toggle("active", currentLanguage === "en");
  langArButton.classList.toggle("active", currentLanguage === "ar");

  langEnButton.setAttribute("aria-pressed", currentLanguage === "en");
  langArButton.setAttribute("aria-pressed", currentLanguage === "ar");
}

/*
  Changes language and re-renders the menu.
*/
function changeLanguage(language) {
  currentLanguage = language;
  localStorage.setItem("crepura-language", language);

  applyLanguageSettings();
  renderMenu();

  /*
    If the modal is open, update its text too.
  */
  if (activeProduct) {
    fillModal(activeProduct);
  }
}

/* ================= SORTING HELPERS ================= */

/*
  Sorts categories/products by their order field.

  Missing order values go to the end.
*/
function sortByOrder(a, b) {
  const orderA = typeof a.order === "number" ? a.order : 9999;
  const orderB = typeof b.order === "number" ? b.order : 9999;

  return orderA - orderB;
}

/*
  Gets categories sorted by category.order.
*/
function getSortedCategories() {
  if (!menuData || !Array.isArray(menuData.categories)) {
    return [];
  }

  return menuData.categories.slice().sort(sortByOrder);
}

/*
  Gets products for one category, sorted by product.order.

  The order is per category.
  So this is valid:

  Crepes:
  - order 1
  - order 2

  Shakes:
  - order 1
  - order 2
*/
function getProductsForCategory(categoryId) {
  if (!menuData || !Array.isArray(menuData.products)) {
    return [];
  }

  return menuData.products
    .filter(function (product) {
      return product.categoryId === categoryId && product.isAvailable !== false;
    })
    .slice()
    .sort(function (a, b) {
      const orderDifference = sortByOrder(a, b);

      if (orderDifference !== 0) {
        return orderDifference;
      }

      /*
        If two products accidentally have the same order inside the same category,
        sort them alphabetically by the current language.
      */
      return getText(a.name).localeCompare(getText(b.name), currentLanguage);
    });
}

/* ================= LOADING MENU DATA ================= */

/*
  Loads menu data from data/products.json.
*/
async function loadMenu() {
  try {
    showStatusMessage(getSiteText("loading"));

    const response = await fetch("data/products.json");

    if (!response.ok) {
      throw new Error("Could not load products.json");
    }

    menuData = await response.json();

    renderMenu();
  } catch (error) {
    console.error("Menu failed to load:", error);
    showStatusMessage(getSiteText("error"), true);
  }
}

/*
  Shows loading or error message in the menu area.
*/
function showStatusMessage(message, isError) {
  menuContainer.innerHTML = "";

  const paragraph = document.createElement("p");
  paragraph.className = isError ? "status-message error" : "status-message";

  paragraph.textContent = message;

  menuContainer.appendChild(paragraph);
}

/* ================= MENU RENDERING ================= */

/*
  Renders the full menu:
  - category navigation buttons
  - category sections
  - product cards
*/
function renderMenu() {
  if (!menuData) return;

  menuContainer.innerHTML = "";
  navLinks.innerHTML = "";

  const categories = getSortedCategories();

  categories.forEach(function (category, index) {
    createCategoryNavLink(category, index);
    createCategorySection(category, index);
  });
}

/*
  Creates one button/link in the sticky category navigation.
*/
function createCategoryNavLink(category, index) {
  const link = document.createElement("a");

  link.className = index === 0 ? "nav-link active" : "nav-link";
  link.href = "#" + category.id;
  link.textContent = getText(category.name);

  link.addEventListener("click", function () {
    document.querySelectorAll(".nav-link").forEach(function (item) {
      item.classList.remove("active");
    });

    link.classList.add("active");
  });

  navLinks.appendChild(link);
}

/*
  Creates one category section with its products.
*/
function createCategorySection(category, index) {
  const section = document.createElement("section");

  section.id = category.id;
  section.className = "category-section";

  if (index !== 0) {
    const divider = document.createElement("hr");
    divider.className = "category-divider";
    section.appendChild(divider);
  }

  const title = document.createElement("h2");
  title.className = "category-title";
  title.textContent = getText(category.name);
  section.appendChild(title);

  const grid = document.createElement("div");
  grid.className = "grid";

  const products = getProductsForCategory(category.id);

  products.forEach(function (product) {
    const card = createProductCard(product);
    grid.appendChild(card);
  });

  section.appendChild(grid);
  menuContainer.appendChild(section);
}

/*
  Creates one product card.
*/
function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "card";

  card.addEventListener("click", function () {
    showModal(product);
  });

  /*
    Image container with skeleton loading.
  */
  const imgContainer = document.createElement("div");
  imgContainer.className = "card-img-container";

  const img = document.createElement("img");
  img.src = product.image;
  img.alt = getText(product.name);
  img.loading = "lazy";

  img.addEventListener("load", function () {
    imgContainer.classList.add("loaded");
  });

  img.addEventListener("error", function () {
    imgContainer.classList.add("loaded");

    if (img.src !== FALLBACK_IMAGE) {
      img.src = FALLBACK_IMAGE;
    }
  });

  imgContainer.appendChild(img);

  /*
    Product information.
  */
  const info = document.createElement("div");
  info.className = "card-info";

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = getText(product.name);

  const price = document.createElement("p");
  price.className = "card-price";
  price.textContent = product.price;

  info.appendChild(title);
  info.appendChild(price);

  card.appendChild(imgContainer);
  card.appendChild(info);

  return card;
}

/* ================= MODAL ================= */

/*
  Opens the modal.
*/
function showModal(product) {
  activeProduct = product;

  fillModal(product);

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");

  document.body.style.overflow = "hidden";
}

/*
  Fills the modal with product data.
*/
function fillModal(product) {
  modalImg.src = product.image;
  modalImg.alt = getText(product.name);

  modalTitle.textContent = getText(product.name);
  modalPrice.textContent = product.price;

  modalDesc.textContent =
    getText(product.description) || getSiteText("defaultDescription");
}

/*
  Closes the modal.
*/
function closeModal() {
  activeProduct = null;

  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");

  document.body.style.overflow = "auto";
}

/* ================= EVENT LISTENERS ================= */

langEnButton.addEventListener("click", function () {
  changeLanguage("en");
});

langArButton.addEventListener("click", function () {
  changeLanguage("ar");
});

closeButton.addEventListener("click", closeModal);

/*
  Close modal when clicking the dark overlay outside the white modal box.
*/
modal.addEventListener("click", function (event) {
  if (event.target === modal) {
    closeModal();
  }
});

/*
  Close modal with Escape key.
*/
window.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && modal.classList.contains("active")) {
    closeModal();
  }
});

/*
  Fallback image for modal image.
*/
modalImg.addEventListener("error", function () {
  if (modalImg.src !== FALLBACK_IMAGE) {
    modalImg.src = FALLBACK_IMAGE;
  }
});

/* ================= START WEBSITE ================= */

/*
  1. Apply saved language.
  2. Load products.
*/
applyLanguageSettings();
loadMenu();
