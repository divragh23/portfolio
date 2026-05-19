import React from "react";
import { createRoot } from "react-dom/client";
import Galaxy from "./components/Galaxy";

const GALAXY_ROOT_ID = "galaxy-bg-root";
const GALAXY_INSTANCE_KEY = "__portfolioGalaxyRoot__";

const GALAXY_PROPS = {
  hueShift: 250,
  density: 0.7,
  glowIntensity: 0.34,
  saturation: 0.45,
  speed: 0.3,
  starSpeed: 0.4,
  twinkleIntensity: 0.35,
  rotationSpeed: 0.04,
  mouseInteraction: false,
  mouseRepulsion: false,
  transparent: true,
};

function shouldSkipGalaxy() {
  if (typeof window === "undefined") return true;

  if (typeof window.matchMedia === "function") {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return true;
    }
  }

  const connection =
    typeof navigator !== "undefined" &&
    (navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection);

  if (connection?.saveData) return true;
  if (
    connection?.effectiveType &&
    /^(slow-2g|2g|3g)$/.test(connection.effectiveType)
  ) {
    return true;
  }

  if (
    typeof navigator !== "undefined" &&
    navigator.deviceMemory &&
    navigator.deviceMemory < 4
  ) {
    return true;
  }

  return false;
}

function getRuntimeProps() {
  const isCoarsePointer =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  const isNarrow =
    typeof window !== "undefined" && window.innerWidth < 768;
  const mobileLike = isCoarsePointer || isNarrow;

  return {
    ...GALAXY_PROPS,
    // Cap canvas resolution. 1.0 device-px is already plenty for a star field;
    // also drop a notch lower on phones to cut fragment cost ~30%.
    maxDpr: 1,
    renderScale: mobileLike ? 0.8 : 1,
  };
}

export function mountGalaxyBackground() {
  if (typeof window === "undefined") return;
  if (window[GALAXY_INSTANCE_KEY]) return;

  const node = document.getElementById(GALAXY_ROOT_ID);
  if (!node) return;

  if (shouldSkipGalaxy()) {
    node.dataset.galaxyDisabled = "true";
    return;
  }

  const root = createRoot(node);
  root.render(<Galaxy {...getRuntimeProps()} />);
  window[GALAXY_INSTANCE_KEY] = root;
}
