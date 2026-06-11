/*
  ===============================
  961 Food Digital Menu Script
  Mobile-first version
  ===============================
*/

let currentLanguage = localStorage.getItem("restaurant-language") || "en";

let menuData = null;

let activeProduct = null;

const FALLBACK_IMAGE = "https://placehold.co/400x400?text=Food";

const siteText = {
  en: {
    tagline: "Snacks & More",
    visitUs: "Visit Us",
    location: "Lebanon",
    footerBottom: "© 2026 961 Food. Built for speed.",
    loading: "Loading menu...",
    error: "Menu failed to load. Please try again later.",
    defaultDescription: "Fresh fast food favorite from 961 Food.",
    offer: "Offer",
  },

  ar: {
    tagline: "سناكس وأكثر",
    visitUs: "زورونا",
    location: "لبنان",
    footerBottom: "© 2026 961 Food. صُمم للسرعة.",
    loading: "جارٍ تحميل القائمة...",
    error: "تعذر تحميل القائمة. يرجى المحاولة لاحقًا.",
    defaultDescription: "طبق فاست فود مميز من 961 Food.",
    offer: "عرض",
  },
};

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

/* ===============================
   LANGUAGE
================================ */

function getText(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return value[currentLanguage] || value.en || "";
}

function getSiteText(key) {
  return siteText[currentLanguage][key] || siteText.en[key] || "";
}

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

function changeLanguage(language) {
  currentLanguage = language;

  localStorage.setItem("restaurant-language", language);

  applyLanguageSettings();

  renderMenu();

  if (activeProduct) {
    fillModal(activeProduct);
  }
}

/* ===============================
   SORTING
================================ */

function sortByOrder(a, b) {
  const orderA = typeof a.order === "number" ? a.order : 9999;
  const orderB = typeof b.order === "number" ? b.order : 9999;

  return orderA - orderB;
}

function getSortedCategories() {
  if (!menuData || !Array.isArray(menuData.categories)) {
    return [];
  }

  return menuData.categories.slice().sort(sortByOrder);
}

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

      return getText(a.name).localeCompare(getText(b.name), currentLanguage);
    });
}

/* ===============================
   LOAD MENU
================================ */

async function loadMenu() {
  try {
    showStatusMessage(getSiteText("loading"));

    const response = await fetch("data/products.json");

    if (!response.ok) {
      throw new Error("Could not load data/products.json");
    }

    menuData = await response.json();

    renderMenu();
  } catch (error) {
    console.error("Menu failed to load:", error);
    showStatusMessage(getSiteText("error"), true);
  }
}

function showStatusMessage(message, isError = false) {
  menuContainer.innerHTML = "";

  const paragraph = document.createElement("p");

  paragraph.className = isError ? "status-message error" : "status-message";

  paragraph.textContent = message;

  menuContainer.appendChild(paragraph);
}

/* ===============================
   RENDER MENU
================================ */

function renderMenu() {
  if (!menuData) return;

  menuContainer.innerHTML = "";
  navLinks.innerHTML = "";

  const categories = getSortedCategories();

  categories.forEach(function (category, index) {
    createCategoryNavLink(category, index);
    createCategorySection(category, index);
  });

  setFirstNavLinkActive();
  setupScrollSpy();

  /*
    If the page opens with a hash like #extras,
    scroll to it correctly after rendering.
  */
  if (window.location.hash) {
    const categoryId = window.location.hash.replace("#", "");

    window.setTimeout(function () {
      scrollToCategory(categoryId);
    }, 100);
  }
}

function createCategoryNavLink(category, index) {
  const link = document.createElement("a");

  link.className = index === 0 ? "nav-link active" : "nav-link";
  link.href = "#" + category.id;
  link.dataset.categoryId = category.id;
  link.textContent = getText(category.name);

  link.addEventListener("click", function (event) {
    event.preventDefault();
    scrollToCategory(category.id);
  });

  navLinks.appendChild(link);
}

function createCategorySection(category, index) {
  const section = document.createElement("section");

  section.id = category.id;
  section.className = "category-section";
  section.dataset.categoryId = category.id;

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

function createProductCard(product) {
  const card = document.createElement("article");

  card.className = "card";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", getText(product.name));

  card.addEventListener("click", function () {
    showModal(product);
  });

  card.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      showModal(product);
    }
  });

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

    if (!img.src.includes("placehold.co")) {
      img.src = FALLBACK_IMAGE;
    }
  });

  imgContainer.appendChild(img);

  const info = document.createElement("div");
  info.className = "card-info";

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = getText(product.name);

  const price = document.createElement("p");
  price.className = "card-price";

  price.textContent =
    product.price && product.price.trim()
      ? product.price
      : getSiteText("offer");

  info.appendChild(title);
  info.appendChild(price);

  card.appendChild(imgContainer);
  card.appendChild(info);

  return card;
}

/* ===============================
   MOBILE-FIRST SCROLL HIGHLIGHT
================================ */

let currentActiveCategoryId = null;
let scrollSpyFrame = null;

/*
  This lock prevents the scroll spy from immediately re-highlighting
  the previous category during smooth scrolling.
*/
let scrollSpyLockedUntil = 0;

