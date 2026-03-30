const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobileViewportQuery = window.matchMedia("(max-width: 768px)");
const siteWallpaperUrl =
  "https://uconn.edu/wp-content/uploads/2022/08/Spring_fog_20220520_0009-crop.jpg";
const siteSessionStorageKey = "portfolio-site-session-loaded";
const homeNavGuideDelay = 3000;
const heroFragmentGrid = {
  columns: 6,
  rows: 4,
  inset: 0.035,
  gap: 0.008,
};
const usesReactSiteMotion = document.body?.dataset.reactMotion === "true";

let typingRunId = 0;

function isMobileViewport() {
  return mobileViewportQuery.matches;
}

function markSiteSessionLoaded() {
  if (document.body?.dataset.page === "home") {
    return;
  }

  try {
    window.sessionStorage.setItem(siteSessionStorageKey, "1");
  } catch {
    // Ignore storage failures so the rest of the site still initializes.
  }
}

markSiteSessionLoaded();

function primeWallpaperImage() {
  const wallpaperImage = new Image();
  wallpaperImage.decoding = "async";
  wallpaperImage.src = siteWallpaperUrl;
}

function initWallpaper() {
  if (document.body?.dataset.page === "home") {
    primeWallpaperImage();
  }
}

function initViewportBezel() {
  if (!document.body || document.querySelector(".bottom-bend, .viewport-bezel")) {
    return;
  }

  const bezel = document.createElement("div");
  bezel.className = "bottom-bend";
  bezel.setAttribute("aria-hidden", "true");
  document.body.append(bezel);
}

