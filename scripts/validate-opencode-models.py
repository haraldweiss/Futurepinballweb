#!/usr/bin/env python3
"""Testet OpenCode-Zen-Free-Modelle auf browser-use-Tauglichkeit.

Usage:
    source .venv/bin/activate
    python3 scripts/validate-opencode-models.py

Findet neue Free-Modelle, testet Capabilities und vergleicht mit Erwartungen.
Bei Abweichungen oder neuen Modellen → Exit-Code 1 + Report.
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx

AUTH_PATH = Path.home() / ".local/share/opencode/auth.json"
ZEN_BASE = "https://opencode.ai/zen/v1"
REPORT_PATH = Path(__file__).parent / "opencode-models-report.json"

# Erwartete Capabilities je Free-Modell
EXPECTED: dict[str, dict] = {
    "nemotron-3-ultra-free": {"text": True, "structured_output": True, "vision": False},
    "mimo-v2.5-free": {"text": True, "structured_output": True, "vision": True},
    "deepseek-v4-flash-free": {"text": True, "structured_output": False, "vision": False},
    "north-mini-code-free": {"text": True, "structured_output": False, "vision": False},
    "minimax-m3-free": {"text": False, "structured_output": False, "vision": False},
    "qwen3.6-plus-free": {"text": False, "structured_output": False, "vision": False},
}


def get_api_key() -> str:
    with open(AUTH_PATH) as f:
        return json.load(f)["opencode"]["key"]


async def fetch_free_models(api_key: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{ZEN_BASE}/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10,
        )
        resp.raise_for_status()
        models = resp.json().get("data", [])
    free_models = []
    for m in models:
        mid = m.get("id", "")
        pricing = m.get("pricing", {})
        is_free = "free" in mid.lower() or pricing.get("input", 1) == 0
        if "deprecated" not in mid.lower() and is_free:
            free_models.append(m)
    return free_models


async def _try_cap(client: httpx.AsyncClient, api_key: str, model: str, cap: str) -> bool | None:
    """Einzelner Versuch für eine Capability. Rückgabe None = transienter Fehler."""
    try:
        if cap == "text":
            resp = await client.post(
                f"{ZEN_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "messages": [{"role": "user", "content": "Say OK"}], "max_tokens": 10},
                timeout=15,
            )
            return resp.status_code == 200 and bool(resp.json().get("choices"))

        if cap == "structured_output":
            resp = await client.post(
                f"{ZEN_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": model, "messages": [{"role": "user", "content": "Respond with JSON"}],
                    "response_format": {
                        "type": "json_schema",
                        "json_schema": {
                            "name": "response",
                            "schema": {"type": "object", "properties": {"ok": {"type": "boolean"}}, "required": ["ok"], "additionalProperties": False},
                            "strict": True,
                        },
                    },
                    "max_tokens": 100,
                },
                timeout=15,
            )
            if resp.status_code != 200:
                return False
            json.loads(resp.json()["choices"][0]["message"]["content"])
            return True

        if cap == "vision":
            resp = await client.post(
                f"{ZEN_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": model, "messages": [
                        {"role": "user", "content": [
                            {"type": "text", "text": "Describe"},
                            {"type": "image_url", "image_url": {"url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="}},
                        ]},
                    ],
                    "max_tokens": 20,
                },
                timeout=15,
            )
            return resp.status_code == 200
    except Exception:
        return None


async def has_capability(client: httpx.AsyncClient, api_key: str, model: str, cap: str, retries: int = 2) -> bool:
    """Testet eine Capability mit Retry bei transienten Fehlern (None = timeout/connection)."""
    for attempt in range(1 + retries):
        result = await _try_cap(client, api_key, model, cap)
        if result is not None:
            return result
    return False


async def main() -> int:
    api_key = get_api_key()
    print("🔍 OpenCode-Zen-Free-Modell-Validator\n")

    print("📡 Verfügbare Modelle abrufen...", end=" ", flush=True)
    free_models = await fetch_free_models(api_key)
    print(f"{len(free_models)} Free-Modelle gefunden\n")

    if not free_models:
        print("⚠️ Keine Free-Modelle gefunden.")
        return 1

    results: dict[str, dict] = {}
    all_ok = True
    known_ids = set(EXPECTED)
    found_ids: set[str] = set()
    capabilities = ["text", "structured_output", "vision"]

    async with httpx.AsyncClient() as client:
        for m in free_models:
            mid = m["id"]
            found_ids.add(mid)
            print(f"  📌 {mid}", flush=True)
            caps: dict[str, bool] = {}
            for cap in capabilities:
                ok = await has_capability(client, api_key, mid, cap)
                caps[cap] = ok
                print(f"     {cap:18s}  {'✅' if ok else '❌'}", flush=True)
            results[mid] = caps

    # Vergleich mit Erwartungen
    missing_ids = known_ids - found_ids
    new_ids = found_ids - known_ids

    if missing_ids:
        print(f"\n⚠️ Verschwundene Modelle (nicht mehr in API): {', '.join(sorted(missing_ids))}")
        all_ok = False

    if new_ids:
        print(f"\n🆕 Neue/unbekannte Free-Modelle: {', '.join(sorted(new_ids))}")
        print("   → EXPECTED in validate-opencode-models.py ergänzen!")
        all_ok = False

    for mid in found_ids & known_ids:
        expected = EXPECTED[mid]
        for cap in capabilities:
            if results[mid][cap] != expected[cap]:
                print(f"     ⚠️  {mid}: '{cap}' geändert: erwartet {expected[cap]}, gemessen {results[mid][cap]}")
                all_ok = False

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "api_base": ZEN_BASE,
        "models_tested": len(free_models),
        "all_match_expectations": all_ok,
        "results": results,
        "expected": EXPECTED,
        "known_but_missing": list(sorted(missing_ids)),
        "new_unexpected": list(sorted(new_ids)),
        "models_with_structured": sorted(k for k, v in results.items() if v.get("structured_output")),
        "models_with_vision": sorted(k for k, v in results.items() if v.get("vision")),
    }

    REPORT_PATH.write_text(json.dumps(report, indent=2))
    print(f"\n📄 Report: {REPORT_PATH}")

    if all_ok:
        print("\n✅ Alle Free-Modelle entsprechen den Erwartungen.")
        return 0
    else:
        print("\n⚠️ Abweichungen! EXPECTED in validate-opencode-models.py aktualisieren.")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
