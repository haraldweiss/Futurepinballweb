# Native coin/start ownership

Updated 2026-11-15. This is a routing boundary for coin/start decisions, not a
claim of complete native game rules or playability.

## Ownership

A script declaring `FuturePinball_KeyPressed` owns coin/start decisions. Detection
is case-insensitive and uses the transpiler's line-continuation normalization.
Ownership is selected before evaluation, so a script error does not silently
enable demo credit/start logic. Legacy key aliases and scripts without that
canonical handler retain demo coin/start controls. This policy deliberately
avoids guessing which branches of a table handler implement a game.

- Native key handlers receive input first. The host arcade keyboard path and
  demo addCoin/startGame APIs cannot change their credits or reset their scores.
- Native `BeginGame`/`EndGame` control the runtime game-in-play flag. The generic
  plunger fallback requires BeginGame and cannot auto-start using demo credits.
- Delayed host coin screens cannot reopen over native-owned rules.
- Table/script reset clears ownership. The common table-reset path also clears
  remaining demo credits and the coin system's started/player state.
- Event lookup is case-insensitive. A throwing handler logs its error and consumes
  the event; legacy aliases do not run after partial native mutations.

## Demo rules

The coin-system module is now the single demo credit/start writer. Both `5` and
the configured coin key add one credit per accepted press, up to four unused
credits. Start spends one credit per player, caps requested players to available
credits and initializes scores/player state once. Unspent credits remain usable.
Repeated keys and unrelated modifier shortcuts do not add credits or start games.

The configurable start key still permits Enter to start and charge the plunger
on the same press. A rejected start clears charging. Demo ball-save, scoring,
three-ball progression and game-over handling are otherwise unchanged.

## Script syntax and verification

Bare zero-argument VBScript statements such as `BeginGame`, `EndGame`, a Sub
name or an object method now invoke the procedure. Previously they could compile
as JavaScript references and do nothing. This fix does not cover arbitrary
VBScript/COM semantics.

Eleven ownership regressions cover native credit/start preservation, errors,
case/continued declarations, consumed failing events, demo transactions,
multiplayer, modifiers and common import reset. Public synthetic browser fixtures
show credit, score and game-in-play values on imported reels, verify no demo
credit changes, and restore demo controls after switching tables.

## Remaining work

Native scoring, drain/ball-save/player progression and element event routing
still share reconstructed demo behavior. Script-driven solenoid physics, native
DMD fonts/presentation, binding configuration and table-scoped persistence remain
open. The generic DMD/physics fallback does not establish native display or game
fidelity. AI1 still reaches unsupported BAM coordinate lookup. The script sandbox
is unchanged; use trusted tables only. Private fixtures remain outside Git.

Verification: isolated staged tree **1,139 passed / 3 skipped**, typecheck/build
clean and security lint **0 errors / 711 warnings**. Its production browser run
passed both the full demo three-ball/game-over check and native credit/start
fixture. Working tree **1,146 passed / 3 skipped**; six production checks also
passed, including private base-table startup and AI1's explicit unsupported
boundary. Inherited changes/tests are excluded from the commit.

The runtime bridge now includes `nvTotalGamesPlayed`, `nvBallsPerGame` and
`nvJackpot`; see [NATIVE-GAME-SETTINGS.md](NATIVE-GAME-SETTINGS.md). The private
NewTable start check reaches the delayed kicker request. Physical creation and
persistent state remain incomplete.