function initReveal() {
  const revealItems = document.querySelectorAll(".reveal");

  if (!revealItems.length) {
    return;
  }

  if (prefersReducedMotion) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function setTypingText(target, text) {
  if (!target) {
    return;
  }

  target.textContent = text;
  target.setAttribute("aria-label", text);
}

function stopTyping(target, text = target?.textContent || "") {
  typingRunId += 1;
  setTypingText(target, text);
}

async function playTypingSequence(target, sequence) {
  if (!target) {
    return;
  }

  const runId = ++typingRunId;

  if (!sequence.length) {
    setTypingText(target, "");
    return;
  }

  if (prefersReducedMotion) {
    setTypingText(target, sequence.at(-1) || "");
    return;
  }

  for (let i = 0; i < sequence.length; i += 1) {
    const phrase = sequence[i];

    setTypingText(target, "");

    for (const letter of phrase) {
      if (runId !== typingRunId) {
        return;
      }

      setTypingText(target, `${target.textContent}${letter}`);
      await sleep(80);
    }

    if (runId !== typingRunId) {
      return;
    }

    if (i < sequence.length - 1) {
      await sleep(850);

      while (target.textContent.length > 0) {
        if (runId !== typingRunId) {
          return;
        }

        setTypingText(target, target.textContent.slice(0, -1));
        await sleep(45);
      }
    }
  }
}

function initTyping() {
  const target = document.querySelector(".typing-target");

  if (!target) {
    return null;
  }

  const sequence = JSON.parse(target.dataset.typing || "[]");

  if (!sequence.length) {
    setTypingText(target, "");
    return { sequence, target };
  }

  playTypingSequence(target, sequence);
  return { sequence, target };
}

function initHomeNavGuide(nav, hoverCapableQuery) {
  if (document.body?.dataset.page !== "home") {
    return {
      dismissGuide() {},
      syncGuide() {},
      cleanup() {},
    };
  }

  const guide = document.createElement("div");
  const halo = document.createElement("div");
  const spotlight = document.createElement("div");
  const spotlightLabel = document.createElement("span");
  const hint = document.createElement("div");
  let showTimeoutId = 0;
  let removeTimeoutId = 0;
  let frameId = 0;
  let dismissed = false;
  let active = false;
  let listenersDetached = false;

  guide.className = "nav-guide";
  guide.setAttribute("aria-hidden", "true");
  halo.className = "nav-guide__halo";
  spotlight.className = "nav-guide__spotlight";
  spotlightLabel.className = "nav-guide__spotlight-label";
  spotlightLabel.textContent = "Home";
  hint.className = "nav-guide__hint";
  hint.textContent = "Navigate through here!";
  spotlight.append(spotlightLabel);
  guide.append(halo, spotlight, hint);
  document.body.append(guide);

  function queuePositionUpdate() {
    if (dismissed) {
      return;
    }

    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(() => {
      const rect = nav.getBoundingClientRect();
      const spotlightPaddingX = window.innerWidth < 720 ? 12 : 18;
      const spotlightPaddingY = window.innerWidth < 720 ? 10 : 14;
      const haloPaddingX = window.innerWidth < 720 ? 44 : 60;
      const haloPaddingY = window.innerWidth < 720 ? 36 : 48;
      const spotlightLeft = Math.max(10, rect.left - spotlightPaddingX);
      const spotlightTop = Math.max(10, rect.top - spotlightPaddingY);
      const spotlightWidth = Math.min(
        window.innerWidth - spotlightLeft - 10,
        rect.width + spotlightPaddingX * 2
      );
      const spotlightHeight = rect.height + spotlightPaddingY * 2;
      const haloLeft = Math.max(0, spotlightLeft - haloPaddingX);
      const haloTop = Math.max(0, spotlightTop - haloPaddingY);
      const haloWidth = Math.min(
        window.innerWidth - haloLeft,
        spotlightWidth + haloPaddingX * 2
      );
      const haloHeight = spotlightHeight + haloPaddingY * 2;

      spotlight.style.left = `${spotlightLeft}px`;
      spotlight.style.top = `${spotlightTop}px`;
      spotlight.style.width = `${spotlightWidth}px`;
      spotlight.style.height = `${spotlightHeight}px`;

      halo.style.left = `${haloLeft}px`;
      halo.style.top = `${haloTop}px`;
      halo.style.width = `${haloWidth}px`;
      halo.style.height = `${haloHeight}px`;

      const maxHintWidth = Math.min(window.innerWidth - 32, window.innerWidth < 720 ? 220 : 250);
      hint.style.maxWidth = `${maxHintWidth}px`;

      const hintWidth = Math.min(hint.offsetWidth || maxHintWidth, maxHintWidth);
      const desiredHintLeft =
        window.innerWidth < 720
          ? rect.left + (rect.width - hintWidth) / 2
          : rect.right - hintWidth + 10;
      const hintLeft = Math.max(16, Math.min(window.innerWidth - hintWidth - 16, desiredHintLeft));
      const hintTop = spotlightTop + spotlightHeight + (window.innerWidth < 720 ? 10 : 14);

      hint.style.left = `${hintLeft}px`;
      hint.style.top = `${hintTop}px`;
    });
  }

  function showGuide() {
    if (dismissed || !hoverCapableQuery.matches) {
      return;
    }

    active = true;
    queuePositionUpdate();

    requestAnimationFrame(() => {
      guide.classList.add("is-visible");
    });
  }

  function detachGuideListeners() {
    if (listenersDetached) {
      return;
    }

    listenersDetached = true;
    document.removeEventListener("pointermove", handlePointerApproach);
    window.removeEventListener("resize", queuePositionUpdate);
    window.removeEventListener("scroll", queuePositionUpdate);

    if (typeof hoverCapableQuery.addEventListener === "function") {
      hoverCapableQuery.removeEventListener("change", queuePositionUpdate);
    } else if (typeof hoverCapableQuery.removeListener === "function") {
      hoverCapableQuery.removeListener(queuePositionUpdate);
    }

    dismissEvents.forEach((eventName) => {
      nav.removeEventListener(eventName, dismissGuide);
    });
  }

  function dismissGuide() {
    if (dismissed) {
      return;
    }

    dismissed = true;
    active = false;
    window.clearTimeout(showTimeoutId);
    window.clearTimeout(removeTimeoutId);
    cancelAnimationFrame(frameId);

    if (guide.classList.contains("is-visible")) {
      guide.classList.remove("is-visible");
      guide.classList.add("is-dismissing");

      removeTimeoutId = window.setTimeout(() => {
        detachGuideListeners();
        guide.remove();
      }, prefersReducedMotion ? 180 : 560);
      return;
    }

    detachGuideListeners();
    guide.remove();
  }

  function handlePointerApproach(event) {
    if (!active || !hoverCapableQuery.matches) {
      return;
    }

    const rect = nav.getBoundingClientRect();
    const approachPadding = 34;

    if (
      event.clientX >= rect.left - approachPadding &&
      event.clientX <= rect.right + approachPadding &&
      event.clientY >= rect.top - approachPadding &&
      event.clientY <= rect.bottom + approachPadding
    ) {
      dismissGuide();
    }
  }

  const dismissEvents = ["pointerenter", "pointerdown", "focusin", "click"];
  dismissEvents.forEach((eventName) => {
    nav.addEventListener(eventName, dismissGuide);
  });

  document.addEventListener("pointermove", handlePointerApproach);
  window.addEventListener("resize", queuePositionUpdate);
  window.addEventListener("scroll", queuePositionUpdate, { passive: true });

  if (typeof hoverCapableQuery.addEventListener === "function") {
    hoverCapableQuery.addEventListener("change", queuePositionUpdate);
  } else if (typeof hoverCapableQuery.addListener === "function") {
    hoverCapableQuery.addListener(queuePositionUpdate);
  }

  showTimeoutId = window.setTimeout(showGuide, homeNavGuideDelay);

  return {
    dismissGuide,
    syncGuide() {
      if (active) {
        queuePositionUpdate();
      }
    },
    cleanup() {
      window.clearTimeout(showTimeoutId);
      window.clearTimeout(removeTimeoutId);
      cancelAnimationFrame(frameId);
      detachGuideListeners();
      guide.remove();
    },
  };
}

function initExpandableNav() {
  const navs = document.querySelectorAll(".nav");

  if (!navs.length) {
    return;
  }

  const hoverCapableQuery = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 981px)");

  navs.forEach((nav, index) => {
    if (nav.dataset.expandableNavReady === "true") {
      return;
    }

    const topbar = nav.closest(".topbar");
    const homeLink = nav.querySelector(".nav-home");
    const moreLinks = nav.querySelector(".nav-more");
    const isHomePage = document.body?.dataset.page === "home";

    if (!homeLink || !moreLinks || !topbar) {
      return;
    }

    nav.dataset.expandableNavReady = "true";

    const navId = nav.id || `primary-nav-${document.body?.dataset.page || "page"}-${index + 1}`;
    nav.id = navId;

    let navToggle = topbar.querySelector(".nav-toggle");

    if (!navToggle) {
      navToggle = document.createElement("button");
      navToggle.type = "button";
      navToggle.className = "nav-toggle";
      navToggle.setAttribute("aria-controls", navId);
      navToggle.setAttribute("aria-label", "Toggle navigation");
      navToggle.innerHTML = `
        <span class="nav-toggle__label">Menu</span>
        <span class="nav-toggle__icon" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
      `;
      topbar.insertBefore(navToggle, nav);
    }

    let compactTimeoutId = 0;
    let navCollapseTimeoutId = 0;
    let isMobileNavOpen = false;
    const navGuide = initHomeNavGuide(nav, hoverCapableQuery);

    function isInteractiveNav() {
      return hoverCapableQuery.matches;
    }

    function isMobileNav() {
      return isMobileViewport();
    }

    function shouldUseCompactTopbar() {
      return !isHomePage && hoverCapableQuery.matches;
    }

    function setMobileNavState(nextOpen) {
      isMobileNavOpen = nextOpen;
      topbar.classList.toggle("topbar--mobile-ready", isMobileNav());
      topbar.classList.toggle("topbar--mobile-open", isMobileNav() && nextOpen);
      nav.classList.toggle("nav--mobile-open", isMobileNav() && nextOpen);
      navToggle.hidden = !isMobileNav();
      navToggle.setAttribute("aria-expanded", String(isMobileNav() && nextOpen));
      navToggle.querySelector(".nav-toggle__label").textContent = nextOpen ? "Close" : "Menu";

      if (isMobileNav()) {
        nav.setAttribute("aria-hidden", String(!nextOpen));
        topbar.setAttribute("aria-expanded", String(nextOpen));
      } else {
        nav.removeAttribute("aria-hidden");
      }
    }

    function setNavMeasurements() {
      const styles = window.getComputedStyle(nav);
      const gap = Number.parseFloat(styles.columnGap) || Number.parseFloat(styles.gap) || 0;
      const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
      const borderLeft = Number.parseFloat(styles.borderLeftWidth) || 0;
      const borderRight = Number.parseFloat(styles.borderRightWidth) || 0;
      const homeWidth = Math.ceil(homeLink.getBoundingClientRect().width);
      const moreWidth = Math.ceil(moreLinks.scrollWidth);
      const frameWidth = paddingLeft + paddingRight + borderLeft + borderRight;

      nav.style.setProperty("--nav-collapsed-width", `${homeWidth + frameWidth + 2}px`);
      nav.style.setProperty("--nav-expanded-width", `${homeWidth + moreWidth + gap + frameWidth + 4}px`);
    }

    function openNav() {
      if (!isInteractiveNav() || isMobileNav() || topbar.classList.contains("topbar--compact")) {
        return;
      }

      window.clearTimeout(navCollapseTimeoutId);
      nav.classList.add("nav--expanded");

      requestAnimationFrame(() => {
        nav.classList.add("nav--revealed");
      });
    }

    function closeNav() {
      if (!isInteractiveNav() || isMobileNav()) {
        return;
      }

      nav.classList.remove("nav--revealed");
      window.clearTimeout(navCollapseTimeoutId);

      navCollapseTimeoutId = window.setTimeout(() => {
        if (nav.matches(":hover") || nav.contains(document.activeElement)) {
          return;
        }

        nav.classList.remove("nav--expanded");
      }, prefersReducedMotion ? 0 : 240);
    }

    function expandTopbar() {
      if (isMobileNav()) {
        return;
      }

      window.clearTimeout(compactTimeoutId);
      topbar.classList.remove("topbar--compact");
      topbar.setAttribute("aria-expanded", "true");
      closeNav();

      if (!isHomePage) {
        navGuide.dismissGuide();
      }
    }

    function collapseTopbar() {
      if (isMobileNav() || !shouldUseCompactTopbar()) {
        return;
      }

      closeNav();
      window.clearTimeout(compactTimeoutId);
      compactTimeoutId = window.setTimeout(() => {
        if (topbar.matches(":hover") || topbar.contains(document.activeElement)) {
          return;
        }

        topbar.classList.add("topbar--compact");
        topbar.setAttribute("aria-expanded", "false");
      }, prefersReducedMotion ? 0 : 240);
    }

    function resetNav() {
      window.clearTimeout(compactTimeoutId);
      window.clearTimeout(navCollapseTimeoutId);
      topbar.classList.remove("topbar--compact");
      topbar.classList.remove("topbar--mobile-ready", "topbar--mobile-open");
      topbar.removeAttribute("tabindex");
      topbar.removeAttribute("aria-expanded");
      nav.classList.remove("nav--expanded", "nav--revealed", "nav--mobile-open");
      nav.removeAttribute("aria-hidden");
    }

    function syncNavMode() {
      setNavMeasurements();
      navGuide.syncGuide();
      resetNav();

      if (isMobileNav()) {
        navGuide.dismissGuide();
        setMobileNavState(isMobileNavOpen);
        return;
      }

      navToggle.hidden = true;
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.querySelector(".nav-toggle__label").textContent = "Menu";

      if (isHomePage) {
        topbar.setAttribute("aria-expanded", "true");
        return;
      }

      if (!shouldUseCompactTopbar()) {
        return;
      }

      topbar.tabIndex = 0;
      topbar.setAttribute("aria-expanded", "true");
      compactTimeoutId = window.setTimeout(() => {
        if (!topbar.matches(":hover") && !topbar.contains(document.activeElement)) {
          topbar.classList.add("topbar--compact");
          topbar.setAttribute("aria-expanded", "false");
        }
      }, prefersReducedMotion ? 0 : 360);
    }

    navToggle.addEventListener("click", () => {
      if (!isMobileNav()) {
        return;
      }

      setMobileNavState(!isMobileNavOpen);
    });

    topbar.addEventListener("pointerenter", expandTopbar);
    topbar.addEventListener("pointerleave", collapseTopbar);
    topbar.addEventListener("focusin", expandTopbar);
    topbar.addEventListener("focusout", () => {
      window.setTimeout(() => {
        if (!topbar.contains(document.activeElement)) {
          collapseTopbar();
        }
      }, 0);
    });
    topbar.addEventListener("keydown", (event) => {
      if (isMobileNav()) {
        if (event.key === "Escape" && isMobileNavOpen) {
          setMobileNavState(false);
          navToggle.focus();
        }
        return;
      }

      if (!shouldUseCompactTopbar() || document.activeElement !== topbar) {
        return;
      }

      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      expandTopbar();
      nav.querySelector(".nav-home")?.focus();
    });
    nav.addEventListener("pointerenter", openNav);
    nav.addEventListener("pointerleave", closeNav);
    nav.addEventListener("focusin", openNav);
    nav.addEventListener("focusout", () => {
      window.setTimeout(() => {
        if (!nav.contains(document.activeElement)) {
          closeNav();
        }
      }, 0);
    });
    nav.addEventListener("click", (event) => {
      if (!isMobileNav() || !event.target.closest("a")) {
        return;
      }

      setMobileNavState(false);
    });

    window.addEventListener("resize", syncNavMode);

    if (typeof hoverCapableQuery.addEventListener === "function") {
      hoverCapableQuery.addEventListener("change", syncNavMode);
    } else if (typeof hoverCapableQuery.addListener === "function") {
      hoverCapableQuery.addListener(syncNavMode);
    }

    if (document.fonts?.ready) {
      document.fonts.ready
        .then(() => {
          setNavMeasurements();
          navGuide.syncGuide();
        })
        .catch(() => {
          // Font loading is best-effort for nav sizing.
        });
    }

    window.addEventListener("beforeunload", () => {
      window.clearTimeout(compactTimeoutId);
      window.clearTimeout(navCollapseTimeoutId);
      navGuide.cleanup();
    });

    syncNavMode();
  });
}

