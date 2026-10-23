const PROGRAMS_KEY = "grille:programs";
const CATEGORIES_KEY = "grille:categories";

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (err) {
    console.warn("[storage] JSON parse error", err);
    return fallback;
  }
}

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (err) {
    console.warn("[storage] JSON stringify error", err);
    return null;
  }
}

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadPrograms(defaultValue = []) {
  const storage = getStorage();
  if (!storage) return defaultValue;
  const raw = storage.getItem(PROGRAMS_KEY);
  return safeParse(raw, defaultValue);
}

export function savePrograms(programs) {
  const storage = getStorage();
  if (!storage) return;
  const payload = safeStringify(programs);
  if (payload === null) return;
  storage.setItem(PROGRAMS_KEY, payload);
}

export function loadCategories(defaultValue = {}) {
  const storage = getStorage();
  if (!storage) return defaultValue;
  const raw = storage.getItem(CATEGORIES_KEY);
  return safeParse(raw, defaultValue);
}

export function saveCategories(categories) {
  const storage = getStorage();
  if (!storage) return;
  const payload = safeStringify(categories);
  if (payload === null) return;
  storage.setItem(CATEGORIES_KEY, payload);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("grille:categories-updated"));
  }
}
