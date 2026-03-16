/**
 * Highscore Management with Data Validation
 * Phase: Security Remediation Phase 1 - Input Validation
 * Risk: Malformed localStorage data could cause crashes or unexpected behavior
 */

const HS_KEY = 'fpw_highscores_v1';
const MAX_HIGHSCORES = 5;
const MAX_SCORE = 999999999;
const STORAGE_QUOTA_BYTES = 5 * 1024 * 1024; // 5MB limit

/**
 * Get top scores with validation
 * ✅ Validates JSON structure
 * ✅ Validates each entry type
 * ✅ Filters out invalid scores
 * ✅ Gracefully handles corrupted data
 */
export function getTopScores(): number[] {
  try {
    const raw = localStorage.getItem(HS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    // ✅ Validate: must be array
    if (!Array.isArray(parsed)) {
      console.warn('[Highscores] Invalid data structure: not an array');
      return [];
    }

    // ✅ Validate: each entry must be valid number
    const scores = parsed
      .filter((s): s is number => 
        typeof s === 'number' && 
        Number.isFinite(s) && 
        s >= 0 && 
        s <= MAX_SCORE
      )
      .slice(0, MAX_HIGHSCORES);

    return scores;
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.error('[Highscores] JSON parse error - data corrupted, clearing:', e);
      try { localStorage.removeItem(HS_KEY); } catch { }
    }
    return [];
  }
}

/**
 * Record a new score with validation
 * ✅ Input validation
 * ✅ Storage quota check
 * ✅ Graceful error handling
 * 
 * @param score Raw score value
 * @returns 1-based rank (1 = first place), or 0 if failed
 */
export function recordScore(score: number): number {
  // ✅ Input validation
  if (!Number.isFinite(score) || score <= 0 || score > MAX_SCORE) {
    console.warn('[Highscores] Invalid score:', score);
    return 0;
  }

  try {
    const list = getTopScores();
    list.push(score);
    list.sort((a, b) => b - a);
    list.splice(MAX_HIGHSCORES);  // Keep only top 5

    const json = JSON.stringify(list);

    // ✅ Storage quota check before write
    if (json.length > STORAGE_QUOTA_BYTES) {
      console.warn('[Highscores] Storage quota would be exceeded:', {
        current: json.length,
        limit: STORAGE_QUOTA_BYTES
      });
      return 0;
    }

    localStorage.setItem(HS_KEY, json);
    const rank = list.indexOf(score) + 1;
    console.debug('[Highscores] Score recorded:', { score, rank });
    return rank;
  } catch (e) {
    if (e instanceof DOMException && e.code === 22) {
      // QuotaExceededError
      console.error('[Highscores] Storage quota exceeded');
    } else {
      console.error('[Highscores] Error recording score:', e);
    }
    return 0;
  }
}
