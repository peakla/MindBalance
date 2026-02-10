// ==================== MAIN APPLICATION ====================
"use strict";



// --- Preloader ---
document.addEventListener("DOMContentLoaded", function () {

  const preloader = document.querySelector("[data-preaload]");
  const progressFill = document.querySelector(".progress-bar-fill");
  let progress = 0;

  function animateProgress() {
    if (!progressFill) return;
    const interval = setInterval(function () {
      progress += Math.random() * 8 + 2;
      if (progress > 90) progress = 90;
      progressFill.style.width = progress + "%";
    }, 150);
    return interval;
  }

  const progressInterval = animateProgress();

  window.addEventListener("load", function () {
    if (progressInterval) clearInterval(progressInterval);
    if (progressFill) {
      progressFill.style.width = "100%";
    }
    setTimeout(function () {
      document.body.classList.add("loaded");
      if (preloader) preloader.classList.add("loaded");
      const legacyLoader = document.getElementById("preloader");
      if (legacyLoader) legacyLoader.style.display = "none";
      window.scrollTo(0, 0);
    }, 400);
  });



// --- Utility Functions ---
  function addEventOnElements(elements, eventType, callback) {
    if (!elements || !elements.length) return;
    for (let i = 0; i < elements.length; i++) {
      elements[i].addEventListener(eventType, callback);
    }
  }



// --- Navbar ---
  const navbar = document.querySelector("[data-navbar]");
  const navTogglers = document.querySelectorAll("[data-nav-toggler]");
  const overlay = document.querySelector("[data-overlay]");
  const navOpenBtn = document.querySelector(".nav-open-btn");

  function openNavbar() {
    if (!navbar || !overlay) return;
    navbar.classList.add("active");
    overlay.classList.add("active");
    document.body.classList.add("nav-active");
    if (navOpenBtn) navOpenBtn.classList.add("is-active");
  }

  function closeNavbar() {
    if (!navbar || !overlay) return;
    navbar.classList.remove("active");
    overlay.classList.remove("active");
    document.body.classList.remove("nav-active");
    if (navOpenBtn) navOpenBtn.classList.remove("is-active");


    const submenuPanels = navbar.querySelectorAll(".navbar-submenu-panel");
    submenuPanels.forEach(panel => panel.classList.remove("active"));
    navbar.classList.remove("submenu-open");
  }


  window.closeNavbar = closeNavbar;

  function toggleNavbar() {
    if (!navbar) return;
    if (navbar.classList.contains("active")) {
      closeNavbar();
    } else {
      openNavbar();
    }
  }

  addEventOnElements(navTogglers, "click", toggleNavbar);

// --- Mobile Swipe Gestures ---
  let touchStartX = 0;
  let touchCurrentX = 0;
  let isSwiping = false;

  if (navbar) {
    navbar.addEventListener("touchstart", function(e) {
      touchStartX = e.touches[0].clientX;
      isSwiping = true;
    }, { passive: true });

    navbar.addEventListener("touchmove", function(e) {
      if (!isSwiping) return;
      touchCurrentX = e.touches[0].clientX;
      const diff = touchStartX - touchCurrentX;


      const drawerWidth = navbar.offsetWidth || 360;


      if (diff > 0 && diff < drawerWidth) {
        navbar.style.transform = `translateX(${drawerWidth - diff}px)`;
        navbar.style.transition = "none";
      }
    }, { passive: true });

    navbar.addEventListener("touchend", function() {
      if (!isSwiping) return;
      isSwiping = false;
      const diff = touchStartX - touchCurrentX;

      navbar.style.transition = "";
      navbar.style.transform = "";


      if (diff > 80) {
        closeNavbar();
      }
    }, { passive: true });

    navbar.addEventListener("touchcancel", function() {
      isSwiping = false;
      navbar.style.transition = "";
      navbar.style.transform = "";
    }, { passive: true });
  }


  function createRipple(e) {
    const link = e.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(link.clientWidth, link.clientHeight);
    const radius = diameter / 2;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - link.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${e.clientY - link.getBoundingClientRect().top - radius}px`;
    circle.classList.add("ripple");

    const existingRipple = link.querySelector(".ripple");
    if (existingRipple) existingRipple.remove();

    link.appendChild(circle);
  }

// --- Sticky Header ---
  document.querySelectorAll(".navbar-link").forEach(link => {
    link.addEventListener("click", createRipple);
  });



  function initMobileSubmenu() {
    const isMobile = () => window.innerWidth <= 1024;
    const navbar = document.querySelector("[data-navbar]");
    const submenuItems = document.querySelectorAll(".navbar-item.has-submenu");
    const submenuPanels = document.querySelectorAll(".navbar-submenu-panel");
    const backButtons = document.querySelectorAll(".submenu-back-btn");

    if (!navbar || !submenuItems.length) return;


    submenuItems.forEach(item => {
      const link = item.querySelector(".navbar-link");
      const submenuId = item.getAttribute("data-submenu");
      const panel = document.querySelector(`[data-submenu-panel="${submenuId}"]`);

      if (!link || !panel) return;

      link.addEventListener("click", function(e) {
        if (!isMobile()) return;

        e.preventDefault();
        e.stopPropagation();

// --- Submenu Navigation ---

        panel.classList.add("active");
        navbar.classList.add("submenu-open");
      });
    });


    backButtons.forEach(btn => {
      btn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();


        submenuPanels.forEach(panel => panel.classList.remove("active"));
        navbar.classList.remove("submenu-open");
      });
    });


    const originalCloseNavbar = window.closeNavbar || closeNavbar;
    window.closeNavbarWithSubmenu = function() {
      submenuPanels.forEach(panel => panel.classList.remove("active"));
      navbar.classList.remove("submenu-open");
      if (typeof originalCloseNavbar === 'function') {
        originalCloseNavbar();
      }
    };


    const closeBtn = navbar.querySelector(".close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", function() {
        submenuPanels.forEach(panel => panel.classList.remove("active"));
        navbar.classList.remove("submenu-open");
      });
    }


    const overlay = document.querySelector("[data-overlay]");
    if (overlay) {
      overlay.addEventListener("click", function() {
        submenuPanels.forEach(panel => panel.classList.remove("active"));
        navbar.classList.remove("submenu-open");
      });
    }


    let resizeTimer;
    window.addEventListener("resize", function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        if (!isMobile()) {
          submenuPanels.forEach(panel => panel.classList.remove("active"));
          navbar.classList.remove("submenu-open");
        }
      }, 150);
    });
  }


  initMobileSubmenu();



  function setActiveNavState() {
    const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
    const navLinks = document.querySelectorAll(".navbar-link");
    let foundActive = false;

    navLinks.forEach(link => {
      link.classList.remove("active");
      if (foundActive) return;

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;


      let linkPath;
      try {
        const resolvedUrl = new URL(href, window.location.href);
        linkPath = resolvedUrl.pathname.replace(/\/$/, "") || "/";
      } catch (e) {
        linkPath = href.replace(/\/$/, "") || "/";
      }


      const isHome = linkPath === "/" || linkPath === "";
      const isCurrentHome = currentPath === "/" || currentPath === "";


      const isBlogLink = linkPath === "/blog";
      const isOnArticlePage = currentPath.startsWith("/articles");

      if (isHome && isCurrentHome) {
        link.classList.add("active");
        foundActive = true;
      } else if (isBlogLink && isOnArticlePage) {
        link.classList.add("active");
        foundActive = true;
      } else if (!isHome && !isBlogLink && currentPath.startsWith(linkPath)) {
        link.classList.add("active");
        foundActive = true;
      } else if (!isHome && currentPath === linkPath) {
        link.classList.add("active");
        foundActive = true;
      }
    });
  }

  setActiveNavState();



  const header = document.querySelector("[data-header]");
  const backTopBtn = document.querySelector("[data-back-top-btn]");
  let lastScrollPos = 0;


  const MIN_HEADER_HEIGHT = 60;
  let lastKnownHeaderHeight = 100;
  let initialHeaderHeight = null;

  function measureHeaderHeight(el) {
    if (!el) return 0;

    const height = el.offsetHeight > 0 ? el.offsetHeight : el.scrollHeight;
    return height > 0 ? height : 0;
  }
// --- User Menu ---

  function updateHeaderHeight() {
    let targetHeader = header || document.querySelector('header, .header');

    if (targetHeader) {

      const height = measureHeaderHeight(targetHeader);


      if (initialHeaderHeight === null && height > 0) {
        initialHeaderHeight = height;
      }


      if (height > 0) {
        lastKnownHeaderHeight = height;
      } else if (initialHeaderHeight) {

        lastKnownHeaderHeight = initialHeaderHeight;
      }
    }


    const finalHeight = Math.max(lastKnownHeaderHeight, MIN_HEADER_HEIGHT);
    const safeHeight = finalHeight + 20;

    document.documentElement.style.setProperty('--header-height', finalHeight + 'px');
    document.documentElement.style.setProperty('--header-height-safe', safeHeight + 'px');
  }


  requestAnimationFrame(updateHeaderHeight);
  window.addEventListener('resize', () => requestAnimationFrame(updateHeaderHeight));
  window.addEventListener('orientationchange', () => requestAnimationFrame(updateHeaderHeight));


  if (header && typeof ResizeObserver !== 'undefined') {
    const headerObserver = new ResizeObserver(() => {

      requestAnimationFrame(updateHeaderHeight);
    });
    headerObserver.observe(header);
  }


  if (header) {
    header.addEventListener('transitionend', () => {
      requestAnimationFrame(updateHeaderHeight);
    });
  }


  if (header) {
    initialHeaderHeight = measureHeaderHeight(header);
  }

  function hideHeaderOnScroll() {
    if (!header) return;
    const isScrollBottom = lastScrollPos < window.scrollY;

    if (isScrollBottom) header.classList.add("hide");
    else header.classList.remove("hide");

    lastScrollPos = window.scrollY;
  }

  window.addEventListener("scroll", function () {
    if (!header) return;

    if (window.scrollY >= 50) {
      header.classList.add("active");
      if (backTopBtn) backTopBtn.classList.add("active");
      hideHeaderOnScroll();
    } else {
      header.classList.remove("active");
      if (backTopBtn) backTopBtn.classList.remove("active");
    }

    requestAnimationFrame(updateHeaderHeight);
  });



  const hamburger = document.querySelector(".hamburger");
  if (hamburger) {
    hamburger.addEventListener("click", function () {
      const navBar = document.querySelector(".nav-bar");
      if (navBar) navBar.classList.toggle("active");
    });
  }



  const scrollContainer = document.querySelector(".gallery");
  const backBtn = document.getElementById("backBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (scrollContainer) {
    scrollContainer.addEventListener("wheel", (evt) => {
      evt.preventDefault();
      scrollContainer.scrollLeft += evt.deltaY;
      scrollContainer.style.scrollBehavior = "auto";
    });

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        scrollContainer.style.scrollBehavior = "smooth";
        scrollContainer.scrollLeft += 900;
      });
    }

    if (backBtn) {
      backBtn.addEventListener("click", () => {
        scrollContainer.style.scrollBehavior = "smooth";
        scrollContainer.scrollLeft -= 900;
      });
    }
// --- Theme Toggle ---
  }



  function observeHighlightAnimations() {
    const highlights = document.querySelectorAll('[data-highlight="true"]');
    if (!highlights.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        entry.target.classList.toggle("animate", entry.isIntersecting);
      });
    }, { threshold: 0.5 });

    highlights.forEach(el => observer.observe(el));
  }

  if (typeof wrapTargetSentences === "function") {
    wrapTargetSentences();
  }
  observeHighlightAnimations();



  if (typeof Swiper !== "undefined" && document.querySelector(".mySwiper")) {
    new Swiper(".mySwiper", {
      effect: "coverflow",
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: "auto",
      coverflowEffect: {
        rotate: 0,
        stretch: 0,
        depth: 300,
        modifier: 1,
        slideShadows: false,
      },
      pagination: { el: ".swiper-pagination" },
    });
  }


  if (typeof Swiper !== "undefined" && document.querySelector(".tranding-slider")) {
    new Swiper(".tranding-slider", {
      effect: "coverflow",
      grabCursor: true,
      centeredSlides: true,
      loop: true,
      slidesPerView: "auto",
      coverflowEffect: {
        rotate: 0,
        stretch: 0,
        depth: 100,
        modifier: 2.5,
      },
      pagination: { el: ".swiper-pagination", clickable: true },
// --- Back to Top ---
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      }
    });
  }


  (function () {
    const slides = [
      {
        kickerKey: "slide1_kicker",
        titleKey: "slide1_title",
        descKey: "slide1_desc",
        ctaKey: "slide1_cta",
        kicker: "Mental health disorders",
        title: "Anxiety & depression",
        desc: "Learn about common mental health conditions like anxiety and depression. Find clear explanations and discover resources to help you or someone you care about.",
        cta: "Explore resources",
        ctaHref: "./resourcelib/",
        imgSrc: "../assets/images/segment1.png",
        imgAlt: "Mental health disorders overview"
      },
      {
        kickerKey: "slide2_kicker",
        titleKey: "slide2_title",
        descKey: "slide2_desc",
// --- Cursor ---
        ctaKey: "slide2_cta",
        kicker: "Helplines & resources",
        title: "Get immediate support",
        desc: "If you or someone else needs help right now, we have a list of trusted helplines and crisis resources available 24/7.",
        cta: "Find help",
        ctaHref: "./support/#helplines",
        imgSrc: "../assets/images/segment2.png",
        imgAlt: "Helplines and support resources"
      },
      {
        kickerKey: "slide3_kicker",
        titleKey: "slide3_title",
        descKey: "slide3_desc",
        ctaKey: "slide3_cta",
        kicker: "Online counseling",
        title: "Schedule an appointment",
        desc: "Use our appointment scheduler to request online counseling. Choose a time that works for you and get connected to support in a private, respectful way.",
        cta: "Schedule now",
        ctaHref: "./support/#appointment",
        imgSrc: "../assets/images/segment3.png",
        imgAlt: "Online counseling appointment scheduler"
      },
      {
        kickerKey: "slide4_kicker",
        titleKey: "slide4_title",
        descKey: "slide4_desc",
        ctaKey: "slide4_cta",
        kicker: "Community & stories",
// --- Accessibility ---
        title: "Support groups & testimonials",
        desc: "Read real stories from our community. Find encouragement and learn how others have found strength and healing on their mental health journey.",
        cta: "Join community",
        ctaHref: "./community/",
        imgSrc: "../assets/images/segment4.png",
        imgAlt: "Support community and testimonials"
      }
    ];

    function getSlideTranslation(key, fallback) {
      const lang = localStorage.getItem('mindbalance_language') || 'en';
      if (window.translations && window.translations[lang] && window.translations[lang][key]) {
        return window.translations[lang][key];
      }
      return fallback || key;
    }

    const kickerEl = document.getElementById("mb-kicker");
    const titleEl = document.getElementById("mb-title");
    const descEl = document.getElementById("mb-desc");
    const ctaEl = document.getElementById("mb-cta");
    const imgEl = document.querySelector(".mb-actionbox__img");
    const featureEl = document.querySelector(".mb-actionbox__feature");
    const cards = Array.from(document.querySelectorAll(".mb-card"));

    if (!kickerEl || !titleEl || !descEl || !ctaEl || !imgEl || !featureEl || !cards.length) return;

    let index = 0;
    let timer = null;
    const INTERVAL_MS = 5000;
    const FADE_MS = 220;

    function setActiveCard(i) {
      cards.forEach((btn, n) => {
        const active = n === i;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
      });
    }

    function smoothSwap(i) {
      featureEl.classList.add("is-fading");

      window.setTimeout(() => {
        const s = slides[i];

        kickerEl.textContent = getSlideTranslation(s.kickerKey, s.kicker);
        titleEl.textContent = getSlideTranslation(s.titleKey, s.title);
        descEl.textContent = getSlideTranslation(s.descKey, s.desc);
        ctaEl.textContent = getSlideTranslation(s.ctaKey, s.cta);
        ctaEl.setAttribute("href", s.ctaHref);


        imgEl.style.opacity = "0";
        imgEl.src = s.imgSrc;
// --- Contact Form ---
        imgEl.alt = s.imgAlt;
        imgEl.onload = function () {
          imgEl.style.opacity = "1";
        };

        setActiveCard(i);
        index = i;

        featureEl.classList.remove("is-fading");
      }, FADE_MS);
    }

    function next() {
      smoothSwap((index + 1) % slides.length);
    }

    function start() {
      stop();
      timer = setInterval(next, INTERVAL_MS);
    }

    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }


    cards.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const i = Number(btn.dataset.slide);
        if (!Number.isNaN(i)) {
          smoothSwap(i);
          start();
        }
      });
    });


    const section = document.querySelector(".mb-actionbox");
    if (section) {
      section.addEventListener("mouseenter", stop);
      section.addEventListener("mouseleave", start);
    }


    smoothSwap(0);
    start();
  })();



  const cardBtns = document.querySelectorAll(".card__btn");
  if (cardBtns.length) {
    cardBtns.forEach(button => {
      button.addEventListener("click", function () {
        const additionalContent = this.nextElementSibling;
        if (additionalContent) additionalContent.classList.toggle("active");
      });
    });
  }



  const imgBoxes = document.querySelectorAll(".img-box");
  if (imgBoxes.length) {
    imgBoxes.forEach(image => {
      image.addEventListener("click", function () {
        this.classList.toggle("expanded");
      });
    });
  }



  window.addEventListener("scroll", function () {
    const blocks = document.querySelectorAll(".content-block");
    if (!blocks.length) return;

    const scrollPos = window.scrollY;
    blocks.forEach(block => {
      const blockPosition = block.getBoundingClientRect().top + scrollPos;
      const triggerPoint = window.innerHeight / 1.5;

      if (blockPosition < scrollPos + triggerPoint) {
        block.style.transform = "scale(1.05)";
        block.style.opacity = "1";
      } else {
        block.style.transform = "scale(1)";
        block.style.opacity = "0.5";
      }
    });
  });

});

// --- Newsletter ---

document.addEventListener("DOMContentLoaded", function () {

// ==================== RESOURCE LIBRARY ====================

  if (!document.querySelector(".rl")) return;

  const searchEl = document.getElementById("rlSearch");
  const clearSearchBtn = document.querySelector(".rl-clearSearch");
  const cardsEl = document.getElementById("rlCards");
  const metaEl = document.getElementById("rlMeta");
  const catsEl = document.getElementById("rlCategories");
  const provEl = document.getElementById("rlProviders");
  const chipsEl = document.getElementById("rlActiveChips");
  const clearAllEl = document.getElementById("rlClearAll");

  if (!searchEl || !clearSearchBtn || !cardsEl || !metaEl || !catsEl || !provEl || !chipsEl || !clearAllEl) return;


  const state = {
    q: "",
    categories: new Set(),
    providers: new Set(),
    tags: new Set()
  };

  let all = [];

  function showSkeletonCards(count = 4) {
    cardsEl.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement("div");
      skeleton.className = "rl-skeleton-card";
      skeleton.innerHTML = `
        <div class="rl-skeleton rl-skeleton-title"></div>
        <div class="rl-skeleton rl-skeleton-text"></div>
        <div class="rl-skeleton rl-skeleton-text"></div>
        <div class="rl-skeleton-tags">
          <div class="rl-skeleton rl-skeleton-tag"></div>
          <div class="rl-skeleton rl-skeleton-tag"></div>
          <div class="rl-skeleton rl-skeleton-tag"></div>
        </div>
      `;
      cardsEl.appendChild(skeleton);
    }
  }

  function uniqSorted(arr) {
    return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  function setClearBtnVisibility() {
    const has = state.q.trim().length > 0;
    clearSearchBtn.style.opacity = has ? "1" : "0";
    clearSearchBtn.style.pointerEvents = has ? "auto" : "none";
  }

  function buildFilterButtons(container, items, type) {
    container.innerHTML = "";
    items.forEach((label) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rl-filterBtn";
      btn.dataset.label = label;
      btn.dataset.type = type;
      btn.textContent = label;


      if (state[type].has(label)) {
        btn.classList.add("is-active");
      }

      btn.addEventListener("click", () => {
        const set = state[type];
        if (set.has(label)) {
          set.delete(label);
          btn.classList.remove("is-active");
        } else {
          set.add(label);
          btn.classList.add("is-active");
        }
        renderChips();
        renderResults();
      });

      container.appendChild(btn);
    });
  }


  function updateFilterButtonStates() {
    document.querySelectorAll('.rl-filterBtn').forEach(btn => {
      const type = btn.dataset.type;
      const label = btn.dataset.label;
      if (type && label && state[type]) {
        btn.classList.toggle('is-active', state[type].has(label));
      }
    });
  }

  function renderChips() {
    chipsEl.innerHTML = "";

    const makeChip = (text, onRemove) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "rl-chip";
      b.innerHTML = `${text} <span aria-hidden="true">✕</span>`;
      b.addEventListener("click", onRemove);
      return b;
    };

    state.categories.forEach((c) => {
      chipsEl.appendChild(makeChip(c, () => {
        state.categories.delete(c);
        renderChips();
        renderResults();
      }));
    });

    state.providers.forEach((p) => {
      chipsEl.appendChild(makeChip(p, () => {
        state.providers.delete(p);
        renderChips();
        renderResults();
      }));
    });

    state.tags.forEach((t) => {
      chipsEl.appendChild(makeChip(t, () => {
        state.tags.delete(t);
        renderChips();
        renderResults();
      }));
    });
  }

  function matchesSet(itemValue, set) {
    if (set.size === 0) return true;
    if (!itemValue) return false;


    if (Array.isArray(itemValue)) {
      return itemValue.some(v => set.has(v));
    }
    return set.has(itemValue);
  }

  function matchesQuery(item, q) {
    if (!q) return true;
    const hay = (
      (item.title || "") + " " +
      (item.description || "") + " " +
      (item.provider || "") + " " +
      (item.category || "") + " " +
      (Array.isArray(item.tags) ? item.tags.join(" ") : "")
    ).toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function renderResults() {
    const q = state.q.trim();

    const filtered = all.filter((item) => {
      const okQ = matchesQuery(item, q);
      const okCat = matchesSet(item.category, state.categories);
      const okProv = matchesSet(item.provider, state.providers);
      const okTags = matchesSet(item.tags, state.tags);
      return okQ && okCat && okProv && okTags;
    });

    metaEl.textContent = `Showing ${Math.min(filtered.length, 999)} out of ${all.length}`;

    cardsEl.innerHTML = "";

    filtered.forEach((item) => {
      const card = document.createElement("article");
      card.className = "rl-card card-animated hover-lift";


      const getLabel = (key, fallback) => {
        return window.MindBalanceTranslations?.getTranslationSync?.(key) || fallback;
      };

      const small = document.createElement("p");
      small.className = "rl-cardSmall";
      const audienceKey = `rl_aud_${(item.audience || "General").replace(/\s+/g, "")}`;
      const audienceText = getLabel(audienceKey, item.audience || "General");
      small.innerHTML = `<span data-translate="${audienceKey}">${audienceText}</span> • ${item.provider || "MindBalance"}`;

      const title = document.createElement("h3");
      title.className = "rl-cardTitle";
      title.textContent = item.title || "Untitled";

      const body = document.createElement("p");
      body.className = "rl-cardBody";
      body.textContent = item.description || "";

      const tagsWrap = document.createElement("div");
      tagsWrap.className = "rl-tags";

      (item.tags || []).slice(0, 6).forEach((t) => {
        const tag = document.createElement("span");
        tag.className = "rl-tag";
        const tagKey = `rl_tag_${t.replace(/[\s&-]+/g, "")}`;
        tag.textContent = getLabel(tagKey, t);
        tag.setAttribute("data-translate", tagKey);


        tag.style.cursor = "pointer";
        tag.addEventListener("click", () => {
          if (state.tags.has(t)) state.tags.delete(t);
          else state.tags.add(t);
          renderChips();
          renderResults();
        });

        tagsWrap.appendChild(tag);
      });

      const actions = document.createElement("div");
      actions.className = "rl-actions";

      const visit = document.createElement("a");
      visit.className = "rl-visitBtn";
      visit.textContent = window.MindBalanceTranslations?.getTranslationSync?.("resourcelib_visit") || "VISIT";
      visit.setAttribute("data-translate", "resourcelib_visit");
      visit.href = item.url || "#";
      visit.target = "_blank";
      visit.rel = "noopener";
      visit.setAttribute("aria-label", `Visit ${item.title || "resource"}`);


      const shareBtns = document.createElement("div");
      shareBtns.className = "rl-share-btns";


      const copyBtn = document.createElement("button");
      copyBtn.className = "rl-share-btn rl-share-btn--copy";
      copyBtn.innerHTML = '<ion-icon name="link-outline"></ion-icon>';
      copyBtn.title = "Copy link";
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(item.url || window.location.href).then(() => {
          copyBtn.classList.add("is-copied");
          copyBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon>';
          setTimeout(() => {
            copyBtn.classList.remove("is-copied");
            copyBtn.innerHTML = '<ion-icon name="link-outline"></ion-icon>';
          }, 2000);
        });
      });


      const twitterBtn = document.createElement("a");
      twitterBtn.className = "rl-share-btn rl-share-btn--twitter";
      twitterBtn.innerHTML = '<ion-icon name="logo-twitter"></ion-icon>';
      twitterBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(item.title || "Check out this resource")}&url=${encodeURIComponent(item.url || window.location.href)}`;
      twitterBtn.target = "_blank";
      twitterBtn.rel = "noopener";
      twitterBtn.title = "Share on Twitter";


      const fbBtn = document.createElement("a");
      fbBtn.className = "rl-share-btn rl-share-btn--facebook";
      fbBtn.innerHTML = '<ion-icon name="logo-facebook"></ion-icon>';
      fbBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(item.url || window.location.href)}`;
      fbBtn.target = "_blank";
      fbBtn.rel = "noopener";
      fbBtn.title = "Share on Facebook";

      shareBtns.appendChild(copyBtn);
      shareBtns.appendChild(twitterBtn);
      shareBtns.appendChild(fbBtn);

      actions.appendChild(visit);
      actions.appendChild(shareBtns);

      card.appendChild(small);
      card.appendChild(title);
      card.appendChild(body);
      card.appendChild(tagsWrap);
      card.appendChild(actions);

      cardsEl.appendChild(card);
    });
  }

  function clearAll() {
    state.q = "";
    state.categories.clear();
    state.providers.clear();
    state.tags.clear();
    searchEl.value = "";
    setClearBtnVisibility();
    renderChips();
    renderResults();
  }


  searchEl.addEventListener("input", () => {
    state.q = searchEl.value;
    setClearBtnVisibility();
    renderResults();
  });

  clearSearchBtn.addEventListener("click", () => {
    state.q = "";
    searchEl.value = "";
    setClearBtnVisibility();
    renderResults();
    searchEl.focus();
  });

  clearAllEl.addEventListener("click", clearAll);

  setClearBtnVisibility();


  showSkeletonCards(4);



  const featuredIndices = [0, 5, 10];

  function renderSpotlight(resources) {
    const spotlightEl = document.getElementById('rlSpotlight');
    if (!spotlightEl) return;

    spotlightEl.innerHTML = '';

    featuredIndices.forEach((index) => {
      const item = resources[index];
      if (!item) return;

      const card = document.createElement('article');
      card.className = 'rl-spotlight-card';


      const badge = document.createElement('span');
      badge.className = 'rl-spotlight-card__badge';
      badge.textContent = 'Featured';

      const provider = document.createElement('p');
      provider.className = 'rl-spotlight-card__provider';
      provider.textContent = item.provider || 'MindBalance';

      const title = document.createElement('h4');
      title.className = 'rl-spotlight-card__title';
      title.textContent = item.title || 'Untitled';

      const desc = document.createElement('p');
      desc.className = 'rl-spotlight-card__desc';
      desc.textContent = item.description || '';

      const actions = document.createElement('div');
      actions.className = 'rl-spotlight-card__actions';

      const link = document.createElement('a');
      link.className = 'rl-spotlight-card__btn rl-spotlight-card__btn--primary';
      link.href = item.url || '#';
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Learn More →';

      actions.appendChild(link);
      card.appendChild(badge);
      card.appendChild(provider);
      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(actions);

      spotlightEl.appendChild(card);
    });
  }


  function parseUrlFilters() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    const topic = params.get('topic');
    const search = params.get('q') || params.get('search');

    return { category, topic, search };
  }


  function applyUrlFilters(categories) {
    const { category, topic, search } = parseUrlFilters();


    const filterParam = category || topic;
    if (filterParam) {

      const matchingCategory = categories.find(
        cat => cat.toLowerCase() === filterParam.toLowerCase()
      );
      if (matchingCategory) {
        state.categories.add(matchingCategory);
      } else {

        state.q = filterParam;
        searchEl.value = filterParam;
        setClearBtnVisibility();
      }
    }


    if (search) {
      state.q = search;
      searchEl.value = search;
      setClearBtnVisibility();
    }
  }


  fetch("../data/resources.json", { cache: "no-store" })
    .then((r) => r.json())
    .then((data) => {
      all = Array.isArray(data) ? data : [];


      const categories = uniqSorted(all.map(x => x.category));
      const providers = uniqSorted(all.map(x => x.provider));

      buildFilterButtons(catsEl, categories, "categories");
      buildFilterButtons(provEl, providers, "providers");


      applyUrlFilters(categories);


      updateFilterButtonStates();


      renderSpotlight(all);

      renderChips();
      renderResults();
    })
    .catch((err) => {
      metaEl.textContent = "Showing 0 out of 0";
      cardsEl.innerHTML = "";
      const p = document.createElement("p");
      p.style.color = "#6b7280";
      p.textContent = "Could not load the resource database. Check that ../data/resources.json exists and the path is correct.";
      cardsEl.appendChild(p);
      console.error(err);
    });
});


document.addEventListener("DOMContentLoaded", function () {

// ==================== TESTIMONIALS ====================
  const resourceSection = document.querySelector(".mb-resources");
  if (!resourceSection) return;


  requestAnimationFrame(() => {
    resourceSection.classList.add("is-ready");
  });


  const cards = Array.from(document.querySelectorAll(".mb-resource-card"));


  if (!cards.length) return;


  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );

  cards.forEach((card, i) => {

    card.style.setProperty("--delay", `${Math.min(i * 35, 280)}ms`);
    io.observe(card);
  });
});


(function initTestimonialsScroller() {

// ==================== INLINE NOTIFICATIONS ====================
  const cols = document.querySelectorAll(".mb-testimonials__col");
  if (!cols.length) return;

  cols.forEach((col) => {
    const viewport = col.querySelector(".mb-testimonials__viewport");
    const track = col.querySelector(".mb-testimonials__track");
    if (!viewport || !track) return;


    if (!track.dataset.duplicated) {
      const originalChildren = Array.from(track.children);
      originalChildren.forEach((child) => {
        const clone = child.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
      });
      track.dataset.duplicated = "true";
    }


    const recalc = () => {

      const total = track.scrollHeight;
      const half = Math.floor(total / 2);


      track.style.setProperty("--mb-tm-distance", half + "px");



      const speed = 28;
      const duration = Math.max(10, Math.round(half / speed));
      track.style.setProperty("--mb-tm-duration", duration + "s");
    };


    requestAnimationFrame(() => requestAnimationFrame(recalc));


    window.addEventListener("resize", () => {
      requestAnimationFrame(recalc);
    });
  });
})();


(function initNotifications() {

// ==================== NAVBAR SEARCH ====================
  const notifBadge = document.getElementById('notifBadge');
  if (!notifBadge) return;


  async function checkNotifications() {

    if (typeof getCurrentUser === 'undefined') return;

    const user = await getCurrentUser();
    if (!user) {
      notifBadge.hidden = true;
      return;
    }


    if (typeof getSupabase !== 'undefined') {
      const sb = getSupabase();
      if (sb) {
        try {
          const { count } = await sb
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false);

          if (count && count > 0) {
            notifBadge.textContent = count > 99 ? '99+' : count;
            notifBadge.hidden = false;
          } else {
            notifBadge.hidden = true;
          }
        } catch (e) {

          notifBadge.hidden = true;
        }
      }
    }
  }


  setTimeout(checkNotifications, 1500);


  window.addEventListener('mindbalance:authchange', (e) => {
    if (e.detail.isSignedIn) {
      setTimeout(checkNotifications, 500);
    } else {
      notifBadge.hidden = true;
    }
  });
})();


(function initNavbarSearch() {

// ==================== MOOD CHECK-IN ====================
  const searchContainer = document.getElementById('navbarSearch');
  const searchInput = document.getElementById('searchInput');
  const searchToggle = document.getElementById('searchToggle');
  const searchResults = document.getElementById('searchResults');

  if (!searchContainer || !searchInput || !searchToggle) return;


  const searchData = [
    { title: 'Understanding Anxiety', type: 'Article', url: './articles/anxiety.html', icon: 'document-text-outline' },
    { title: 'Depression Guide', type: 'Article', url: './articles/depression.html', icon: 'document-text-outline' },
    { title: 'Stress Management', type: 'Article', url: './articles/stress.html', icon: 'document-text-outline' },
    { title: 'Sleep & Mental Health', type: 'Article', url: './articles/sleep.html', icon: 'document-text-outline' },
    { title: 'Mindfulness Basics', type: 'Article', url: './articles/mindfulness.html', icon: 'document-text-outline' },
    { title: 'Teen Mental Health', type: 'Article', url: './articles/teen-mental-health.html', icon: 'document-text-outline' },
    { title: 'Resource Library', type: 'Page', url: './resourcelib/', icon: 'library-outline' },
    { title: 'Community Hub', type: 'Page', url: './community/', icon: 'people-outline' },
    { title: 'Support & Contact', type: 'Page', url: './support/', icon: 'call-outline' },
    { title: 'Blog', type: 'Page', url: './blog/', icon: 'newspaper-outline' },
    { title: 'Anxiety Resources', type: 'Resource', url: './resourcelib/?category=anxiety', icon: 'pulse-outline' },
    { title: 'Depression Resources', type: 'Resource', url: './resourcelib/?category=depression', icon: 'cloudy-outline' },
    { title: 'Stress Resources', type: 'Resource', url: './resourcelib/?category=stress', icon: 'flash-outline' },
    { title: 'Mindfulness Resources', type: 'Resource', url: './resourcelib/?category=mindfulness', icon: 'leaf-outline' },
    { title: 'Crisis Support', type: 'Support', url: './support/#crisis', icon: 'alert-circle-outline' },
    { title: 'Breathing Exercises', type: 'Tool', url: './support/#breathing', icon: 'fitness-outline' }
  ];


  searchToggle.addEventListener('click', () => {
    searchContainer.classList.toggle('is-open');
    if (searchContainer.classList.contains('is-open')) {
      searchInput.focus();
    } else {
      searchInput.value = '';
      searchResults.classList.remove('is-visible');
    }
  });


  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();

    if (query.length < 2) {
      searchResults.classList.remove('is-visible');
      return;
    }

    const matches = searchData.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query)
    ).slice(0, 6);

    if (matches.length === 0) {
      searchResults.innerHTML = '<div class="navbar-search__empty">No results found</div>';
    } else {
      searchResults.innerHTML = matches.map(item => `
        <a href="${item.url}" class="navbar-search__item">
          <div class="navbar-search__item-icon">
            <ion-icon name="${item.icon}"></ion-icon>
          </div>
          <div class="navbar-search__item-content">
            <div class="navbar-search__item-title">${item.title}</div>
            <div class="navbar-search__item-type">${item.type}</div>
          </div>
        </a>
      `).join('');
    }

    searchResults.classList.add('is-visible');
  });


  document.addEventListener('click', (e) => {
    if (!searchContainer.contains(e.target)) {
      searchContainer.classList.remove('is-open');
      searchResults.classList.remove('is-visible');
    }
  });


  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchContainer.classList.add('is-open');
      searchInput.focus();
    }
    if (e.key === 'Escape') {
      searchContainer.classList.remove('is-open');
      searchResults.classList.remove('is-visible');
    }
  });
})();


(function initMoodCheckIn() {

// ==================== MOBILE SETTINGS ====================
  const moodButtons = document.querySelectorAll('.mb-moodcheck__btn');
  const resultContainer = document.getElementById('moodResult');
  const messageEl = document.getElementById('moodMessage');
  const linkEl = document.getElementById('moodLink');

  if (!moodButtons.length || !resultContainer) return;

  const moodData = {
    great: {
      message: "That's wonderful! Keep up the positive momentum. Check out our mindfulness resources to maintain your well-being.",
      link: './resourcelib/?category=mindfulness',
      linkText: 'Explore Mindfulness →'
    },
    okay: {
      message: "It's okay to feel okay. Small steps can make a big difference. Explore our self-care resources.",
      link: './resourcelib/',
      linkText: 'Browse Resources →'
    },
    stressed: {
      message: "Stress is manageable. We have practical tools and techniques to help you cope.",
      link: './resourcelib/?category=stress',
      linkText: 'Stress Management Tips →'
    },
    anxious: {
      message: "Anxiety can feel overwhelming, but you're not alone. Explore our anxiety resources and support options.",
      link: './resourcelib/?category=anxiety',
      linkText: 'Anxiety Support →'
    },
    sad: {
      message: "It's okay to feel sad. Reach out for support - we have resources that can help.",
      link: './support/',
      linkText: 'Get Support →'
    }
  };

  moodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mood = btn.dataset.mood;
      const data = moodData[mood];

      if (!data) return;


      moodButtons.forEach(b => b.classList.remove('is-selected'));

      btn.classList.add('is-selected');


      if (messageEl) messageEl.textContent = data.message;
      if (linkEl) {
        linkEl.href = data.link;
        linkEl.textContent = data.linkText;
      }
      resultContainer.hidden = false;
    });
  });
})();


document.addEventListener('DOMContentLoaded', function() {

// ==================== SUGGEST RESOURCE MODAL ====================
  const settingsToggle = document.querySelector('.mobile-settings-toggle');
  const settingsSection = document.querySelector('.mobile-settings-section');

  if (settingsToggle && settingsSection) {
    settingsToggle.addEventListener('click', function() {
      const isExpanded = settingsToggle.getAttribute('aria-expanded') === 'true';
      settingsToggle.setAttribute('aria-expanded', !isExpanded);
      settingsSection.classList.toggle('collapsed');
    });
  }
});


document.addEventListener('DOMContentLoaded', function() {
  const suggestModal = document.getElementById('suggestModal');
  const openSuggestBtn = document.getElementById('openSuggestModal');
  const suggestForm = document.getElementById('suggestForm');
  const cancelSuggestBtn = document.getElementById('cancelSuggest');
  const suggestSuccess = document.getElementById('suggestSuccess');
  const closeSuggestSuccessBtn = document.getElementById('closeSuggestSuccess');
  const modalContent = suggestModal?.querySelector('.suggest-modal__content');

  if (!suggestModal || !openSuggestBtn) return;

  let previouslyFocusedElement = null;

  function openSuggestModal() {

    previouslyFocusedElement = document.activeElement;

    suggestModal.classList.add('is-active');
    document.body.style.overflow = 'hidden';


    if (suggestForm) suggestForm.style.display = 'block';
    if (suggestSuccess) suggestSuccess.style.display = 'none';


    const firstInput = suggestForm?.querySelector('input, textarea, select');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }

  function closeSuggestModal() {
    suggestModal.classList.remove('is-active');
    document.body.style.overflow = '';


    if (previouslyFocusedElement) {
      previouslyFocusedElement.focus();
      previouslyFocusedElement = null;
    }
  }


  function handleTabKey(e) {
    if (!suggestModal.classList.contains('is-active')) return;
    if (e.key !== 'Tab') return;

    const focusableElements = modalContent.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }

  openSuggestBtn.addEventListener('click', openSuggestModal);


  suggestModal.querySelector('.suggest-modal__backdrop')?.addEventListener('click', closeSuggestModal);
  suggestModal.querySelector('.suggest-modal__close')?.addEventListener('click', closeSuggestModal);

  cancelSuggestBtn?.addEventListener('click', closeSuggestModal);
  closeSuggestSuccessBtn?.addEventListener('click', closeSuggestModal);


  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && suggestModal.classList.contains('is-active')) {
      closeSuggestModal();
    }
    handleTabKey(e);
  });


  suggestForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(suggestForm);
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      category: formData.get('category'),
      provider: formData.get('provider') || null,
      website: formData.get('website') || null,
      phone: formData.get('phone') || null,
      address: formData.get('address') || null,
      submitter_email: formData.get('submitter_email') || null,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    try {

      if (window.supabase) {
        const { error } = await window.supabase
          .from('resource_suggestions')
          .insert([data]);

        if (error) {
          console.error('Error submitting suggestion:', error);

        }
      }


      suggestForm.style.display = 'none';
      suggestSuccess.style.display = 'block';
      suggestForm.reset();

    } catch (err) {
      console.error('Error:', err);

      suggestForm.style.display = 'none';
      suggestSuccess.style.display = 'block';
      suggestForm.reset();
    }
  });
});

