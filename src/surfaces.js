// Procedural drink-surface textures (crema, latte art, foam), drawn on a 2D canvas.
// The canvas circle maps onto a CircleGeometry: top of the canvas = far side of the cup.

import * as THREE from "three";

const SIZE = 512;
const C = SIZE / 2;
const R = SIZE / 2;

const FOAM = "#f1e4cf";
const cache = new Map();

/** Material settings that go with each surface style. */
const SURFACE_LOOK = {
  crema: { roughness: 0.35, clearcoat: 0.3 },
  "crema-dark": { roughness: 0.3, clearcoat: 0.4 },
  macchiato: { roughness: 0.45, clearcoat: 0.2 },
  black: { roughness: 0.12, clearcoat: 1 },
  "black-glossy": { roughness: 0.04, clearcoat: 1 },
  heart: { roughness: 0.55, clearcoat: 0.15 },
  rosetta: { roughness: 0.55, clearcoat: 0.15 },
  tulip: { roughness: 0.55, clearcoat: 0.15 },
  cappuccino: { roughness: 0.8, clearcoat: 0 },
  mocha: { roughness: 0.3, clearcoat: 0.6 },
  cardamom: { roughness: 0.6, clearcoat: 0.1 },
};

export function getSurface(style) {
  if (!cache.has(style)) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    (DRAW[style] ?? DRAW.black)(ctx);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace; // canvas pixels are sRGB color data
    cache.set(style, { texture, ...(SURFACE_LOOK[style] ?? SURFACE_LOOK.black) });
  }
  return cache.get(style);
}

// ---------- drawing helpers ----------