function initTilt() {
  const tiltItems = document.querySelectorAll("[data-tilt]");

  if (!tiltItems.length || prefersReducedMotion || window.innerWidth < 768) {
    return;
  }

  tiltItems.forEach((item) => {
    if (item.dataset.tiltReady === "true") {
      return;
    }

    item.dataset.tiltReady = "true";
    let frame = null;

    item.addEventListener("mousemove", (event) => {
      const rect = item.getBoundingClientRect();
      const offsetX = (event.clientX - rect.left) / rect.width;
      const offsetY = (event.clientY - rect.top) / rect.height;
      const rotateY = (offsetX - 0.5) * 8;
      const rotateX = (0.5 - offsetY) * 8;
      item.style.setProperty("--pointer-x", `${offsetX * 100}%`);
      item.style.setProperty("--pointer-y", `${offsetY * 100}%`);

      if (frame) {
        cancelAnimationFrame(frame);
      }

      frame = requestAnimationFrame(() => {
        item.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
      });
    });

    item.addEventListener("mouseleave", () => {
      item.style.transform = "";
      item.style.setProperty("--pointer-x", "50%");
      item.style.setProperty("--pointer-y", "50%");
    });
  });
}

window.refreshInteractiveCards = initTilt;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function buildHeroFragments(root) {
  if (!root || root.childElementCount > 0) {
    return;
  }

  const { columns, rows, inset, gap } = heroFragmentGrid;
  const usableWidth = 1 - inset * 2;
  const usableHeight = 1 - inset * 2;
  const pieceWidth = (usableWidth - gap * (columns - 1)) / columns;
  const pieceHeight = (usableHeight - gap * (rows - 1)) / rows;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const fragment = document.createElement("span");
      const x = inset + column * (pieceWidth + gap);
      const y = inset + row * (pieceHeight + gap);
      const centerX = x + pieceWidth / 2;
      const centerY = y + pieceHeight / 2;

      fragment.className = "hero-fragment";
      fragment.style.left = `${x * 100}%`;
      fragment.style.top = `${y * 100}%`;
      fragment.style.width = `${pieceWidth * 100}%`;
      fragment.style.height = `${pieceHeight * 100}%`;
      fragment.dataset.centerX = `${centerX}`;
      fragment.dataset.centerY = `${centerY}`;
      fragment.dataset.row = `${row}`;
      fragment.dataset.column = `${column}`;
      root.append(fragment);
    }
  }
}

