# browser-use mit OpenCode Free-Modellen

[`browser-use`](https://github.com/browser-use/browser-use) ist ein Python-Framework
für KI-gesteuerte Browser-Automation. Hier dokumentiert ist die Einrichtung mit
kostenlosen LLM-Modellen über den OpenCode-Zen-Dienst.

## Installation

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install browser-use playwright
python3 -m playwright install chromium
```

## OpenCode-Zen-Free-Modelle

Der API-Key liegt in `~/.local/share/opencode/auth.json`, der Endpoint ist
`https://opencode.ai/zen/v1` (OpenAI-kompatibel).

| Modell | Structured Output | Vision | Hinweis |
|---|---|---|---|
| `nemotron-3-ultra-free` | ✅ | ❌ | Empfohlen, `use_vision=False` nötig |
| `mimo-v2.5-free` | ✅ | ❌ | Alternative |
| `deepseek-v4-flash-free` | ❌ | ❌ | Kein structured output |
| `north-mini-code-free` | ❌ | ❌ | Kein structured output |
| `big-pickle` | ❌ | ❌ | Kein structured output |

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

`use_vision=False` ist zwingend erforderlich, da kein kostenloses Modell
Bildanalyse unterstützt.

## Bekannte Einschränkungen

- Kein Vision/Image-Support bei Free-Modellen
- Nemotron/MiMo: NVIDIA/Dienst-spezifische Log-Nutzungsbedingungen (keine
  vertraulichen Daten)
- Die Free-Modelle sind zeitlich begrenzt verfügbar (Feedback-Phase)