function radialBase(ctx, stops) {
  const g = ctx.createRadialGradient(C, C, 0, C, C, R);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

function speckle(ctx, color, count, minR, maxR, alpha, spread = 0.95) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * R * spread;
    ctx.globalAlpha = alpha * (0.4 + Math.random() * 0.6);
    ctx.beginPath();
    ctx.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, minR + Math.random() * (maxR - minR), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Darkens the edge where the drink meets the cup wall. */
function meniscus(ctx, color = "rgba(18, 8, 3, 0.85)", from = 0.84) {
  const g = ctx.createRadialGradient(C, C, R * from, C, C, R);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

function foam(ctx, drawPath, color = FOAM) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = "rgba(241, 228, 207, 0.6)";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  drawPath();
  ctx.fill();
  ctx.restore();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function heartPath(ctx, cx, cy, s) {
  ctx.moveTo(cx, cy + 0.55 * s);
  ctx.bezierCurveTo(cx - 1.05 * s, cy - 0.05 * s, cx - 0.65 * s, cy - 0.85 * s, cx, cy - 0.38 * s);
  ctx.bezierCurveTo(cx + 0.65 * s, cy - 0.85 * s, cx + 1.05 * s, cy - 0.05 * s, cx, cy + 0.55 * s);
}

/** The thin line the pitcher leaves when it is pulled through the art. */
function pullThrough(ctx, color, fromY, toY, width = 4) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(C, fromY);
  ctx.lineTo(C, toY);
  ctx.stroke();
  ctx.restore();
}

const milkCoffee = (ctx) =>
  radialBase(ctx, [
    [0, "#8a5530"],
    [0.6, "#6e3f1f"],
    [0.9, "#4a250f"],
    [1, "#2c1407"],
  ]);

function cremaBase(ctx, dark = false) {
  radialBase(
    ctx,
    dark
      ? [[0, "#9a6234"], [0.55, "#6e3b17"], [0.85, "#3f1d0a"], [1, "#1e0d04"]]
      : [[0, "#d39a5e"], [0.5, "#b0703a"], [0.82, "#7a4119"], [1, "#2e1507"]],
  );
  speckle(ctx, "#4b220c", 420, 1.5, 6, 0.25); // tiger striping
  speckle(ctx, "#f0bd7d", 260, 1, 4, 0.18, 0.8);
}

// ---------- surface styles ----------

const DRAW = {
  crema(ctx) {
    cremaBase(ctx);
    meniscus(ctx);
  },

  "crema-dark"(ctx) {
    cremaBase(ctx, true);
    meniscus(ctx);
  },

  macchiato(ctx) {
    cremaBase(ctx);
    foam(ctx, () => ellipse(ctx, C, C + 10, R * 0.3, R * 0.27));
    speckle(ctx, "#c99a6a", 60, 1, 3, 0.25, 0.25);
    meniscus(ctx);
  },

  black(ctx) {
    radialBase(ctx, [[0, "#140904"], [0.82, "#1d0e06"], [0.92, "#5a3216"], [1, "#2a1407"]]);
    speckle(ctx, "#6e4020", 160, 1, 3, 0.25); // thin crema remains
    meniscus(ctx, "rgba(10, 4, 1, 0.6)", 0.93);
  },

  "black-glossy"(ctx) {
    radialBase(ctx, [[0, "#0c0502"], [0.9, "#120703"], [1, "#2a1407"]]);
  },

  heart(ctx) {
    milkCoffee(ctx);
    foam(ctx, () => heartPath(ctx, C, C + 10, R * 0.62));
    pullThrough(ctx, "#6e3f1f", C - R * 0.1, C + R * 0.42, 3);
    speckle(ctx, "#ffffff", 200, 0.5, 1.5, 0.12, 0.6);
    meniscus(ctx);
  },

  rosetta(ctx) {
    milkCoffee(ctx);
    const leaves = 8;
    for (let i = 0; i < leaves; i++) {
      const t = i / (leaves - 1);
      const y = C + R * 0.5 - t * R * 0.82;
      const w = R * (0.6 - 0.42 * t);
      const h = w * 0.42;
      foam(ctx, () => ellipse(ctx, C, y, w, h));
      // cut the leaf into a crescent with the base color
      ctx.fillStyle = "#74431f";
      ctx.beginPath();
      ellipse(ctx, C, y - h * 0.45, w * 0.86, h * 0.75);
      ctx.fill();
    }
    foam(ctx, () => heartPath(ctx, C, C - R * 0.4, R * 0.14));
    pullThrough(ctx, "#74431f", C - R * 0.46, C + R * 0.68, 3);
    meniscus(ctx);
  },

  tulip(ctx) {
    milkCoffee(ctx);
    const layers = [
      { y: C + R * 0.28, w: R * 0.52 },
      { y: C - R * 0.02, w: R * 0.42 },
    ];
    for (const { y, w } of layers) {
      const h = w * 0.58;
      foam(ctx, () => ellipse(ctx, C, y, w, h));
      ctx.fillStyle = "#74431f";
      ctx.beginPath();
      ellipse(ctx, C, y - h * 0.55, w * 0.8, h * 0.7);
      ctx.fill();
    }
    foam(ctx, () => heartPath(ctx, C, C - R * 0.35, R * 0.34));
    pullThrough(ctx, "#74431f", C - R * 0.2, C + R * 0.62, 3);
    meniscus(ctx);
  },

  cappuccino(ctx) {
    radialBase(ctx, [[0, "#f3e7d4"], [0.7, "#ead8bd"], [0.86, "#b8875a"], [1, "#4a250f"]]);
    speckle(ctx, "#ffffff", 400, 0.5, 2, 0.2, 0.8); // micro bubbles
    speckle(ctx, "#3a1a09", 2200, 0.6, 1.6, 0.55, 0.5); // cocoa dust
    speckle(ctx, "#3a1a09", 400, 0.6, 1.4, 0.3, 0.7);
    meniscus(ctx, "rgba(40, 18, 6, 0.8)", 0.9);
  },

  mocha(ctx) {
    radialBase(ctx, [[0, "#5a2d14"], [0.7, "#401d0b"], [1, "#1e0c04"]]);
    ctx.save();
    ctx.strokeStyle = FOAM;
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(241, 228, 207, 0.5)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 7; a += 0.05) {
      const d = R * 0.04 + a * R * 0.031;
      const x = C + Math.cos(a) * d;
      const y = C + Math.sin(a) * d;
      a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();
    // drag a few lines through the spiral (a "web")
    ctx.strokeStyle = "#4a220e";
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(C, C);
      ctx.lineTo(C + Math.cos(a) * R * 0.75, C + Math.sin(a) * R * 0.75);
      ctx.stroke();
    }
    meniscus(ctx);
  },

  cardamom(ctx) {
    radialBase(ctx, [[0, "#b88a5f"], [0.6, "#9c6c42"], [0.88, "#6b4022"], [1, "#2a1407"]]);
    speckle(ctx, "#d9b58c", 500, 2, 7, 0.3, 0.85); // thick foam
    speckle(ctx, "#5a3318", 300, 1, 3, 0.35, 0.9); // fine grounds
    // a few larger bubbles
    ctx.strokeStyle = "rgba(255, 240, 220, 0.35)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * R * 0.85;
      ctx.beginPath();
      ctx.arc(C + Math.cos(a) * d, C + Math.sin(a) * d, 2 + Math.random() * 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    meniscus(ctx);
  },
};