function randomizeHeroFragments(root) {
  if (!root) {
    return;
  }

  const impactX = (root.dataset.impactX ? Number(root.dataset.impactX) : 0.5) - 0.5;
  const impactY = (root.dataset.impactY ? Number(root.dataset.impactY) : 0.42) - 0.5;

  Array.from(root.children).forEach((fragment, index) => {
    const centerX = Number(fragment.dataset.centerX || 0.5) - 0.5;
    const centerY = Number(fragment.dataset.centerY || 0.5) - 0.5;
    const offsetX = centerX - impactX;
    const offsetY = centerY - impactY;
    const horizontalDirection = Math.sign(offsetX) || (index % 2 === 0 ? -1 : 1);
    const horizontalSpread =
      randomBetween(70, 150) + Math.abs(offsetX) * randomBetween(50, 120);
    const lift = randomBetween(-52, -16) - Math.abs(offsetY) * 18;
    const fall = randomBetween(210, 360) + Math.abs(offsetY) * 120;
    const rotation = randomBetween(6, 18) * horizontalDirection;

    fragment.style.setProperty("--tx", `${horizontalSpread * horizontalDirection}px`);
    fragment.style.setProperty("--ty", `${fall}px`);
    fragment.style.setProperty("--tx-mid", `${horizontalSpread * horizontalDirection * 0.18}px`);
    fragment.style.setProperty("--lift", `${lift}px`);
    fragment.style.setProperty("--rot", `${rotation}deg`);
    fragment.style.setProperty("--rot-mid", `${rotation * 0.16}deg`);
    fragment.style.setProperty("--delay", `${index * 10}ms`);
  });
}

