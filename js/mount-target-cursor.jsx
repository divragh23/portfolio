import React from "react";
import { createRoot } from "react-dom/client";
import TargetCursor from "./components/TargetCursor";

const ROOT_ID = "target-cursor-root";
const INSTANCE_KEY = "__portfolioTargetCursorRoot__";

const TARGET_SELECTOR = [
  "a",
  "button",
  ".button",
  '[role="button"]',
].join(", ");

function prefersReducedMotion() {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

function isTouchPrimary() {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(pointer: coarse), (hover: none)").matches;
}

export function mountTargetCursor() {
  if (typeof window === "undefined") return;
  if (window[INSTANCE_KEY]) return;

  if (prefersReducedMotion() || isTouchPrimary()) {
    return;
  }

  let node = document.getElementById(ROOT_ID);
  if (!node) {
    node = document.createElement("div");
    node.id = ROOT_ID;
    document.body.appendChild(node);
  }

  const root = createRoot(node);
  root.render(
    <TargetCursor
      targetSelector={TARGET_SELECTOR}
      spinDuration={4}
      hoverDuration={0.22}
      parallaxOn
      hideDefaultCursor
    />,
  );
  window[INSTANCE_KEY] = root;
}
