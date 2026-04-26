import os
import json
import asyncio
from datetime import datetime, timezone
from uuid import uuid4
from uagents import Agent, Context, Model, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    TextContent,
    chat_protocol_spec,
)
from runtime import get_agent_port

SEED = os.getenv("FETCH_AGENT_SEED_PHRASE", "dietary_agent_seed_voh")

asyncio.set_event_loop(asyncio.new_event_loop())

agent = Agent(
    name="VoH Dietary Agent",
    seed=SEED + "_dietary",
    port=get_agent_port(8002),
    mailbox=True,
    publish_agent_details=True,
)

chat_proto = Protocol(spec=chat_protocol_spec)

DIETARY_DB = {
    "pho": {
        "dish_name": "Ph\u1edf b\u00f2",
        "dish_name_english": "Vietnamese beef noodle soup",
        "cuisine": "Vietnamese",
        "ingredients": ["rice noodles", "beef broth", "sliced beef", "bean sprouts", "thai basil", "lime", "hoisin", "sriracha"],
        "nutrition_original": {"calories": 420, "protein_g": 28, "sodium_mg": 1850, "sugar_g": 4, "fat_g": 8, "carbs_g": 52},
        "nutrition_adapted": {"calories": 380, "protein_g": 28, "sodium_mg": 980, "sugar_g": 4, "fat_g": 6, "carbs_g": 48},
        "adaptation": "Low-sodium broth, extra herbs, lean beef, steamed rice side",
        "cultural_note": "Vietnamese patients prefer soup when ill. Hot broth is associated with healing. Do NOT substitute Western soups.",
    },
    "arroz": {
        "dish_name": "Arroz con pollo",
        "dish_name_english": "Rice with chicken",
        "cuisine": "Latin American",
        "ingredients": ["rice", "chicken", "sofrito", "bell peppers", "olives", "tomato sauce", "cumin"],
        "nutrition_original": {"calories": 480, "protein_g": 32, "sodium_mg": 1200, "sugar_g": 6, "fat_g": 14, "carbs_g": 55},
        "nutrition_adapted": {"calories": 420, "protein_g": 32, "sodium_mg": 750, "sugar_g": 5, "fat_g": 10, "carbs_g": 50},
        "adaptation": "Reduced salt in sofrito, skinless chicken, brown rice option",
        "cultural_note": "Comfort food across Latin American cultures. Familiar preparation builds trust in hospital meals.",
    },
    "congee": {
        "dish_name": "\u7ca5",
        "dish_name_english": "Rice porridge / congee",
        "cuisine": "Chinese",
        "ingredients": ["rice", "water/broth", "ginger", "scallions", "century egg or pork"],
        "nutrition_original": {"calories": 280, "protein_g": 12, "sodium_mg": 900, "sugar_g": 2, "fat_g": 4, "carbs_g": 48},
        "nutrition_adapted": {"calories": 260, "protein_g": 14, "sodium_mg": 600, "sugar_g": 2, "fat_g": 3, "carbs_g": 45},
        "adaptation": "Low-sodium broth base, extra ginger for anti-nausea, lean protein topping",
        "cultural_note": "Congee is the default 'sick food' in Chinese culture. Offering it signals care and understanding.",
    },
}
def create_text_chat(text, end_session=False):
    content = [TextContent(type="text", text=text)]
    if end_session:
        content.append(EndSessionContent(type="end-session", reason="Analysis complete"))
    return ChatMessage(
        timestamp=datetime.now(timezone.utc),
        msg_id=uuid4(),
        content=content,
    )
def find_dish(query):
    q = query.lower()
    for key, dish in DIETARY_DB.items():
        if key in q or dish["dish_name"].lower() in q or dish["dish_name_english"].lower() in q:
            return dish
    return None
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

    dish = find_dish(user_text)

    if not dish:
        await ctx.send(sender, create_text_chat(
            f"Could not identify dish from '{user_text}'. Try: pho, arroz con pollo, or congee.", True
        ))
        return

    orig = dish["nutrition_original"]
    adapt = dish["nutrition_adapted"]
    response = (
        f"**{dish['dish_name']}** ({dish['dish_name_english']})\n"
        f"Cuisine: {dish['cuisine']}\n"
        f"Ingredients: {', '.join(dish['ingredients'])}\n\n"
        f"Original: {orig['calories']} cal, {orig['sodium_mg']}mg sodium\n"
        f"Adapted: {adapt['calories']} cal, {adapt['sodium_mg']}mg sodium\n"
        f"Changes: {dish['adaptation']}\n\n"
        f"Cultural note: {dish['cultural_note']}"
    )

    await ctx.send(sender, create_text_chat(response, True))
agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    print(f"Dietary Agent address: {agent.address}")
    agent.run()