function getHeroImpactPoint(hero, event) {
  const rect = hero.getBoundingClientRect();

  if (!event || typeof event.clientX !== "number" || typeof event.clientY !== "number") {
    return {
      x: rect.width / 2,
      y: rect.height / 2,
      ratioX: 0.5,
      ratioY: 0.5,
    };
  }

  const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
  const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));

  return {
    x,
    y,
    ratioX: rect.width ? x / rect.width : 0.5,
    ratioY: rect.height ? y / rect.height : 0.5,
  };
}

function setHeroImpactPoint(hero, point) {
  hero.style.setProperty("--impact-x", `${point.ratioX * 100}%`);
  hero.style.setProperty("--impact-y", `${point.ratioY * 100}%`);
}

function spawnDamageParticles(root, point) {
  if (!root || prefersReducedMotion) {
    return;
  }

  const particleCount = 10;

  for (let index = 0; index < particleCount; index += 1) {
    const particle = document.createElement("span");
    const driftX = randomBetween(-42, 42);
    const fallY = randomBetween(28, 84);
    const lift = randomBetween(-22, -6);
    const size = randomBetween(5, 10);

    particle.className = "hero-damage-particle";
    particle.style.setProperty("--origin-x", `${point.x + randomBetween(-6, 6)}px`);
    particle.style.setProperty("--origin-y", `${point.y + randomBetween(-4, 5)}px`);
    particle.style.setProperty("--drift-x", `${driftX}px`);
    particle.style.setProperty("--fall-y", `${fallY}px`);
    particle.style.setProperty("--lift", `${lift}px`);
    particle.style.setProperty("--drift-x-mid", `${point.x + driftX * 0.18}px`);
    particle.style.setProperty("--lift-y", `${point.y + lift}px`);
    particle.style.setProperty("--size", `${size}px`);
    particle.style.animationDelay = `${index * 10}ms`;
    root.append(particle);

    window.setTimeout(() => {
      particle.remove();
    }, 620 + index * 8);
  }
}