function setFirstNavLinkActive() {
  const firstLink = document.querySelector(".nav-link");

  if (!firstLink) return;

  currentActiveCategoryId = firstLink.dataset.categoryId;

  document.querySelectorAll(".nav-link").forEach(function (link) {
    link.classList.remove("active");
  });

  firstLink.classList.add("active");
}

function setActiveNavLink(categoryId, force = false) {
  if (!categoryId) return;

  if (!force && categoryId === currentActiveCategoryId) {
    return;
  }

  currentActiveCategoryId = categoryId;

  /*
    Important:
    remove active from every link first, then add it to only one.
    This guarantees that two nav links cannot remain highlighted.
  */
  document.querySelectorAll(".nav-link").forEach(function (link) {
    link.classList.remove("active");
  });

  const activeLink = document.querySelector(
    `.nav-link[data-category-id="${categoryId}"]`,
  );

  if (activeLink) {
    activeLink.classList.add("active");

    activeLink.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }
}

function getStickyNavHeight() {
  const nav = document.getElementById("category-nav");

  if (!nav) {
    return 0;
  }

  return nav.offsetHeight;
}

function getScrollOffset() {
  /*
    Extra 16px gives the category title breathing room under the sticky nav.
  */
  return getStickyNavHeight() + 16;
}

function scrollToCategory(categoryId) {
  const section = document.getElementById(categoryId);

  if (!section) return;

  /*
    Lock the chosen category while smooth scroll is happening.
    This fixes mobile where the previous section is still partly visible.
  */
  scrollSpyLockedUntil = Date.now() + 900;

  setActiveNavLink(categoryId, true);

  const targetY =
    section.getBoundingClientRect().top + window.scrollY - getScrollOffset();

  window.scrollTo({
    top: targetY,
    behavior: "smooth",
  });

  /*
    Update the URL hash without causing the browser's default jump.
  */
  history.pushState(null, "", "#" + categoryId);

  /*
    After the smooth scroll finishes, force-check again.
  */
  window.setTimeout(function () {
    scrollSpyLockedUntil = 0;
    handleScrollSpy();
  }, 950);
}

function getActiveCategoryFromScroll() {
  const sections = Array.from(document.querySelectorAll(".category-section"));

  if (sections.length === 0) {
    return null;
  }

  /*
    This checkpoint is just under the sticky nav.
    The active category is the last category whose top passed this line.
  */
  const checkpoint = getScrollOffset() + 8;

  let activeCategoryId = sections[0].dataset.categoryId;

  sections.forEach(function (section) {
    const rect = section.getBoundingClientRect();

    if (rect.top <= checkpoint) {
      activeCategoryId = section.dataset.categoryId;
    }
  });

  /*
    If user reaches page bottom, force the last category active.
    This helps when the final category is short.
  */
  const scrollBottom = window.scrollY + window.innerHeight;
  const pageHeight = document.documentElement.scrollHeight;

  if (pageHeight - scrollBottom <= 8) {
    activeCategoryId = sections[sections.length - 1].dataset.categoryId;
  }

  return activeCategoryId;
}

function handleScrollSpy() {
  if (Date.now() < scrollSpyLockedUntil) {
    return;
  }

  if (scrollSpyFrame) return;

  scrollSpyFrame = window.requestAnimationFrame(function () {
    const activeCategoryId = getActiveCategoryFromScroll();

    setActiveNavLink(activeCategoryId);

    scrollSpyFrame = null;
  });
}

function setupScrollSpy() {
  window.removeEventListener("scroll", handleScrollSpy);
  window.removeEventListener("resize", handleScrollSpy);

  window.addEventListener("scroll", handleScrollSpy, {
    passive: true,
  });

  window.addEventListener("resize", handleScrollSpy);

  handleScrollSpy();
}

/* ===============================
   MODAL
================================ */

function showModal(product) {
  activeProduct = product;

  fillModal(product);

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");

  document.body.style.overflow = "hidden";
}

function fillModal(product) {
  modalImg.src = product.image;
  modalImg.alt = getText(product.name);

  modalTitle.textContent = getText(product.name);

  modalPrice.textContent =
    product.price && product.price.trim()
      ? product.price
      : getSiteText("offer");

  modalDesc.textContent =
    getText(product.description) || getSiteText("defaultDescription");
}

function closeModal() {
  activeProduct = null;

  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");

  document.body.style.overflow = "auto";
}

/* ===============================
   EVENTS
================================ */

langEnButton.addEventListener("click", function () {
  changeLanguage("en");
});

langArButton.addEventListener("click", function () {
  changeLanguage("ar");
});

closeButton.addEventListener("click", closeModal);

modal.addEventListener("click", function (event) {
  if (event.target === modal) {
    closeModal();
  }
});

window.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && modal.classList.contains("active")) {
    closeModal();
  }
});

modalImg.addEventListener("error", function () {
  if (!modalImg.src.includes("placehold.co")) {
    modalImg.src = FALLBACK_IMAGE;
  }
});

/* ===============================
   START
================================ */

applyLanguageSettings();
loadMenu();
