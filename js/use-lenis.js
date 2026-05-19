import { useEffect, useRef } from "react";
import Lenis from "@studio-freight/lenis";

// Centralized Lenis config used everywhere on the site so we never have two
// instances with different smoothing characteristics competing for the
// window.scroll position.
//
// - lerp 0.12 is Lenis's documented sweet-spot: still smooth, but the
//   deceleration tail finishes in ~300ms so the page feels responsive,
//   not floaty.
// - syncTouch: false leaves native momentum scrolling on touch devices
//   alone, which is already buttery on iOS / Android — only the
//   programmatic scrollTo (anchor clicks) gets eased.
// - touchMultiplier slightly damps over-zealous flicks on mobile.
const LENIS_CONFIG = {
  lerp: 0.12,
  smoothWheel: true,
  wheelMultiplier: 1,
  syncTouch: false,
  touchMultiplier: 1.4,
  touchInertiaMultiplier: 22,
  autoResize: true,
};

export function useLenisSmoothScroll(enabled = true) {
  const lenisRef = useRef(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      lenisRef.current = null;
      return undefined;
    }

    // If another Lenis has somehow registered (defensive), don't fight it.
    if (window.lenis) {
      lenisRef.current = window.lenis;
      return undefined;
    }

    const lenis = new Lenis(LENIS_CONFIG);
    lenisRef.current = lenis;
    window.lenis = lenis;
    document.documentElement.classList.add("has-lenis");

    let frameId = 0;
    let loopActive = false;

    // Single rAF loop owned by Lenis. Avoid attaching to gsap.ticker /
    // separate libraries so we don't double-tick the scroll engine.
    function onAnimationFrame(time) {
      if (!loopActive) {
        return;
      }
      lenis.raf(time);
      frameId = window.requestAnimationFrame(onAnimationFrame);
    }

    function startLoop() {
      if (loopActive) return;
      loopActive = true;
      frameId = window.requestAnimationFrame(onAnimationFrame);
    }

    function stopLoop() {
      loopActive = false;
      if (frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stopLoop();
      } else {
        startLoop();
      }
    }

    startLoop();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Broadcast Lenis availability so vanilla modules (script.js) can hook
    // into its scroll events deterministically instead of polling for
    // `window.lenis`.
    window.dispatchEvent(new CustomEvent("portfolio:lenis-ready", { detail: lenis }));

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopLoop();
      lenis.destroy();
      lenisRef.current = null;
      document.documentElement.classList.remove("has-lenis");

      if (window.lenis === lenis) {
        delete window.lenis;
      }

      window.dispatchEvent(new CustomEvent("portfolio:lenis-destroyed"));
    };
  }, [enabled]);

  return lenisRef;
}
