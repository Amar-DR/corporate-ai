import os
import httpx
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.environ["OPENROUTER_API_KEY"]
AI_MODEL = os.environ.get("AI_MODEL", "deepseek/deepseek-v4-flash:free")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

async def ask_ai(messages: list[dict], temperature: float = 0.7) -> str:
    """Kirim request ke OpenRouter dan return response text"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://financeai.homelab",
                "X-Title": "FinanceAI",
            },
            json={
                "model": AI_MODEL,
                "messages": messages,
                "temperature": temperature,
            }
        )
        data = resp.json()
        if "error" in data:
            raise Exception(f"AI Error: {data['error']['message']}")
        return data["choices"][0]["message"]["content"]
