import json
from backend.services.llm import query_llm

def parse_voice_booking(customer_name: str, transcript: str) -> tuple[dict, str]:
    """
    Parse a voice booking speech-to-text transcript into items, quantity, and total.
    """
    system_prompt = (
        "You are AURA Voice Booking Agent, a phone booking assistant for an Indian retail/food business. "
        "Your task is to parse a customer's ordering sentence and convert it into a structured JSON order. "
        "Calculate the estimated totals based on average item prices: "
        "Biryani = ₹150, Coke/Soda = ₹40, Rice = ₹80, Dal = ₹100, Roti = ₹15."
    )

    user_prompt = (
        f"Customer Name: {customer_name}\n"
        f"Customer Transcript: \"{transcript}\"\n\n"
        "Parse the order items, compute their counts and total prices, and return a structured JSON response."
    )

    schema = {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "qty": {"type": "integer"},
                        "unit_price": {"type": "float"}
                    },
                    "required": ["name", "qty", "unit_price"]
                }
            },
            "total_price": {"type": "float"},
            "confirmation_message": {"type": "string"}
        },
        "required": ["items", "total_price", "confirmation_message"]
    }

    res, source = query_llm(system_prompt, user_prompt, schema)

    if source == "template_fallback" or not res:
        # Fallback template parse
        # Very simple parser if LLM fails
        items = [{"name": "Standard Order", "qty": 1, "unit_price": 250.0}]
        total_price = 250.0
        confirmation_msg = f"Order booked for {customer_name}: 1x Standard Order. Total: ₹250.0"
        res = {
            "items": items,
            "total_price": total_price,
            "confirmation_message": confirmation_msg
        }
        source = "template_fallback"

    return res, source
