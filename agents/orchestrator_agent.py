import os
import json
import asyncio
from datetime import datetime, timezone
from uuid import uuid4
from dotenv import load_dotenv
from uagents import Agent, Context, Protocol

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    TextContent,
    chat_protocol_spec,
)
from runtime import get_agent_port

SEED = os.getenv("FETCH_AGENT_SEED_PHRASE", "orchestrator_agent_seed_voh")
AGENTVERSE_API_KEY = os.getenv("FETCH_AGENTVERSE_API_KEY", "")
PUBLIC_URL = os.getenv("PUBLIC_URL", "")

agent = Agent(
    name="VoH Orchestrator Agent",
    seed=SEED + "_orchestrator",
    port=8000,
    #endpoint=[f"{PUBLIC_URL}/submit"] if PUBLIC_URL else ["http://127.0.0.1:8004/submit"],
    mailbox=True,
    publish_agent_details=True,
)

chat_proto = Protocol(spec=chat_protocol_spec)
def create_text_chat(text, end_session=False):
    content = [TextContent(type="text", text=text)]
    if end_session:
        content.append(EndSessionContent(type="end-session"))
    return ChatMessage(
        timestamp=datetime.now(timezone.utc),
        msg_id=uuid4(),
        content=content,
    )
def classify_intent(text):
    t = text.lower()
    if any(w in t for w in ["symptom", "pain", "hurt", "feel", "susto", "dife", "fire", "chest", "hwabyung", "trung"]):
        return "symptom"
    if any(w in t for w in ["food", "eat", "meal", "diet", "pho", "rice", "arroz", "congee", "nutrition"]):
        return "dietary"
    if any(w in t for w in ["voice", "speak", "say", "tell", "instruction", "remind", "message"]):
        return "voice"
    if any(w in t for w in ["help", "what", "how", "can", "should", "medication", "pill", "drug"]):
        return "care_chat"
    return "general"
@chat_proto.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    pass

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

    if not user_text:
        await ctx.send(sender, create_text_chat(
            "Welcome to Voices of Home. I can help with:\n"
            "1. Cultural symptom analysis (e.g., 'susto|es')\n"
            "2. Dietary adaptation (e.g., 'analyze pho')\n"
            "3. Voice care instructions (e.g., 'tell my family about medication|vi')\n"
            "4. General care questions\n\n"
            "How can I help?",
            False
        ))
        return

    intent = classify_intent(user_text)

    if intent == "symptom":
        response = (
            f"Routing to Cultural NLP Agent...\n\n"
            f"Intent detected: symptom analysis\n"
            f"Input: \"{user_text}\"\n\n"
            f"The Cultural NLP Agent will search the cultural knowledge base "
            f"(37 entries across 13 languages) and return clinical insights with "
            f"ICD-10 codes and recommended screenings.\n\n"
            f"To query directly, send your expression to the Cultural NLP Agent "
            f"with format: 'expression|language_code'"
        )
    elif intent == "dietary":
        response = (
            f"Routing to Dietary Agent...\n\n"
            f"Intent detected: dietary analysis\n"
            f"Input: \"{user_text}\"\n\n"
            f"The Dietary Agent will identify the dish, map nutritional content, "
            f"and generate a hospital-adapted meal plan that keeps the food culturally familiar."
        )
    elif intent == "voice":
        response = (
            f"Routing to Voice Synthesis Agent...\n\n"
            f"Intent detected: voice message generation\n"
            f"Input: \"{user_text}\"\n\n"
            f"The Voice Agent will simplify the care instructions and prepare them "
            f"for ElevenLabs multilingual text-to-speech synthesis."
        )
    else:
        response = (
            f"I understand you need help with: \"{user_text}\"\n\n"
            f"As the Orchestrator Agent, I coordinate three specialized agents:\n"
            f"- Cultural NLP Agent: Maps cultural symptom expressions to clinical insights\n"
            f"- Dietary Agent: Creates culturally-adapted hospital meal plans\n"
            f"- Voice Agent: Generates care instructions as warm voice messages\n\n"
            f"Please specify what you need, and I will route your request to the right agent."
        )

    await ctx.send(sender, create_text_chat(response, True))
agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    print(f"Orchestrator Agent address: {agent.address}")
    print("Voices of Home Agent Swarm - Orchestrator ready.")
    print("Coordinating: Cultural NLP | Dietary | Voice agents")
    agent.run()