function initHeroCombat(typingState) {
  const hero = document.querySelector("[data-hero-combat]");

  if (!hero) {
    return;
  }

  if (hero.dataset.heroCombatReady === "true") {
    return;
  }

  hero.dataset.heroCombatReady = "true";

  const target = hero.querySelector(".typing-target");
  const healthFill = hero.querySelector(".hero-health__fill");
  const particlesRoot = hero.querySelector(".hero-damage-particles");
  const fragmentsRoot = hero.querySelector(".hero-fragments");
  const sequence = typingState?.sequence || JSON.parse(target?.dataset.typing || "[]");
  const maxHealth = 10;
  const destroyDuration = prefersReducedMotion ? 160 : 720;
  const respawnDelay = 3000;
  const greetingDelay = prefersReducedMotion ? 900 : 1250;
  const thresholdWarnings = new Map([
    [5, "Chill out! 😨"],
    [2, "Alright... 😑"],
  ]);
  let health = maxHealth;
  let phase = "idle";
  let hitResetId = 0;
  let destroyTimeoutId = 0;
  let respawnTimeoutId = 0;
  let resumeTypingTimeoutId = 0;
  let lastImpactPoint = { x: 0, y: 0, ratioX: 0.5, ratioY: 0.5 };
  const triggeredWarnings = new Set();

  if (!target || !healthFill) {
    return;
  }

  buildHeroFragments(fragmentsRoot);

  function clearHeroTimers() {
    window.clearTimeout(hitResetId);
    window.clearTimeout(destroyTimeoutId);
    window.clearTimeout(respawnTimeoutId);
    window.clearTimeout(resumeTypingTimeoutId);
  }

  function updateHealth(nextHealth) {
    health = Math.max(0, Math.min(maxHealth, nextHealth));
    hero.style.setProperty("--hero-health", `${health / maxHealth}`);
    hero.classList.toggle("hero-copy--critical", health > 0 && health <= 3);
  }

  function triggerHitEffect(point) {
    if (prefersReducedMotion) {
      return;
    }

    setHeroImpactPoint(hero, point);
    spawnDamageParticles(particlesRoot, point);
    hero.classList.remove("hero-copy--hit");
    void hero.offsetWidth;
    hero.classList.add("hero-copy--hit");
    hitResetId = window.setTimeout(() => {
      hero.classList.remove("hero-copy--hit");
    }, 360);
  }

  function maybePlayHealthWarning() {
    const warningText = thresholdWarnings.get(health);

    if (!warningText || triggeredWarnings.has(health) || phase !== "idle" || health <= 0) {
      return;
    }

    triggeredWarnings.add(health);
    playTypingSequence(target, [warningText]);
  }

  function destroyHero() {
    phase = "destroying";
    clearHeroTimers();
    stopTyping(target, "");
    hero.style.transform = "";
    hero.classList.remove("hero-copy--hit", "hero-copy--critical");
    hero.classList.add("hero-copy--destroying");
    setHeroImpactPoint(hero, lastImpactPoint);
    fragmentsRoot.dataset.impactX = `${lastImpactPoint.ratioX}`;
    fragmentsRoot.dataset.impactY = `${lastImpactPoint.ratioY}`;
    randomizeHeroFragments(fragmentsRoot);
    spawnDamageParticles(particlesRoot, lastImpactPoint);

    destroyTimeoutId = window.setTimeout(() => {
      phase = "destroyed";
      hero.classList.add("hero-copy--destroyed");
      hero.classList.remove("hero-copy--destroying");
      setTypingText(target, "");
    }, destroyDuration);

    respawnTimeoutId = window.setTimeout(() => {
      phase = "respawning";
      hero.style.transform = "";
      triggeredWarnings.clear();
      hero.classList.remove(
        "hero-copy--destroyed",
        "hero-copy--destroying",
        "hero-copy--engaged",
        "hero-copy--critical",
        "hero-copy--hit"
      );
      updateHealth(maxHealth);
      void hero.offsetWidth;
      hero.classList.add("hero-copy--respawning");
      setTypingText(target, "Hello again!");

      window.setTimeout(() => {
        hero.classList.remove("hero-copy--respawning");
      }, prefersReducedMotion ? 0 : 760);

      resumeTypingTimeoutId = window.setTimeout(() => {
        phase = "idle";
        playTypingSequence(target, sequence.slice(1).length ? sequence.slice(1) : sequence);
      }, greetingDelay);
    }, respawnDelay);
  }

  function registerHit(event) {
    if (phase !== "idle") {
      return;
    }

    lastImpactPoint = getHeroImpactPoint(hero, event);
    hero.classList.add("hero-copy--engaged");
    hero.style.transform = "";
    updateHealth(health - 1);
    triggerHitEffect(lastImpactPoint);
    maybePlayHealthWarning();

    if (health <= 0) {
      destroyHero();
    }
  }

  updateHealth(maxHealth);

  hero.addEventListener("click", registerHit);
  hero.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    registerHit();
  });

  window.addEventListener("beforeunload", clearHeroTimers);
}

