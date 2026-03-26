import { useEffect, useRef } from "react";
import Lenis from "@studio-freight/lenis";

export function useLenisSmoothScroll(enabled = true) {
  const lenisRef = useRef(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      lenisRef.current = null;
      return undefined;
    }

    const lenis = new Lenis({
      lerp: 0.16,
      smoothWheel: true,
      wheelMultiplier: 0.96,
      syncTouch: false,
    });
    lenisRef.current = lenis;

    let frameId = 0;
    let loopActive = false;

    function onAnimationFrame(time) {
      if (!loopActive) {
        return;
      }

      lenis.raf(time);
      frameId = window.requestAnimationFrame(onAnimationFrame);
    }

    function startLoop() {
      if (loopActive) {
        return;
      }

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
    window.lenis = lenis;

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopLoop();
      lenis.destroy();
      lenisRef.current = null;

      if (window.lenis === lenis) {
        delete window.lenis;
      }
    };
  }, [enabled]);

  return lenisRef;
}
