# browser-use mit OpenCode Free-Modellen

[`browser-use`](https://github.com/browser-use/browser-use) ist ein Python-Framework
für KI-gesteuerte Browser-Automation.

## Globales Setup (einmalig)

```bash
# Venv anlegen
python3 -m venv ~/.local/share/browser-use/venv
source ~/.local/share/browser-use/venv/bin/activate

# Pakete installieren
pip install browser-use playwright httpx
python3 -m playwright install chromium

# Launcher (ab jetzt aus jedem Projekt nutzbar)
```

Danach ist `browser-use-run` auf der Kommandozeile verfügbar:

```bash
browser-use-run myscript.py        # Script ausführen
browser-use-run -c "print('hi')"   # Inline-Code
```

## OpenCode-Zen-Free-Modelle

Der API-Key liegt in `~/.local/share/opencode/auth.json`, der Endpoint ist
`https://opencode.ai/zen/v1` (OpenAI-kompatibel).

| Modell | Text | Structured Output | Vision | Browser-Use |
|---|---|---|---|---|
| `nemotron-3-ultra-free` | ✅ | ✅ | ❌ | ✅ Empfohlen |
| `mimo-v2.5-free` | ✅ | ✅ | ✅ | ✅ |
| `deepseek-v4-flash-free` | ✅ | ❌ | ❌ | ❌ |
| `north-mini-code-free` | ✅ | ❌ | ❌ | ❌ |
| `minimax-m3-free` | ❌ | ❌ | ❌ | ❌ nocht nicht testbar |
| `qwen3.6-plus-free` | ❌ | ❌ | ❌ | ❌ noch nicht testbar |

## Minimalbeispiel

```python
import asyncio, json, os
from browser_use import Agent, Browser
from browser_use.llm.openai.chat import ChatOpenAI

with open(os.path.expanduser("~/.local/share/opencode/auth.json")) as f:
    api_key = json.load(f)["opencode"]["key"]

llm = ChatOpenAI(
    model="nemotron-3-ultra-free",
    base_url="https://opencode.ai/zen/v1",
    api_key=api_key,
    temperature=0.1,
    max_completion_tokens=4096,
)

async def main():
    browser = Browser(headless=True)
    agent = Agent(
        task="Open https://www.google.com and tell me the page title.",
        llm=llm,
        browser=browser,
        use_vision=False,
    )
    result = await agent.run()
    print(result.final_result())
    await browser.close()

asyncio.run(main())
```

`use_vision=False` ist bei nemotron erforderlich (kein Vision-Support).

## Free-Modell-Validator

Bei Modell-Änderungen (OpenCode Zen aktualisiert Angebot) den Validator laufen lassen:

```bash
browser-use-run scripts/validate-opencode-models.py
# (aus dem Futurepinball-Web-Repo heraus)
```

Er testet alle Free-Modelle auf Text, Structured Output und Vision, vergleicht mit
den Erwartungen in `EXPECTED` und meldet Abweichungen. Bei neuen/geänderten Modellen
muss `scripts/validate-opencode-models.py` im Futurepinball-Web-Repo aktualisiert
werden.

## Bekannte Einschränkungen

- `use_vision=False` bei nemotron (kein Bild-Support)
- MiMo/Nemotron: NVIDIA-Log-Nutzungsbedingungen (keine vertraulichen Daten)
- Free-Modelle sind zeitlich begrenzt (Feedback-Phase)
- Structured-Output-Test verwendet `json_schema` (das von browser-use genutzte Format)
