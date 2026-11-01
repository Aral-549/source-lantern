import { create } from 'zustand';

interface Preferences {
  left: number; right: number; checks: Record<string, boolean>;
  hydrate: () => void;
  setSizes: (left: number, right: number) => void;
  setCheck: (key: string, value: boolean) => void;
}
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
function save(value: Pick<Preferences, 'left' | 'right' | 'checks'>) {
  try { localStorage.setItem('dds.preferences.v1', JSON.stringify(value)); } catch { /* Storage is optional. */ }
}
export const usePreferences = create<Preferences>((set, get) => ({
  left: 244, right: 390, checks: {},
  hydrate: () => {
    try {
      const value = JSON.parse(localStorage.getItem('dds.preferences.v1') || 'null');
      if (!value || typeof value !== 'object') return;
      const checks = Object.fromEntries(Object.entries(value.checks || {}).filter(([key, checked]) => typeof key === 'string' && typeof checked === 'boolean')) as Record<string, boolean>;
      set({ left: Number.isFinite(value.left) ? clamp(value.left, 200, 320) : 244, right: Number.isFinite(value.right) ? clamp(value.right, 320, 520) : 390, checks });
    } catch { /* Corrupt or unavailable storage uses defaults. */ }
  },
  setSizes: (left, right) => { set({ left: clamp(left, 200, 320), right: clamp(right, 320, 520) }); save(get()); },
  setCheck: (key, value) => { set(state => ({ checks: { ...state.checks, [key]: value } })); save(get()); },
}));
