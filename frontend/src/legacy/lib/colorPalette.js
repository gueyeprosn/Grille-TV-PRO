const DEFAULT_CATEGORY_COLORS = [
  [56, 189, 248], // sky
  [96, 165, 250], // blue
  [34, 197, 94],  // green
  [251, 191, 36], // amber
  [245, 158, 11], // orange
  [244, 114, 182], // pink
  [129, 140, 248], // indigo
  [236, 72, 153], // fuchsia
  [14, 165, 233], // cyan
  [96, 211, 148], // mint
];

const TYPE_COLOR_MAP = {
  Direct: [239, 68, 68],
  PAD: [59, 130, 246],
  Rediffusion: [34, 197, 94],
  Replay: [14, 165, 233],
  Spécial: [251, 191, 36],
  Autre: [148, 163, 184],
};

const CATEGORY_COLOR_MAP = {
  aqida: [8, 145, 178],
  debat: [251, 146, 60],
  divertissement: [245, 158, 11],
  enseignement: [56, 189, 248],
  education: [14, 165, 233],
  'education islamique': [13, 148, 136],
  famille: [244, 114, 182],
  communaute: [232, 121, 249],
  continuite: [45, 212, 191],
  habillage: [250, 204, 21],
  'histoire mouride': [129, 140, 248],
  information: [37, 99, 235],
  jeunesse: [34, 211, 238],
  magazine: [236, 72, 153],
  musique: [232, 121, 249],
  publicite: [250, 204, 21],
  religieux: [124, 45, 18],
  societe: [244, 63, 94],
  sport: [22, 163, 74],
  xassida: [244, 114, 182],
  coran: [5, 150, 105],
  culture: [139, 92, 246],
  hadith: [2, 132, 199],
  fiqh: [124, 58, 237],
  tafsir: [220, 38, 38],
  sira: [234, 88, 12],
  dhikr: [22, 163, 74],
  "du'a": [202, 138, 4],
  fatwa: [190, 18, 60],
};

function hashString(input = "") {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function parseCssColor(token) {
  if (!token) return null;
  if (Array.isArray(token) && token.length === 3) return token;
  if (typeof token !== "string") return null;

  const hexMatch = token.match(/#([0-9a-f]{6}|[0-9a-f]{3})/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return hex
        .split("")
        .map((c) => parseInt(c + c, 16));
    }
    const pairs = hex.match(/.{1,2}/g) || [];
    if (pairs.length === 3) {
      return pairs.map((pair) => parseInt(pair, 16));
    }
  }

  const rgbaMatch = token.match(/rgba?\(([^)]+)\)/i);
  if (rgbaMatch) {
    const parts = rgbaMatch[1]
      .split(",")
      .map((p) => parseFloat(p.trim()))
      .filter((n) => Number.isFinite(n));
    if (parts.length >= 3) {
      return parts.slice(0, 3).map((n) => Math.max(0, Math.min(255, Math.round(n))));
    }
  }

  return null;
}

export function rgbArrayToCss(rgb, alpha = 1) {
  const [r, g, b] = rgb || [148, 163, 184];
  if (alpha === 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function deriveTypeColor(type = "Autre") {
  return TYPE_COLOR_MAP[type] || TYPE_COLOR_MAP.Autre;
}

export function deriveCategoryColor(category, styleToken) {
  const normalizedCategory = String(category || "")
    .trim()
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (CATEGORY_COLOR_MAP[normalizedCategory]) return CATEGORY_COLOR_MAP[normalizedCategory];
  const parsed = parseCssColor(styleToken);
  if (parsed) return parsed;
  const index = hashString(category) % DEFAULT_CATEGORY_COLORS.length;
  return DEFAULT_CATEGORY_COLORS[index];
}

export function buildCategoryTheme(category, styleToken) {
  const color = deriveCategoryColor(category, styleToken);
  const border = rgbArrayToCss(color, 0.35);
  const accent = rgbArrayToCss(color);
  const softBg = `linear-gradient(150deg, ${rgbArrayToCss(color, 0.08)} 0%, rgba(255,255,255,0.95) 100%)`;

  return {
    color,
    vars: {
      "--program-border": border,
      "--program-background": softBg,
      "--program-shadow": `0 8px 16px -12px ${rgbArrayToCss(color, 0.35)}`,
      "--program-shadow-hover": `0 16px 28px -16px ${rgbArrayToCss(color, 0.45)}`,
      "--program-accent": accent,
    },
    chipStyle: {
      background: rgbArrayToCss(color, 0.2),
      borderColor: rgbArrayToCss(color, 0.4),
      color: rgbArrayToCss(color, 0.95),
    },
  };
}
