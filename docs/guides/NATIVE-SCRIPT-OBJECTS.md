# Native script object lookup

The importer inventories named table elements from original bytes before choosing
the cache, worker or main-thread parser. Each script run gets its own registry.
Current coverage is limited to elements accepted by the existing table-element
decoder (including its coordinate requirement); it is not a complete native
object inventory.

`xBAM.FindObject("name")` matches full imported names case-insensitively.
`Exist` is true only for one matching declaration. Missing and case-colliding
names return `Exist = false` and log a diagnostic. Repeated lookups retain
extension fields such as `ExtInt1`, `ExtInt2`, `ExtFloat1` and `Mass` within a
script session. Direct bindings and lookup wrappers share implemented adapter
state, including reel values/digits and flipper strength. The registry uses
decoded element kinds when available instead of relying solely on name patterns.

`xBAM.CreateAllExt()` prepares extension wrappers for the imported declarations.
An inferred script binding such as `LeftFlipper1Ext` resolves to the corresponding
element's wrapper. An actual imported element ending in `Ext` takes precedence
over that alias. Script-inferred names with no decoded declaration still use the
older placeholder adapters; their existence does not establish native support.

`SetMaterial(elasticity, softness, staticFriction, kineticFriction)` retains four
finite numeric coefficients on an existing wrapper and warns that they are not
applied to native physics. `PhysicsMaterial` exposes that retained request for
inspection. This does not change collision behavior or reproduce FizX. The
coordinate overload of `FindObject` throws an explicit unsupported diagnostic
until its native matching rules are recovered. Other BAM fallback methods and
native property/method/event parity remain incomplete.

Only load trusted tables: the existing script evaluator is a best-effort
same-realm sandbox, not a hard isolation boundary.

## Verification

Synthetic registry and script/import regression tests:

```sh
npx vitest run src/__tests__/native-script-objects.test.ts src/__tests__/fpt-import-dependencies.test.ts
```

Production browser checks accept private paths through environment variables;
never place the copyrighted files in the repository:

```sh
FPT_SCRIPT_TEST_FILES='["/absolute/path/NewTable.fpt","/absolute/path/LightSequencerDemo.fpt"]' \
FPT_BAM_TEST_FILE='/absolute/path/All In One reference.fpt' \
PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/e2e/native-script-objects.spec.ts
```

The base checks reject caught script and handler errors as well as page errors.
The BAM check intentionally verifies an unsupported-coordinate diagnostic. A
passing result for that check is not successful AI1 initialization or gameplay.

Verified locally on 2026-11-14: 1,115 unit tests passed, three skipped;
typecheck/build passed; security lint has zero errors and 711 warnings.
The strict private browser run has **two passed, one failed**:
LightSequencerDemo passes and AI1 reports the unsupported-coordinate boundary;
NewTable imports but its caught `FuturePinball_BeginPlay` error is
`nvScore1 is not defined`. The new test intentionally keeps exposing this missing
native nonvolatile-score global. Earlier import/page-error-only checks did not
detect this lifecycle failure. No table is claimed playable from these checks.

Before pushing, the exact staged tree was tested separately from inherited
uncommitted changes: **1,109 passed / 3 skipped**, with typecheck, build and
security lint passing (zero errors, 711 warnings). A regression also verifies
that native type IDs select supported script adapters even when an older parser
supplies a conflicting kind label. The browser results above describe the
working tree, not this isolated staged snapshot.
