import React, { useEffect, useId, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLenisSmoothScroll } from "./use-lenis";

const INTRO_STAGES = {
  loading: "loading",
  navbarIntro: "navbarIntro",
  heroIntro: "heroIntro",
  ready: "ready",
};
const siteWallpaperUrl =
  "https://uconn.edu/wp-content/uploads/2022/08/Spring_fog_20220520_0009-crop.jpg";
const homepagePreloadPages = ["about/", "projects/", "hobbies/", "contact/"];
const homepagePreloadAssets = ["js/site-motion.bundle.js", "js/highlights.js"];

const introEase = [0.16, 1, 0.3, 1];
const settleEase = [0.22, 1, 0.36, 1];

function easeOutQuint(value) {
  return 1 - (1 - value) ** 5;
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    function syncMatch(event) {
      setMatches(event.matches);
    }

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncMatch);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(syncMatch);
    }

    setMatches(mediaQuery.matches);

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", syncMatch);
      } else if (typeof mediaQuery.removeListener === "function") {
        mediaQuery.removeListener(syncMatch);
      }
    };
  }, [query]);

  return matches;
}

function withTimeout(promise, timeoutMs = 6000) {
  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(resolve, timeoutMs);

    Promise.resolve(promise)
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(timeoutId);
        resolve();
      });
  });
}

function waitForWindowLoad() {
  if (document.readyState === "complete") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    function handleLoad() {
      window.removeEventListener("load", handleLoad);
      resolve();
    }

    window.addEventListener("load", handleLoad, { once: true });
  });
}

function waitForFontsReady() {
  if (!document.fonts?.ready) {
    return Promise.resolve();
  }

  return document.fonts.ready.catch(() => undefined);
}

function preloadImage(source) {
  return new Promise((resolve) => {
    const image = new Image();

    function finish() {
      image.onload = null;
      image.onerror = null;
      resolve();
    }

    image.onload = finish;
    image.onerror = finish;
    image.decoding = "async";
    image.src = source;

    if (image.complete) {
      finish();
    }
  });
}

function warmFetch(target) {
  return fetch(target, {
    credentials: "same-origin",
    cache: "force-cache",
  }).then(() => undefined);
}

function HomeLoadingScreen({ progress, statusLabel, reducedMotion }) {
  const fillDuration = reducedMotion ? 0.12 : progress >= 0.94 ? 0.82 : progress >= 0.76 ? 0.58 : 0.38;

  return (
    <motion.div
      className="home-loading-screen"
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: reducedMotion ? 1 : 0.985,
        filter: reducedMotion ? "blur(0px)" : "blur(6px)",
      }}
      transition={{
        duration: reducedMotion ? 0.2 : 0.52,
        ease: introEase,
      }}
    >
      <div
        className="home-loading-bar"
        role="status"
        aria-live="polite"
        aria-label="Loading portfolio"
      >
        <span className="home-loading-bar__track">
          <motion.span
            className="home-loading-bar__fill"
            initial={false}
            animate={{
              scaleX: reducedMotion ? progress : Math.max(0.04, progress),
              opacity: 1,
            }}
            transition={{
              duration: fillDuration,
              ease: progress >= 0.9 ? settleEase : introEase,
            }}
          />
        </span>
        <p className="home-loading-bar__label">{statusLabel}</p>
      </div>
    </motion.div>
  );
}

function getHomeRoute(route = "") {
  return route ? `${route}/` : "./";
}