function initHomePageEnhancements(options = {}) {
  const { startTyping = false } = options;
  const typingState = startTyping ? initTyping() : null;

  initReveal();
  initHeroCombat(typingState);
  initExpandableNav();
  initTilt();

  return typingState;
}

window.initHomePageEnhancements = initHomePageEnhancements;

function initParticles() {
  const canvas = document.querySelector(".particles");

  if (!canvas) {
    return;
  }

  if (document.body?.dataset.page !== "home") {
    canvas.setAttribute("aria-hidden", "true");
    return;
  }

  const context = canvas.getContext("2d", { alpha: true, desynchronized: true });

  if (!context) {
    return;
  }

  let width = 0;
  let height = 0;
  let animationFrame = null;
  let lastFrameTime = 0;
  let stars = [];
  let shootingStars = [];
  let particleIntroMode = document.body?.dataset.homeIntroState === "loading" ? "dormant" : "ready";
  let particleBurstStart = 0;
  const particleBurstDuration = 1650;
  const devicePixelRatioCap = isMobileViewport() ? 1 : 1.25;
  const renderScale = Math.min(window.devicePixelRatio || 1, devicePixelRatioCap);
  const hardwareThreads = navigator.hardwareConcurrency || 4;
  const reducedParticleLoad = isMobileViewport() || hardwareThreads <= 4;
  const targetFrameDuration = reducedParticleLoad ? 1000 / 30 : 1000 / 45;

  function easeOutCubic(value) {
    return 1 - (1 - value) ** 3;
  }

  function triggerParticleBurst() {
    if (prefersReducedMotion || particleIntroMode === "burst") {
      return;
    }

    particleIntroMode = "burst";
    particleBurstStart = performance.now();

    for (let index = 0; index < 3; index += 1) {
      spawnShootingStar(true);
    }
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * renderScale);
    canvas.height = Math.round(height * renderScale);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    const densityDivisor = reducedParticleLoad ? 14000 : 11000;
    const densityMin = reducedParticleLoad ? 70 : 96;
    const densityMax = reducedParticleLoad ? 140 : 180;
    const density = Math.min(densityMax, Math.max(densityMin, Math.floor((width * height) / densityDivisor)));

    stars = Array.from({ length: density }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.5 + 0.25,
      alpha: Math.random() * 0.48 + 0.12,
      drift: Math.random() * 0.16 + 0.02,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.02 + 0.006,
      burstBias: Math.random() * 0.8 + 0.6,
    }));
  }

  function spawnShootingStar(isBurst = false) {
    shootingStars.push({
      x: isBurst ? width * (0.24 + Math.random() * 0.52) : Math.random() * width * 0.9,
      y: isBurst ? height * (0.14 + Math.random() * 0.28) : Math.random() * height * 0.45,
      vx: isBurst ? Math.random() * 10 + 16 : Math.random() * 8 + 10,
      vy: isBurst ? Math.random() * 3.2 + 2.8 : Math.random() * 2.4 + 2.2,
      length: isBurst ? Math.random() * 140 + 120 : Math.random() * 120 + 90,
      life: 1,
      decay: isBurst ? Math.random() * 0.01 + 0.006 : Math.random() * 0.012 + 0.008,
    });
  }

  function draw(frameTime = performance.now()) {
    if (frameTime - lastFrameTime < targetFrameDuration) {
      animationFrame = requestAnimationFrame(draw);
      return;
    }

    lastFrameTime = frameTime;
    context.clearRect(0, 0, width, height);
    let fieldOpacity = particleIntroMode === "dormant" ? 0 : 1;
    let burstEnvelope = 0;
    let driftMultiplier = 1;
    let shootingStarChance = 0.018;
    let shootingStarCap = 3;

    if (particleIntroMode === "burst") {
      const burstProgress = Math.min(1, (frameTime - particleBurstStart) / particleBurstDuration);
      const easedProgress = easeOutCubic(burstProgress);

      fieldOpacity = easedProgress;
      burstEnvelope = Math.sin(Math.PI * burstProgress) * (1 - burstProgress * 0.18);
      driftMultiplier = 1 + burstEnvelope * 1.45;
      shootingStarChance = 0.065;
      shootingStarCap = 7;

      if (burstProgress >= 1) {
        particleIntroMode = "ready";
      }
    }

    stars.forEach((star) => {
      star.y -= star.drift * driftMultiplier;
      star.twinkle += star.twinkleSpeed * (1 + burstEnvelope * 1.8);

      if (star.y < -4) {
        star.y = height + 4;
        star.x = Math.random() * width;
      }

      const offsetFromCenterX = star.x - width / 2;
      const offsetFromCenterY = star.y - height / 2;
      const distance = Math.max(1, Math.hypot(offsetFromCenterX, offsetFromCenterY));
      const unitX = offsetFromCenterX / distance;
      const unitY = offsetFromCenterY / distance;
      const burstOffset = burstEnvelope * (14 + star.burstBias * 42);
      const drawX = star.x + unitX * burstOffset;
      const drawY = star.y + unitY * burstOffset;
      const drawRadius = star.radius * (1 + burstEnvelope * 1.4);
      const drawAlpha =
        (star.alpha + Math.sin(star.twinkle) * 0.08 + burstEnvelope * 0.1) * fieldOpacity;

      context.beginPath();
      context.fillStyle = `rgba(245, 238, 255, ${Math.max(0, drawAlpha)})`;
      context.arc(drawX, drawY, drawRadius, 0, Math.PI * 2);
      context.fill();
    });

    if (fieldOpacity > 0 && Math.random() < shootingStarChance && shootingStars.length < shootingStarCap) {
      spawnShootingStar(particleIntroMode === "burst");
    }

    shootingStars = shootingStars.filter((star) => star.life > 0);

    shootingStars.forEach((star) => {
      const gradient = context.createLinearGradient(
        star.x,
        star.y,
        star.x - star.length,
        star.y - star.length * 0.24
      );

      gradient.addColorStop(0, `rgba(255, 244, 250, ${star.life * Math.max(fieldOpacity, 0.24)})`);
      gradient.addColorStop(1, "rgba(255, 244, 250, 0)");

      context.beginPath();
      context.strokeStyle = gradient;
      context.lineWidth = 1.8;
      context.moveTo(star.x, star.y);
      context.lineTo(star.x - star.length, star.y - star.length * 0.24);
      context.stroke();

      star.x += star.vx;
      star.y += star.vy;
      star.life -= star.decay;
    });

    animationFrame = requestAnimationFrame(draw);
  }

    resize();
    window.addEventListener("homepage:intro-particle-burst", triggerParticleBurst);

  if (!prefersReducedMotion) {
    draw();
    window.addEventListener("resize", resize);
  } else {
    stars.forEach((star) => {
      context.beginPath();
      context.fillStyle = `rgba(232, 240, 255, ${star.alpha})`;
      context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      context.fill();
    });
  }

  window.addEventListener("beforeunload", () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }

    window.removeEventListener("homepage:intro-particle-burst", triggerParticleBurst);
  });
}

