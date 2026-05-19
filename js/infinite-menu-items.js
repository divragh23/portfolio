// Build the InfiniteMenu items list, rendering each label as a
// canvas-based PNG so the React Bits sphere shows the words
// "Home / About / Hobbies / Contact" instead of bitmap images.

const PALETTES = [
  { from: "#f8c2e5", to: "#c7d9ff", text: "#1c1530" },
  { from: "#c7d9ff", to: "#f8eaff", text: "#1c1530" },
  { from: "#ffe3f1", to: "#dab7ff", text: "#1c1530" },
  { from: "#dab7ff", to: "#b4ceff", text: "#1c1530" },
];

const FONT_STACK = '"Space Grotesk", "Inter", system-ui, sans-serif';

function renderLabelTexture(label, palette) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Background — soft circular gradient so the discs read as glassy badges.
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, palette.from);
  grad.addColorStop(1, palette.to);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle inner ring + glow.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 28, 0, Math.PI * 2);
  ctx.stroke();

  // Soft inner shadow ring.
  ctx.strokeStyle = "rgba(28, 21, 48, 0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 18, 0, Math.PI * 2);
  ctx.stroke();

  // Label.
  ctx.fillStyle = palette.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Two lines: a small eyebrow + the section label.
  ctx.font = `600 32px ${FONT_STACK}`;
  ctx.globalAlpha = 0.62;
  ctx.fillText("DIV23", size / 2, size / 2 - 80);

  ctx.globalAlpha = 1;
  ctx.font = `800 ${label.length > 6 ? 110 : 132}px ${FONT_STACK}`;
  ctx.fillText(label.toUpperCase(), size / 2, size / 2 + 16);

  ctx.globalAlpha = 0.5;
  ctx.font = `500 26px ${FONT_STACK}`;
  ctx.fillText("DRAG · CLICK ↗", size / 2, size / 2 + 110);

  return canvas.toDataURL("image/png");
}

export function buildInfiniteMenuItems() {
  const sections = [
    {
      label: "Home",
      link: "#home",
      description: "Back to the top — quick reset between sections.",
    },
    {
      label: "About",
      link: "#about",
      description: "Who I am and what I'm studying at UConn.",
    },
    {
      label: "Hobbies",
      link: "#hobbies",
      description: "Sports highlights and the side of me that's loud.",
    },
    {
      label: "Contact",
      link: "#contact",
      description: "Open to opportunities and collaboration.",
    },
  ];

  return sections.map((section, index) => ({
    label: section.label,
    title: section.label,
    description: section.description,
    link: section.link,
    image: renderLabelTexture(section.label, PALETTES[index % PALETTES.length]),
  }));
}
