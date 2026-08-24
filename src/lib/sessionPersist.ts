// Thin sessionStorage-backed helpers for the in-memory prototype stores under
// src/components/configure/. sessionStorage survives a page reload and client-side
// navigation but clears when the tab/browser closes, matching "persist for the lifetime
// of the session" without pretending this prototype has a real backend.

export function loadMap<K extends string, V>(key: string): Map<K, V> {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return new Map();
    return new Map(JSON.parse(raw) as [K, V][]);
  } catch {
    return new Map();
  }
}

export function saveMap<K extends string, V>(key: string, map: Map<K, V>) {
  try {
    sessionStorage.setItem(key, JSON.stringify([...map.entries()]));
  } catch {
    /* ignore (e.g. private-browsing quota) */
  }
}

export function loadSet<T extends string>(key: string): Set<T> {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw) as T[]) : new Set();
  } catch {
    return new Set();
  }
}

export function saveSet<T extends string>(key: string, set: Set<T>) {
  try {
    sessionStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}
