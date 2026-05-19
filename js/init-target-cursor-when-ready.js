import { mountTargetCursor } from "./mount-target-cursor";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function isTouchPrimary() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(pointer: coarse), (hover: none)").matches;
}

function isHomeLoading() {
  return document.body?.dataset.page === "home" &&
    document.body?.dataset.homeIntroState === "loading";
}

function activateCursor() {
  mountTargetCursor();
}

export function initTargetCursorWhenReady() {
  if (typeof window === "undefined") return;
  if (prefersReducedMotion() || isTouchPrimary()) return;

  if (!isHomeLoading()) {
    activateCursor();
    return;
  }

  function tryActivate() {
    if (!isHomeLoading()) {
      activateCursor();
      return true;
    }

    return false;
  }

  if (tryActivate()) {
    return;
  }

  const observer = new MutationObserver(() => {
    if (tryActivate()) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-home-intro-state"],
  });
}
