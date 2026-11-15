# Native runtime game settings and start path

Updated 2026-11-15. The runtime bridge now supports settings/statistics used by
NewTable's game initialization. This does not implement native NVRAM storage.

## Runtime properties

| Property | Web adapter default | Lifetime |
| --- | --- | --- |
| nvBallsPerGame | 3 | Current script session |
| nvTotalGamesPlayed | 0 | Current script session; script increments it |
| nvJackpot | 0 | Current script session |
| nvSpecialScore1..4 / nvSpecialScore(player) | 0 | Reset by BeginGame |

The installed TYPELIB exposes these read/write properties under
IScriptGlobalnvRam (DISPIDs 9, 52, 51 and 25–29 respectively). Those facts establish
the interface, not native registry defaults, integer overflow/coercion behavior
or persistence. The defaults above are explicit web adapter policy.

Settings are shared across API instances within one loaded script. Live handler
reads/writes and case-insensitive API names are supported. BeginGame resets
ordinary/special scores while preserving the settings, jackpot and statistics;
it does not increment games played because the table script does that itself.
Script/table reload resets these runtime settings. Writes require finite,
nonnegative safe numbers, truncated to integers; balls per game must be >=1.
This is the existing runtime numeric policy, not verified native COM coercion.

`nvSpecialScore` and `nvScore` are callable indexed properties. A bare
assignment such as `nvSpecialScore = 0` is rejected with a diagnostic instead of
silently replacing the accessor. `nvBallsPerGame` is exposed to scripts but does
not drive `state.ballNum`; ball counting stays with the table script and the
reconstructed host lifecycle.

## Script execution fixes

- Fixed 1D `Dim` arrays allocate through the inclusive upper bound. Array reads
  in conditions, quoted numeric indexes, nested indexes and call-style index
  writes are translated while quoted array-like text and object member calls are
  preserved. Array references are matched case-insensitively and rewritten to
  the declared spelling; other identifiers remain case-sensitive.
- Handler functions share the table's top-level variables/constants. Previously
  initialized arrays could be invisible to delayed handlers.
- Functions now close over the existing sandbox proxy. Static validation,
  allowlists and API bindings remain unchanged; no host privileges were added.
  Regressions cover unknown-host filtering, allowlisted globals inside deferred
  handlers and per-script assignment isolation. An independent review of this
  change found the mixed-case array, bare-accessor clobber and call-style index
  write defects above; they were fixed with tests before commit.

Empty/Variant semantics, multidimensional arrays, complete index coercion,
`ReDim`/`Preserve` parity and general VBScript case-insensitivity remain
incomplete. The same-realm sandbox remains a best-effort filter; use trusted
tables only.

## Observed NewTable progress

The opt-in `FPT_NATIVE_START_FILE` production test originally stopped at
`nvTotalGamesPlayed is not defined`. After settings and scope fixes it exposed
a condition/indexing failure in the delayed start handler. Both have regressions.
The trusted original now accepts coin/start and reaches its delayed
`PlungerKicker.CreateBall` request without a caught script failure.

That request still reaches the generic kicker placeholder. It proves script
control flow, not physical ball creation, native solenoid behavior, original
rendering or playability. Original tables/assets stay outside Git. Native
scoring/drain/ball-save ownership, element event routing, real kicker/flipper
physics and persistent table state remain next steps.