function buildLinescoreTable(score) {
  const columns = score.columns
    .map((column) => `<th scope="col">${column}</th>`)
    .join("");

  const rows = score.rows
    .map((row) => {
      const cells = row.scores.map((value) => `<td>${value}</td>`).join("");
      return `<tr><th scope="row">${row.label}</th>${cells}<td><strong>${row.total}</strong></td></tr>`;
    })
    .join("");

  return `
    <table class="linescore">
      <thead>
        <tr>
          <th scope="col">Team</th>
          ${columns}
          <th scope="col">T</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function initScoreboard() {
  const root = document.querySelector("#scoreboard");

  if (!root || !window.SCOREBOARD_DATA) {
    return;
  }

  root.innerHTML = window.SCOREBOARD_DATA.map((entry) => {
    const notes = entry.notes.map((note) => `<li>${note}</li>`).join("");

    return `
      <article class="panel score-card" data-tilt>
        <div class="score-top">
          <div>
            <p class="eyebrow">${entry.league}</p>
            <h3>${entry.team}</h3>
          </div>
          <span class="score-date">${entry.date}</span>
        </div>

        <div class="score-line">
          <div class="score-row is-favorite">
            <span>${entry.team}</span>
            <strong>${entry.teamScore}</strong>
          </div>
          <div class="score-row">
            <span>${entry.opponent}</span>
            <strong>${entry.opponentScore}</strong>
          </div>
        </div>

        ${buildLinescoreTable(entry.linescore)}

        <ul class="score-notes">${notes}</ul>

        <a class="score-source" href="${entry.sourceUrl}" target="_blank" rel="noreferrer">
          ${entry.sourceLabel}
        </a>
      </article>
    `;
  }).join("");
}

initViewportBezel();
initWallpaper();
if (!usesReactSiteMotion) {
  initReveal();
}
const typingState = initTyping();
initHeroCombat(typingState);
initScoreboard();
if (!usesReactSiteMotion) {
  initExpandableNav();
}
initTilt();
initParticles();
