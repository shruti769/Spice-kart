/** A new random seed for `shuffled` (call from an event handler or state initialiser, not during render). */
export const newSeed = () => Math.floor(Math.random() * 2 ** 31) + 1;

/** Shuffled copy of `items`, the same for the same seed (keeps render pure); seed 0 keeps the original order. */
export function shuffled<T>(items: T[], seed: number): T[] {
  const out = [...items];
  if (!seed) return out;
  let s = seed;
  const rand = () => {
    // mulberry32
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
