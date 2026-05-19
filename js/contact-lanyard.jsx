import React from "react";
import { createRoot } from "react-dom/client";
import Lanyard from "./components/Lanyard";

const ROOT_ID = "lanyard-root";

function shouldMount(node) {
  if (typeof window === "undefined") return false;
  if (!node) return false;
  if (typeof window.matchMedia === "function") {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return false;
    }
  }
  return true;
}

const node = document.getElementById(ROOT_ID);
if (shouldMount(node)) {
  createRoot(node).render(<Lanyard position={[0, 0, 18]} gravity={[0, -40, 0]} fov={20} transparent />);
}
