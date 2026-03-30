import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenisSmoothScroll } from "./use-lenis";

gsap.registerPlugin(ScrollTrigger);

const introEase = [0.16, 1, 0.3, 1];
const pageConfig = {
  about: { label: "About", path: "about" },
  projects: { label: "Projects", path: "projects" },
  hobbies: { label: "Hobbies", path: "hobbies" },
  contact: { label: "Contact", path: "contact" },
};

function getSiteRoute(route = "") {
  if (document.body?.dataset.page === "home") {
    return route ? `${route}/` : "./";
  }

  return route ? `../${route}/` : "../";
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    function handleChange(event) {
      setMatches(event.matches);
    }

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleChange);
    }

    setMatches(mediaQuery.matches);

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleChange);
      } else if (typeof mediaQuery.removeListener === "function") {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
}

function SiteTopbar({ page }) {
  const reducedMotion = useReducedMotion();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const supportsCompactDesktop = useMediaQuery("(hover: hover) and (pointer: fine) and (min-width: 981px)");
  const collapseTimeoutRef = useRef(null);
  const pageLinks = useMemo(() => Object.entries(pageConfig), []);
  const [isCompact, setIsCompact] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    window.clearTimeout(collapseTimeoutRef.current);

    if (isMobile) {
      setIsCompact(false);
      setIsMobileOpen(false);
      return;
    }

    setIsCompact(Boolean(supportsCompactDesktop));
    setIsMobileOpen(false);
  }, [isMobile, supportsCompactDesktop]);

  useEffect(() => {
    return () => {
      window.clearTimeout(collapseTimeoutRef.current);
    };
  }, []);

  function openDesktopTopbar() {
    if (isMobile || !supportsCompactDesktop) {
      return;
    }

    window.clearTimeout(collapseTimeoutRef.current);
    setIsCompact(false);
  }

  function closeDesktopTopbar() {
    if (isMobile || !supportsCompactDesktop) {
      return;
    }

    window.clearTimeout(collapseTimeoutRef.current);
    collapseTimeoutRef.current = window.setTimeout(() => {
      setIsCompact(true);
    }, reducedMotion ? 0 : 220);
  }

  const showBrandCopy = isMobile || !supportsCompactDesktop || !isCompact;
  const showDesktopNav = !isMobile && (!supportsCompactDesktop || !isCompact);
  const topbarClassName = [
    "topbar",
    isCompact ? "topbar--compact" : "",
    isMobile ? "topbar--mobile-ready" : "",
    isMobile && isMobileOpen ? "topbar--mobile-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.header
      className={topbarClassName}
      initial={{
        opacity: reducedMotion ? 1 : 0,
        y: reducedMotion ? 0 : 22,
        scale: reducedMotion ? 1 : 0.986,
        filter: reducedMotion ? "blur(0px)" : "blur(10px)",
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
      }}
      transition={{
        duration: reducedMotion ? 0.2 : 0.78,
        ease: introEase,
      }}
      onPointerEnter={openDesktopTopbar}
      onPointerLeave={closeDesktopTopbar}
      onFocus={openDesktopTopbar}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) {
          return;
        }

        closeDesktopTopbar();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && isMobile && isMobileOpen) {
          setIsMobileOpen(false);
        }
      }}
    >
      <div className="brand">
        <a
          className="brand-photo"
          href="https://www.linkedin.com/in/divyansh-raghuvanshi-8b4367371/"
          target="_blank"
          rel="noreferrer"
          aria-label="Visit Divyansh Raghuvanshi's LinkedIn profile"
        >
          <img
            src="https://media.licdn.com/dms/image/v2/D4E03AQGl3WM9RkISmw/profile-displayphoto-scale_400_400/B4EZwLv5wbIEAg-/0/1769723633535?e=1775692800&v=beta&t=QbkpnT9vsHX9HrIciD1SesZDxvUNeXB7HerGx-6A7-g"
            alt="Divyansh Raghuvanshi"
          />
        </a>

        <motion.a
          className="brand-copy"
          href={getSiteRoute()}
          initial={false}
          animate={{
            opacity: showBrandCopy ? 1 : 0,
            x: showBrandCopy ? 0 : 16,
            filter: showBrandCopy ? "blur(0px)" : "blur(10px)",
          }}
          transition={{
            duration: reducedMotion ? 0.18 : 0.5,
            ease: introEase,
          }}
        >
          <span className="brand-text">Divyansh Raghuvanshi</span>
          <span className="brand-subtext">Student @ University of Connecticut</span>
        </motion.a>
      </div>

      <button
        type="button"
        className="nav-toggle"
        aria-controls="site-primary-nav"
        aria-label="Toggle navigation"
        aria-expanded={String(isMobile && isMobileOpen)}
        hidden={!isMobile}
        onClick={() => {
          setIsMobileOpen((current) => !current);
        }}
      >
        <span className="nav-toggle__label">{isMobileOpen ? "Close" : "Menu"}</span>
        <span className="nav-toggle__icon" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      <motion.nav
        id="site-primary-nav"
        className={`nav ${showDesktopNav ? "nav--expanded nav--revealed" : ""} ${
          isMobile && isMobileOpen ? "nav--mobile-open" : ""
        }`.trim()}
        aria-label="Primary"
        aria-hidden={isMobile ? String(!isMobileOpen) : undefined}
        onClick={(event) => {
          if (!isMobile || !event.target.closest("a")) {
            return;
          }

          setIsMobileOpen(false);
        }}
        initial={false}
        animate={{
          opacity: isMobile ? (isMobileOpen ? 1 : 0) : showDesktopNav ? 1 : 0,
          x: isMobile ? 0 : showDesktopNav ? 0 : 18,
          filter: isMobile
            ? isMobileOpen
              ? "blur(0px)"
              : "blur(8px)"
            : showDesktopNav
              ? "blur(0px)"
              : "blur(10px)",
        }}
        transition={{
          duration: reducedMotion ? 0.18 : 0.44,
          ease: introEase,
        }}
      >
        <a className="nav-home" href={getSiteRoute()}>
          Home
        </a>
        <div className="nav-more">
          {pageLinks.map(([key, item]) => (
            <a
              key={key}
              href={getSiteRoute(item.path)}
              aria-current={page === key ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
        </div>
      </motion.nav>
    </motion.header>
  );
}

function collectRevealTargets(section) {
  const selectors = [
    ":scope > .panel",
    ":scope > .section-heading",
    ":scope > .card-grid > .panel",
    ":scope > .two-column > .panel",
    ":scope > .contact-stack > .panel",
    ":scope > .highlight-grid > .panel",
    ":scope > .projects-redirect-card",
  ];
  const targets = selectors.flatMap((selector) => Array.from(section.querySelectorAll(selector)));
  return Array.from(new Set(targets));
}

function setVisibleState(elements) {
  if (!elements.length) {
    return;
  }

  gsap.set(elements, {
    clearProps: "opacity,transform,filter,scale,y,transformOrigin",
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
  });
}

function isInitiallyVisible(element, startRatio) {
  const rect = element.getBoundingClientRect();
  return rect.top <= window.innerHeight * startRatio && rect.bottom >= 0;
}

function SiteMotionOrchestrator({ rootRef, lenisRef }) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const mountNode = rootRef.current;
    const pageShell = mountNode?.parentElement;
    const lenis = lenisRef.current;

    if (!mountNode || !pageShell) {
      return undefined;
    }

    const pageRoot = pageShell.parentElement || mountNode.ownerDocument.body;
    const scroller = document.documentElement;
    const scrollTriggerBase = lenis ? { scroller } : {};

    const cleanup = [];
    const ctx = gsap.context(() => {
      const revealSections = Array.from(pageShell.querySelectorAll(".reveal"));
      const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
      const sectionStartRatio = isMobileViewport ? 0.88 : 0.72;
      const cardStartRatio = isMobileViewport ? 0.9 : 0.78;
      const footerStartRatio = 1.14;

      function createSectionReveal(section) {
        if (section.dataset.gsapSectionReady === "true") {
          return;
        }

        section.dataset.gsapSectionReady = "true";
        const targets = collectRevealTargets(section);
        const sectionStartsVisible = isInitiallyVisible(section, sectionStartRatio);

        if (reducedMotion) {
          setVisibleState([section, ...targets]);
          return;
        }

        if (sectionStartsVisible) {
          setVisibleState([section, ...targets]);
          return;
        }

        gsap.set(section, {
          opacity: 0.42,
          scale: 1.012,
          filter: "blur(12px)",
          transformOrigin: "center center",
        });

        if (targets.length) {
          gsap.set(targets, {
            opacity: 0,
            y: isMobileViewport ? 18 : 24,
            scale: isMobileViewport ? 0.992 : 0.986,
            filter: "blur(8px)",
            transformOrigin: "center center",
          });
        }

        const timeline = gsap.timeline({
          defaults: { ease: "power3.out" },
          scrollTrigger: {
            ...scrollTriggerBase,
            trigger: section,
            start: isMobileViewport ? "top 88%" : "top 72%",
            once: true,
            invalidateOnRefresh: true,
          },
        });

        timeline.to(section, {
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          duration: 0.88,
        });

        if (targets.length) {
          timeline.to(
            targets,
            {
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              duration: isMobileViewport ? 0.64 : 0.8,
              stagger: isMobileViewport ? 0.05 : 0.08,
            },
            "<0.08"
          );
        }
      }

      revealSections.forEach(createSectionReveal);

      const footer = pageShell.querySelector(".footer");

      if (footer) {
        const footerStartsVisible = isInitiallyVisible(footer, footerStartRatio);

        if (reducedMotion || footerStartsVisible) {
          setVisibleState([footer]);
        } else {
          gsap.fromTo(
            footer,
            { opacity: 0, y: 18, filter: "blur(8px)" },
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.72,
              ease: "power2.out",
              scrollTrigger: {
                ...scrollTriggerBase,
                trigger: footer,
                start: "top bottom-=14%",
                once: true,
              },
            }
          );
        }
      }

      const constructionCard = pageRoot.querySelector(".construction-overlay__card");

      if (constructionCard) {
        if (reducedMotion) {
          gsap.set(constructionCard, { clearProps: "all", opacity: 1, y: 0, scale: 1 });
        } else {
          gsap.fromTo(
            constructionCard,
            { opacity: 0, y: 26, scale: 0.976, filter: "blur(10px)" },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              duration: 0.82,
              ease: "power3.out",
              delay: 0.08,
            }
          );
        }
      }

      const highlightsGrid = pageShell.querySelector("#highlights-grid");

      if (highlightsGrid) {
        const setupHighlightCards = () => {
          const cards = Array.from(highlightsGrid.querySelectorAll(".highlight-card")).filter(
            (card) => card.dataset.gsapCardReady !== "true"
          );

          cards.forEach((card) => {
            card.dataset.gsapCardReady = "true";
            const cardStartsVisible = isInitiallyVisible(card, cardStartRatio);

            if (reducedMotion || cardStartsVisible) {
              setVisibleState([card]);
              return;
            }

            gsap.set(card, {
              opacity: 0,
              y: isMobileViewport ? 18 : 24,
              scale: isMobileViewport ? 0.992 : 0.986,
              filter: "blur(8px)",
            });

            gsap.to(card, {
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              duration: 0.82,
              ease: "power3.out",
              scrollTrigger: {
                ...scrollTriggerBase,
                trigger: card,
                start: isMobileViewport ? "top 90%" : "top 78%",
                once: true,
              },
            });
          });

          ScrollTrigger.refresh();
        };

        const highlightsObserver = new MutationObserver(() => {
          setupHighlightCards();
        });

        highlightsObserver.observe(highlightsGrid, { childList: true });
        cleanup.push(() => highlightsObserver.disconnect());

        window.setTimeout(setupHighlightCards, 80);
      }
    }, pageShell);

    const removeLenisScrollListener = lenis?.on?.("scroll", ScrollTrigger.update);

    if (lenis) {
      ScrollTrigger.scrollerProxy(scroller, {
        scrollTop(value) {
          if (typeof value === "number") {
            lenis.scrollTo(value, { immediate: true, force: true });
          }

          return lenis.scroll;
        },
        getBoundingClientRect() {
          return {
            top: 0,
            left: 0,
            width: window.innerWidth,
            height: window.innerHeight,
          };
        },
      });
    }

    const handleRefresh = () => {
      lenis?.resize?.();
    };

    ScrollTrigger.addEventListener("refresh", handleRefresh);
    ScrollTrigger.refresh();

    cleanup.push(() => {
      removeLenisScrollListener?.();
      ScrollTrigger.removeEventListener("refresh", handleRefresh);
      ctx.revert();
    });

    return () => {
      cleanup.forEach((dispose) => dispose());
    };
  }, [lenisRef, reducedMotion, rootRef]);

  return null;
}

function SiteMotionApp({ page }) {
  const reducedMotion = useReducedMotion();
  const supportsSmoothDesktopScroll = useMediaQuery(
    "(hover: hover) and (pointer: fine) and (min-width: 981px)"
  );
  const hasDensePageLayout = useMemo(() => {
    const revealCount = document.querySelectorAll(".reveal").length;
    const tiltCount = document.querySelectorAll("[data-tilt]").length;

    return page === "about" || revealCount >= 4 || tiltCount >= 6;
  }, [page]);
  const lenisRef = useLenisSmoothScroll(
    !reducedMotion && supportsSmoothDesktopScroll && !hasDensePageLayout
  );
  const rootRef = useRef(null);

  return (
    <div ref={rootRef} className="site-motion-scope">
      <SiteTopbar page={page} />
      <SiteMotionOrchestrator rootRef={rootRef} lenisRef={lenisRef} />
    </div>
  );
}

const siteMotionRoot = document.querySelector("#site-motion-root");
const page = document.body?.dataset.page;

if (siteMotionRoot && page && page !== "home") {
  createRoot(siteMotionRoot).render(<SiteMotionApp page={page} />);
}
