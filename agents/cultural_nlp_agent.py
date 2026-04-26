import os
import json
import asyncio
from datetime import datetime, timezone
from uuid import uuid4
from pathlib import Path
from uagents import Agent, Context, Model, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    TextContent,
    chat_protocol_spec,
)
from runtime import get_agent_port

SEED = os.getenv("FETCH_AGENT_SEED_PHRASE", "cultural_nlp_agent_seed_voh")

asyncio.set_event_loop(asyncio.new_event_loop())

agent = Agent(
    name="VoH Cultural NLP Agent",
    seed=SEED,
    port=get_agent_port(8001),
    mailbox=True,
    publish_agent_details=True,
)

chat_proto = Protocol(spec=chat_protocol_spec)

kb_path = Path(__file__).parent.parent / "shared" / "cultural-knowledge-base.json"
with open(kb_path) as f:
    KB = json.load(f)["entries"]
def search_kb(query, lang=None, limit=3):
    query_lower = query.lower()
    results = KB if not lang else [e for e in KB if e["language_code"] == lang]
    scored = []
    for entry in results:
        score = 0
        for field in [entry["cultural_expression"], entry["literal_translation"], entry["clinical_mapping"]]:
            if query_lower in field.lower():
                score += 10
            for word in query_lower.split():
                if len(word) > 2 and word in field.lower():
                    score += 3
        if entry["cultural_expression"].lower() == query_lower:
            score += 50
        if score > 0:
            scored.append((score, entry))
    scored.sort(key=lambda x: -x[0])
    return [e for _, e in scored[:limit]]
class SymptomQuery(Model):
    text: str
    language_code: str = ""
class SymptomResponse(Model):
    insights: str
    source: str = "VoH Cultural Knowledge Base"
def create_text_chat(text, end_session=False):
    content = [TextContent(type="text", text=text)]
    if end_session:
        content.append(EndSessionContent(type="end-session", reason="Analysis complete"))
    return ChatMessage(
        timestamp=datetime.now(timezone.utc),
        msg_id=uuid4(),
        content=content,
    )
@chat_proto.on_message(ChatMessage)
async def handle_chat(ctx: Context, sender: str, msg: ChatMessage):
    ctx.logger.info(f"Received message from {sender}")

    await ctx.send(
        sender,
        ChatAcknowledgement(timestamp=datetime.now(timezone.utc), acknowledged_msg_id=msg.msg_id),
    )

    user_text = ""
    for item in msg.content:
        if hasattr(item, "text"):
            user_text = item.text
            break

    if not user_text:
        await ctx.send(sender, create_text_chat("Please provide a symptom description.", True))
        return

    parts = user_text.split("|")
    query = parts[0].strip()
    lang = parts[1].strip() if len(parts) > 1 else None

    results = search_kb(query, lang)

    if not results:
        await ctx.send(sender, create_text_chat(
            f"No cultural matches found for '{query}'. Try a different expression or specify a language code after a pipe character (e.g., 'susto|es').",
            True
        ))
        return

    response_parts = []
    for r in results:
        response_parts.append(
            f"**{r['cultural_expression']}** ({r['language']})\n"
            f"Literal: {r['literal_translation']}\n"
            f"Clinical: {r['clinical_mapping']}\n"
            f"ICD-10: {', '.join(r['icd10_codes'])}\n"
            f"Screenings: {', '.join(r['recommended_screenings'])}\n"
            f"Confidence: {r['confidence_level']}\n"
            f"Source: {r['source_citation']}"
        )

    response_text = f"Found {len(results)} cultural match(es):\n\n" + "\n\n---\n\n".join(response_parts)
    await ctx.send(sender, create_text_chat(response_text, True))
@agent.on_message(SymptomQuery)
async def handle_direct(ctx: Context, sender: str, msg: SymptomQuery):
    results = search_kb(msg.text, msg.language_code or None)
    response = json.dumps([{
        "expression": r["cultural_expression"],
        "translation": r["literal_translation"],
        "clinical": r["clinical_mapping"],
        "icd10": r["icd10_codes"],
        "screenings": r["recommended_screenings"],
    } for r in results])
    await ctx.send(sender, SymptomResponse(insights=response))
agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    print(f"Cultural NLP Agent address: {agent.address}")
    agent.run()
