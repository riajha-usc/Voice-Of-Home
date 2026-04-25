import os
import json
from datetime import datetime, timezone
from uuid import uuid4
from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    TextContent,
    chat_protocol_spec,
)

SEED = os.getenv("FETCH_AGENT_SEED_PHRASE", "voice_agent_seed_voh")

agent = Agent(
    name="VoH Voice Synthesis Agent",
    seed=SEED + "_voice",
    port=8003,
    mailbox=True,
    publish_agent_details=True,
)

chat_proto = Protocol(spec=chat_protocol_spec)

LANG_NAMES = {
    "vi": "Vietnamese", "es": "Spanish", "ht": "Haitian Creole",
    "hi": "Hindi", "zh": "Mandarin", "tl": "Tagalog",
    "ko": "Korean", "ar": "Arabic", "fa": "Farsi", "en": "English",
}
def create_text_chat(text, end_session=False):
    content = [TextContent(type="text", text=text)]
    if end_session:
        content.append(EndSessionContent(type="end-session", reason="Complete"))
    return ChatMessage(
        timestamp=datetime.now(timezone.utc),
        msg_id=uuid4(),
        content=content,
    )
@chat_proto.on_message(ChatMessage)
async def handle_chat(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(
        sender,
        ChatAcknowledgement(timestamp=datetime.now(timezone.utc), acknowledged_msg_id=msg.msg_id),
    )

    user_text = ""
    for item in msg.content:
        if hasattr(item, "text"):
            user_text = item.text
            break

    parts = user_text.split("|")
    care_text = parts[0].strip()
    lang_code = parts[1].strip() if len(parts) > 1 else "en"
    lang_name = LANG_NAMES.get(lang_code, lang_code)

    char_count = len(care_text)
    estimated_duration = max(5, char_count // 15)

    response = (
        f"Voice message prepared for ElevenLabs generation:\n\n"
        f"Language: {lang_name} ({lang_code})\n"
        f"Text length: {char_count} characters\n"
        f"Estimated duration: {estimated_duration} seconds\n"
        f"Model: eleven_multilingual_v2\n\n"
        f"Text to synthesize:\n\"{care_text}\"\n\n"
        f"Status: Ready for ElevenLabs API call. In production, audio would be generated "
        f"and delivered to all care circle members via push notification."
    )

    await ctx.send(sender, create_text_chat(response, True))
agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    print(f"Voice Synthesis Agent address: {agent.address}")
    agent.run()