function HomeNavbar({ introStage, navbarExpanded, reducedMotion, isMobile }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navbarTravel = reducedMotion ? 0 : isMobile ? 20 : 282;
  const navbarScale = reducedMotion ? 1 : isMobile ? 1.035 : 1.2;
  const navId = "primary-nav-home-intro";
  const shouldShowBrandCopy = isMobile || navbarExpanded;
  const shouldShowDesktopNav = !isMobile && navbarExpanded;
  const brandState = shouldShowBrandCopy
    ? { opacity: 1, x: 0, filter: "blur(0px)" }
    : { opacity: 0, x: 18, filter: "blur(6px)" };
  const navState = isMobile
    ? {
        opacity: isMobileOpen ? 1 : 0,
        x: 0,
        filter: isMobileOpen ? "blur(0px)" : "blur(8px)",
      }
    : shouldShowDesktopNav
      ? { opacity: 1, x: 0, filter: "blur(0px)" }
      : { opacity: 0, x: 18, filter: "blur(6px)" };
  const topbarClassName = [
    "topbar",
    !isMobile && !navbarExpanded ? "topbar--intro-compact" : "",
    isMobile ? "topbar--mobile-ready" : "",
    isMobile && isMobileOpen ? "topbar--mobile-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (!isMobile || introStage !== INTRO_STAGES.ready) {
      setIsMobileOpen(false);
    }
  }, [introStage, isMobile]);

  return (
    <motion.header
      className={topbarClassName}
      initial={{
        opacity: reducedMotion ? 1 : isMobile ? 0 : 0.72,
        y: navbarTravel,
        scale: navbarScale,
        filter: reducedMotion ? "blur(0px)" : isMobile ? "blur(10px)" : "blur(6px)",
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
      }}
      transition={{
        duration: reducedMotion ? 0.24 : isMobile ? 0.82 : 1.34,
        ease: introEase,
      }}
      inert={introStage === INTRO_STAGES.ready ? undefined : ""}
      style={{ pointerEvents: introStage === INTRO_STAGES.ready ? "auto" : "none" }}
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
          href={getHomeRoute()}
          initial={false}
          animate={brandState}
          transition={{
            duration: reducedMotion ? 0.18 : 0.55,
            delay: reducedMotion ? 0 : shouldShowBrandCopy ? 0.08 : 0,
            ease: introEase,
          }}
        >
          <span className="brand-text">Divyansh Raghuvanshi</span>
          <span className="brand-subtext">Student @ University of Connecticut</span>
        </motion.a>
      </div>

      <motion.button
        type="button"
        className="nav-toggle"
        aria-controls={navId}
        aria-label="Toggle navigation"
        aria-expanded={String(isMobile && isMobileOpen)}
        hidden={!isMobile}
        initial={false}
        animate={
          isMobile
            ? { opacity: 1, x: 0, filter: "blur(0px)" }
            : { opacity: 0, x: 12, filter: "blur(6px)" }
        }
        transition={{
          duration: reducedMotion ? 0.18 : 0.42,
          delay: reducedMotion || !isMobile ? 0 : 0.12,
          ease: introEase,
        }}
        onClick={() => {
          if (introStage !== INTRO_STAGES.ready) {
            return;
          }

          setIsMobileOpen((current) => !current);
        }}
      >
        <span className="nav-toggle__label">{isMobileOpen ? "Close" : "Menu"}</span>
        <span className="nav-toggle__icon" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </motion.button>

      <motion.nav
        id={navId}
        className={`nav ${shouldShowDesktopNav ? "nav--expanded nav--revealed" : ""} ${
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
        animate={navState}
        transition={{
          duration: reducedMotion ? 0.18 : isMobile ? 0.3 : 0.6,
          delay: reducedMotion || isMobile || !shouldShowDesktopNav ? 0 : 0.12,
          ease: introEase,
        }}
      >
        <a className="nav-home" href={getHomeRoute()} aria-current="page">
          Home
        </a>
        <div className="nav-more">
          <a href={getHomeRoute("about")}>About</a>
          <a href={getHomeRoute("projects")}>Projects</a>
          <a href={getHomeRoute("hobbies")}>Hobbies</a>
          <a href={getHomeRoute("contact")}>Contact</a>
        </div>
      </motion.nav>
    </motion.header>
  );
}

function HomeLiquidHeadline({ active, reducedMotion }) {
  const filterBaseId = useId().replace(/:/g, "");
  const liquidFilterId = `${filterBaseId}-liquid`;
  const [distortionProgress, setDistortionProgress] = useState(reducedMotion ? 0 : 1);

  useEffect(() => {
    if (!active) {
      setDistortionProgress(reducedMotion ? 0 : 1);
      return undefined;
    }

    if (reducedMotion) {
      setDistortionProgress(0);
      return undefined;
    }

    let frameId = 0;
    let startTime = 0;

    function step(timestamp) {
      if (!startTime) {
        startTime = timestamp;
      }

      const rawProgress = Math.min(1, (timestamp - startTime) / 1080);
      setDistortionProgress(1 - easeOutQuint(rawProgress));

      if (rawProgress < 1) {
        frameId = window.requestAnimationFrame(step);
      }
    }

    setDistortionProgress(1);
    frameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [active, reducedMotion]);

  const distortionScale = reducedMotion ? 0 : 10 * distortionProgress ** 1.05;
  const turbulenceX = reducedMotion ? 0.0012 : 0.0012 + distortionProgress * 0.0048;
  const turbulenceY = reducedMotion ? 0.0022 : 0.0022 + distortionProgress * 0.0072;
  const titleFilter =
    active && !reducedMotion && distortionProgress > 0.002 ? `url(#${liquidFilterId})` : undefined;

  return (
    <div className="home-liquid-title-wrap">
      <svg className="home-liquid-filter-defs" aria-hidden="true" focusable="false">
        <defs>
          <filter
            id={liquidFilterId}
            x="-12%"
            y="-18%"
            width="124%"
            height="136%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency={`${turbulenceX} ${turbulenceY}`}
              numOctaves="2"
              seed="8"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={distortionScale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <motion.h1
        className="home-liquid-title"
        initial={{
          opacity: reducedMotion ? 1 : 0,
          y: reducedMotion ? 0 : 20,
          scale: reducedMotion ? 1 : 1.05,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          duration: reducedMotion ? 0.24 : 0.96,
          ease: settleEase,
          delay: reducedMotion ? 0 : 0.08,
        }}
      >
        <span
          className="home-liquid-title__surface"
          data-text="Hi! I am Div!"
          style={{ filter: titleFilter }}
        >
          Hi! I am Div!
        </span>
      </motion.h1>
    </div>
  );
}

function HomeHero({ introStage, reducedMotion, isMobile }) {
  const shouldShowHero =
    introStage === INTRO_STAGES.heroIntro || introStage === INTRO_STAGES.ready;
  const heroLift = reducedMotion ? 0 : isMobile ? 18 : 54;
  const heroScale = reducedMotion ? 1 : isMobile ? 1.02 : 1.05;
  const heroBlur = reducedMotion ? "blur(0px)" : isMobile ? "blur(6px)" : "blur(8px)";
  const heroDuration = reducedMotion ? 0.24 : isMobile ? 0.84 : 1.16;
  const subcopyDelayBase = reducedMotion ? 0 : isMobile ? 0.1 : 0.16;

  return (
    <section className="hero hero-home-liquid section">
      <div className="home-liquid-stage">
        <div className="home-liquid-atmosphere" aria-hidden="true">
          <motion.span
            className="home-liquid-orb home-liquid-orb--primary"
            animate={
              reducedMotion
                ? undefined
                : {
                    x: [0, 14, -8, 0],
                    y: [0, -10, 6, 0],
                    scale: [1, 1.04, 0.98, 1],
                  }
            }
            transition={{
              duration: 11.5,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          />
          <motion.span
            className="home-liquid-orb home-liquid-orb--secondary"
            animate={
              reducedMotion
                ? undefined
                : {
                    x: [0, -12, 10, 0],
                    y: [0, 8, -10, 0],
                    scale: [1, 0.98, 1.03, 1],
                  }
            }
            transition={{
              duration: 13.5,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          />
        </div>

      <AnimatePresence initial={false}>
        {shouldShowHero ? (
          <motion.div
            key="home-liquid-hero"
            className="home-liquid-content"
            initial={{
              opacity: reducedMotion ? 1 : 0.72,
              y: heroLift,
              scale: heroScale,
              filter: heroBlur,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
            }}
            exit={{
              opacity: 0,
              y: reducedMotion ? 0 : 16,
              scale: reducedMotion ? 1 : 0.99,
            }}
            transition={{
              duration: heroDuration,
              ease: settleEase,
            }}
          >
            <motion.p
              className="home-liquid-kicker"
              initial={{ opacity: 0, y: reducedMotion ? 0 : isMobile ? 8 : 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                duration: reducedMotion ? 0.18 : isMobile ? 0.48 : 0.66,
                delay: subcopyDelayBase,
                ease: introEase,
              }}
            >
              Data Science &amp; Engineering student at UConn
            </motion.p>

            <HomeLiquidHeadline active={shouldShowHero} reducedMotion={reducedMotion} />

            <motion.p
              className="home-liquid-support"
              initial={{
                opacity: 0,
                y: reducedMotion ? 0 : isMobile ? 10 : 14,
                filter: reducedMotion ? "blur(0px)" : isMobile ? "blur(6px)" : "blur(8px)",
              }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                duration: reducedMotion ? 0.18 : isMobile ? 0.54 : 0.74,
                delay: reducedMotion ? 0 : isMobile ? 0.18 : 0.26,
                ease: introEase,
              }}
            >
              Building thoughtful systems across AI, software, and data.
            </motion.p>
          </motion.div>
        ) : (
          <div className="home-liquid-placeholder" aria-hidden="true" />
        )}
      </AnimatePresence>
      </div>
    </section>
  );
}

function HomeFooter({ introStage, reducedMotion }) {
  return (
    <motion.footer
      className="footer home-footer"
      initial={false}
      animate={
        introStage === INTRO_STAGES.ready
          ? {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
            }
          : {
              opacity: 0,
              y: reducedMotion ? 0 : 18,
              filter: reducedMotion ? "blur(0px)" : "blur(8px)",
            }
      }
      transition={{
        duration: reducedMotion ? 0.18 : 0.54,
        delay: reducedMotion ? 0 : 0.08,
        ease: introEase,
      }}
      inert={introStage === INTRO_STAGES.ready ? undefined : ""}
      style={{ pointerEvents: introStage === INTRO_STAGES.ready ? "auto" : "none" }}
    >
      <p>Divyansh Raghuvanshi · 2026</p>
      <p className="footer-tech">
        <span>Made with</span>
        <span className="footer-tech__item">
          <a
            className="footer-tech__link"
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
          >
            <svg className="footer-tech__logo" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.46c.53.1.72-.23.72-.5v-1.95c-2.94.64-3.56-1.25-3.56-1.25-.48-1.2-1.18-1.52-1.18-1.52-.96-.66.07-.65.07-.65 1.06.08 1.62 1.09 1.62 1.09.94 1.61 2.46 1.15 3.06.88.1-.68.37-1.15.66-1.41-2.35-.27-4.82-1.18-4.82-5.24 0-1.16.41-2.12 1.09-2.86-.11-.27-.47-1.37.1-2.86 0 0 .89-.28 2.92 1.09a10.1 10.1 0 0 1 5.32 0c2.03-1.37 2.92-1.09 2.92-1.09.57 1.49.21 2.59.1 2.86.68.74 1.09 1.7 1.09 2.86 0 4.07-2.47 4.96-4.83 5.23.38.33.71.98.71 1.98v2.93c0 .28.19.61.73.5A10.5 10.5 0 0 0 12 1.5Z" />
            </svg>
            <span className="footer-tech__label">Github</span>
          </a>
        </span>
        <span>and</span>
        <span className="footer-tech__item">
          <a
            className="footer-tech__link"
            href="https://code.visualstudio.com/"
            target="_blank"
            rel="noreferrer"
          >
            <svg className="footer-tech__logo" viewBox="0 0 24 24" aria-hidden="true" fill="none">
              <path
                d="M18.9 2.2 11.1 9.2 7.2 6.2 3.8 7.9v8.2l3.4 1.7 3.9-3 7.8 7 2.3-1.1V3.3l-2.3-1.1Z"
                fill="#0065A9"
              />
              <path
                d="M21.2 3.3v17.4l-2.3 1.1-7.8-7V9.2l7.8-7 2.3 1.1Z"
                fill="#007ACC"
              />
              <path
                d="m7.2 6.2 5.6 5.3-5.6 5.3-3.4-1.7v-1.6L8.6 12 3.8 8.1v-.2l3.4-1.7Z"
                fill="#1F9CF0"
              />
            </svg>
            <span className="footer-tech__label">Visual Studio Code</span>
          </a>
        </span>
      </p>
    </motion.footer>
  );
}

function HomeIntroPage() {
  const reducedMotion = useReducedMotion();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [introStage, setIntroStage] = useState(INTRO_STAGES.loading);
  useLenisSmoothScroll(!reducedMotion && introStage === INTRO_STAGES.ready);
  const [navbarExpanded, setNavbarExpanded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0.05);
  const [loadingLabel, setLoadingLabel] = useState("Loading portfolio...");
  const [loadingReady, setLoadingReady] = useState(false);
  const timeoutIdsRef = useRef([]);
  const enhancementsStartedRef = useRef(false);

  function clearQueuedTimeouts() {
    timeoutIdsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    timeoutIdsRef.current = [];
  }

  function queueTimeout(callback, delay) {
    const timeoutId = window.setTimeout(callback, delay);
    timeoutIdsRef.current.push(timeoutId);
    return timeoutId;
  }

  useEffect(() => {
    document.body.dataset.homeIntroState = introStage;

    return () => {
      delete document.body.dataset.homeIntroState;
    };
  }, [introStage]);

  useEffect(() => {
    return () => {
      clearQueuedTimeouts();
      delete document.body.dataset.homeIntroState;
    };
  }, []);

  useEffect(() => {
    if (introStage !== INTRO_STAGES.loading) {
      return undefined;
    }

    let cancelled = false;

    async function runHomepagePreload() {
      setLoadingReady(false);
      setLoadingProgress(0.05);
      setLoadingLabel("Loading portfolio...");

      const loadingSteps = [
        {
          progress: 0.34,
          label: "Loading portfolio assets...",
          work: () =>
            Promise.all([
              withTimeout(waitForWindowLoad(), 8000),
              withTimeout(waitForFontsReady(), 5000),
              withTimeout(preloadImage(siteWallpaperUrl), 6000),
            ]),
        },
        {
          progress: 0.68,
          label: "Loading portfolio pages...",
          work: () =>
            Promise.all(
              homepagePreloadPages.map((target) => withTimeout(warmFetch(target), 5000))
            ),
        },
        {
          progress: 0.92,
          label: "Loading portfolio motion and data...",
          work: () =>
            Promise.all(
              homepagePreloadAssets.map((target) => withTimeout(warmFetch(target), 5000))
            ),
        },
      ];

      for (const step of loadingSteps) {
        setLoadingLabel(step.label);
        await step.work();

        if (cancelled) {
          return;
        }

        setLoadingProgress(step.progress);
      }

      setLoadingLabel("Loading portfolio...");
      setLoadingProgress(1);

      if (cancelled) {
        return;
      }

      queueTimeout(() => {
        if (!cancelled) {
          setLoadingReady(true);
        }
      }, reducedMotion ? 40 : 180);
    }

    runHomepagePreload();

    return () => {
      cancelled = true;
    };
  }, [introStage, reducedMotion]);

  useEffect(() => {
    clearQueuedTimeouts();

    if (introStage === INTRO_STAGES.loading) {
      setNavbarExpanded(false);

      if (!loadingReady) {
        return;
      }

      queueTimeout(() => {
        window.dispatchEvent(new CustomEvent("homepage:intro-particle-burst"));
        setIntroStage(INTRO_STAGES.navbarIntro);
      }, reducedMotion ? 120 : 240);
      return;
    }

    if (introStage === INTRO_STAGES.navbarIntro) {
      setNavbarExpanded(reducedMotion || isMobile);

      if (!reducedMotion && !isMobile) {
        queueTimeout(() => {
          setNavbarExpanded(true);
        }, 1260);
      }

      queueTimeout(() => {
        setIntroStage(INTRO_STAGES.heroIntro);
      }, reducedMotion ? 260 : isMobile ? 920 : 2220);
      return;
    }

    if (introStage === INTRO_STAGES.heroIntro) {
      queueTimeout(() => {
        setIntroStage(INTRO_STAGES.ready);
      }, reducedMotion ? 220 : isMobile ? 620 : 1120);
    }
  }, [introStage, isMobile, loadingReady, reducedMotion]);

  useEffect(() => {
    if (introStage !== INTRO_STAGES.ready || enhancementsStartedRef.current) {
      return;
    }

    enhancementsStartedRef.current = true;

    const enhancementTimeoutId = queueTimeout(() => {
      if (typeof window.initHomePageEnhancements === "function") {
        window.initHomePageEnhancements({ startTyping: false });
      }
    }, reducedMotion ? 40 : 260);

    return () => {
      window.clearTimeout(enhancementTimeoutId);
    };
  }, [introStage, reducedMotion]);

  return (
    <>
      <AnimatePresence mode="wait">
        {introStage === INTRO_STAGES.loading ? (
          <HomeLoadingScreen
            key="home-loading"
            progress={loadingProgress}
            statusLabel={loadingLabel}
            reducedMotion={reducedMotion}
          />
        ) : null}
      </AnimatePresence>

      {introStage !== INTRO_STAGES.loading ? (
        <div className="page-shell home-page-shell">
          <HomeNavbar
            introStage={introStage}
            navbarExpanded={navbarExpanded}
            reducedMotion={reducedMotion}
            isMobile={isMobile}
          />

          <main>
            <HomeHero introStage={introStage} reducedMotion={reducedMotion} isMobile={isMobile} />
          </main>

          <HomeFooter introStage={introStage} reducedMotion={reducedMotion} />
        </div>
      ) : null}
    </>
  );
}

const homeIntroRoot = document.querySelector("#home-intro-root");

if (document.body?.dataset.page === "home" && homeIntroRoot) {
  createRoot(homeIntroRoot).render(<HomeIntroPage />);
}
