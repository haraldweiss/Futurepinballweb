// SPDX-License-Identifier: AGPL-3.0-or-later
import type { GameState } from '../types';
import { nativeKeyActions } from './key-input';

function integer(value: unknown, name: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || !Number.isSafeInteger(Math.trunc(number))) throw new RangeError(`${name} requires a finite non-negative safe number`);
  return Math.trunc(number);
}

export interface NativeRuntimeSettings {
  ballsPerGame: number;
  totalGamesPlayed: number;
  jackpot: number;
  specialScores: [number, number, number, number];
}

/** Explicit web defaults; native registry defaults and persistence are unknown. */
export function createNativeRuntimeSettings(): NativeRuntimeSettings {
  return { ballsPerGame: 3, totalGamesPlayed: 0, jackpot: 0, specialScores: [0, 0, 0, 0] };
}

/** Runtime bridge only. Native nonvolatile storage is not implemented here. */
export function createRuntimeGlobals(state: GameState, updated: () => void, settings: NativeRuntimeSettings) {
  const player = (value: unknown, name = 'nvScore'): number => {
    const index = Number(value);
    if (!Number.isInteger(index) || index < 1 || index > 4) throw new RangeError(`${name} player must be 1..4`);
    return index - 1;
  };
  const getScore = (index: number): number => state.currentPlayer === index + 1
    ? state.score : state.playerScores[index] ?? 0;
  const setScore = (index: number, value: unknown): void => {
    state.playerScores[index] = integer(value, 'nvScore');
    if (state.currentPlayer === index + 1) state.score = state.playerScores[index];
    updated();
  };
  // VBScript uses the same indexed property as both a call and an assignment.
  const nvScore = new Proxy((index: unknown) => getScore(player(index)), {
    get: (target, key, receiver) => typeof key === 'string' && /^-?\d+$/.test(key)
      ? getScore(player(key)) : Reflect.get(target, key, receiver),
    set: (_target, key, value) => {
      if (typeof key !== 'string' || !/^-?\d+$/.test(key)) throw new RangeError('nvScore player must be 1..4');
      setScore(player(key), value); return true;
    },
  });
  const setSpecial = (index: number, value: unknown): void => {
    settings.specialScores[index] = integer(value, 'nvSpecialScore');
  };
  const nvSpecialScore = new Proxy((index: unknown) => settings.specialScores[player(index, 'nvSpecialScore')], {
    get: (target, key, receiver) => typeof key === 'string' && /^-?\d+$/.test(key)
      ? settings.specialScores[player(key, 'nvSpecialScore')] : Reflect.get(target, key, receiver),
    set: (_target, key, value) => {
      if (typeof key !== 'string' || !/^-?\d+$/.test(key)) throw new RangeError('nvSpecialScore player must be 1..4');
      setSpecial(player(key, 'nvSpecialScore'), value); return true;
    },
  });
  return {
    // Callable indexed properties must not be replaceable by bare assignment:
    // `nvSpecialScore = 0` would otherwise silently discard the accessor.
    get nvScore() { return nvScore; },
    set nvScore(_value: typeof nvScore) { throw new RangeError('nvScore requires a player index'); },
    get nvSpecialScore() { return nvSpecialScore; },
    set nvSpecialScore(_value: typeof nvSpecialScore) { throw new RangeError('nvSpecialScore requires a player index'); },
    get nvSpecialScore1() { return settings.specialScores[0]; }, set nvSpecialScore1(v: number) { setSpecial(0, v); },
    get nvSpecialScore2() { return settings.specialScores[1]; }, set nvSpecialScore2(v: number) { setSpecial(1, v); },
    get nvSpecialScore3() { return settings.specialScores[2]; }, set nvSpecialScore3(v: number) { setSpecial(2, v); },
    get nvSpecialScore4() { return settings.specialScores[3]; }, set nvSpecialScore4(v: number) { setSpecial(3, v); },
    get nvBallsPerGame() { return settings.ballsPerGame; },
    set nvBallsPerGame(v: number) {
      const value = integer(v, 'nvBallsPerGame');
      if (value < 1) throw new RangeError('nvBallsPerGame requires at least one ball');
      settings.ballsPerGame = value;
    },
    get nvTotalGamesPlayed() { return settings.totalGamesPlayed; },
    set nvTotalGamesPlayed(v: number) { settings.totalGamesPlayed = integer(v, 'nvTotalGamesPlayed'); },
    get nvJackpot() { return settings.jackpot; },
    set nvJackpot(v: number) { settings.jackpot = integer(v, 'nvJackpot'); },
    get nvScore1() { return getScore(0); }, set nvScore1(v: number) { setScore(0, v); },
    get nvScore2() { return getScore(1); }, set nvScore2(v: number) { setScore(1, v); },
    get nvScore3() { return getScore(2); }, set nvScore3(v: number) { setScore(2, v); },
    get nvScore4() { return getScore(3); }, set nvScore4(v: number) { setScore(3, v); },
    get nvCredits() { return state.credits; },
    set nvCredits(v: number) { state.credits = integer(v, 'nvCredits'); updated(); },
    get CurrentPlayer() { return state.currentPlayer; },
    set CurrentPlayer(v: number) {
      const next = player(v) + 1;
      if (state.currentPlayer >= 1 && state.currentPlayer <= 4) state.playerScores[state.currentPlayer - 1] = state.score;
      const score = state.playerScores[next - 1] ?? 0;
      state.currentPlayer = next; state.score = score; updated();
    },
  };
}

