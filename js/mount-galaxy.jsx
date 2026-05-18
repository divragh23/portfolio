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

export function mountGalaxyBackground() {
  if (typeof window === "undefined") return;
  if (window[GALAXY_INSTANCE_KEY]) return;

  const node = document.getElementById(GALAXY_ROOT_ID);
  if (!node) return;

  const root = createRoot(node);
  root.render(<Galaxy {...GALAXY_PROPS} />);
  window[GALAXY_INSTANCE_KEY] = root;
}
