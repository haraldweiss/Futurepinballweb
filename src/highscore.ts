const HS_KEY = 'fpw_highscores_v1';

export function getTopScores(): number[] {
  try { return JSON.parse(localStorage.getItem(HS_KEY) ?? '[]') || []; }
  catch { return []; }
}

/** Speichert Score, gibt 1-basierten Rang zurück (1 = Platz 1). */
export function recordScore(score: number): number {
  if (score <= 0) return 0;
  const list = getTopScores();
  list.push(score);
  list.sort((a, b) => b - a);
  list.splice(5);
  try { localStorage.setItem(HS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  return list.indexOf(score) + 1;
}