/** Rewrite bare accessor identifiers in transpiler output, preserving text/member names. */
export function bindLiveApiProperties(code: string, api: object): string {
  const names = new Map(Object.entries(Object.getOwnPropertyDescriptors(api))
    .filter(([name, descriptor]) => descriptor.get || descriptor.set || name === 'nvScore' || name === 'nvSpecialScore' || name === 'GetKeyCode' || Object.hasOwn(nativeKeyActions, name))
    .map(([name]) => [name.toLowerCase(), name]));
  // Mask text before locating function scopes and declarations. Only the simple
  // JS emitted by the VBScript transpiler is admitted here, not arbitrary JS.
  const tokens = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$]*|[^\s]/g;
  const masked = code.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, text => ' '.repeat(text.length));
  const splitNames = (text: string): string[] => {
    const parts: string[] = []; let depth = 0, start = 0;
    for (let i = 0; i <= text.length; i++) {
      const char = text[i];
      if ('([{'.includes(char ?? '\0')) depth++;
      else if (')]}'.includes(char ?? '\0')) depth--;
      if (i === text.length || (char === ',' && depth === 0)) { parts.push(text.slice(start, i)); start = i + 1; }
    }
    return parts.flatMap(part => /^\s*([A-Za-z_$][\w$]*)/.exec(part)?.[1].toLowerCase() ?? []);
  };
  const closing = (start: number, open: string, close: string): number => {
    let depth = 0;
    for (let i = start; i < masked.length; i++) {
      if (masked[i] === open) depth++;
      else if (masked[i] === close && --depth === 0) return i;
    }
    return masked.length;
  };
  const global = { start: 0, end: code.length, shadowed: new Set<string>() };
  const scopes = [global];
  const functions = [...masked.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)];
  for (const match of functions) {
    const open = match.index + match[0].length - 1;
    const endParams = closing(open, '(', ')');
    const body = masked.indexOf('{', endParams);
    if (body < 0) continue;
    scopes.push({ start: match.index, end: closing(body, '{', '}'), shadowed: new Set(splitNames(masked.slice(open + 1, endParams))) });
  }
  const owner = (index: number) => scopes.filter(scope => scope === global || (scope.start < index && index < scope.end))
    .reduce((inner, scope) => scope.end - scope.start < inner.end - inner.start ? scope : inner, global);
  for (const match of functions) owner(match.index).shadowed.add(match[1].toLowerCase());
  for (const match of masked.matchAll(/\b(?:var|let|const)\s+([^;\n]+)/g)) {
    for (const name of splitNames(match[1])) owner(match.index).shadowed.add(name);
  }
  let result = '', end = 0, previous = '';
  for (const match of code.matchAll(tokens)) {
    const token = match[0];
    const name = names.get(token.toLowerCase());
    const shadowed = scopes.some(scope => scope.start <= match.index && match.index <= scope.end && scope.shadowed.has(token.toLowerCase()));
    result += code.slice(end, match.index) + (name && previous !== '.' && !shadowed ? `__api__.${name}` : token);
    end = match.index + token.length;
    if (!token.startsWith('//') && !token.startsWith('/*')) previous = token;
  }
  return result + code.slice(end);
}
