from backend.services.llm import query_llm

def draft_winback_offer(customer_name: str, last_order_date: str, days_since: int) -> tuple[dict, str]:
    """
    Draft a personalized win-back offer to a customer who hasn't ordered in a while.
    """
    system_prompt = (
        "You are AURA Winback Agent, a retail marketer. "
        "Your task is to draft a friendly, enticing customer win-back message with a promo offer."
    )

    offer_detail = "10% off on your next order" if days_since < 60 else "free delivery + ₹100 off on orders above ₹500"
    user_prompt = (
        f"Customer Name: {customer_name}\n"
        f"Last Order Date: {last_order_date} ({days_since} days ago)\n"
        f"Recommended Promo Offer: {offer_detail}\n\n"
        "Draft a short, engaging text message welcoming the customer back and presenting this promo code."
    )

    schema = {
        "type": "object",
        "properties": {
            "winback_message": {"type": "string"},
            "promo_code": {"type": "string"}
        },
        "required": ["winback_message", "promo_code"]
    }

    res, source = query_llm(system_prompt, user_prompt, schema)

    if source == "template_fallback" or not res:
        # Fallback template
        promo_code = "AURA10" if days_since < 60 else "WELCOMEBACK"
        fallback_msg = (
            f"Hi {customer_name}, we miss you! It has been {days_since} days since your last order. "
            f"Use coupon code {promo_code} to get {offer_detail}. Hope to serve you soon!"
        )
        res = {
            "winback_message": fallback_msg,
            "promo_code": promo_code
        }
        source = "template_fallback"

    return res, source
