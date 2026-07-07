from backend.services.llm import query_llm

def draft_payment_reminder(customer_name: str, outstanding_due: float, tone: str = "polite") -> tuple[dict, str]:
    """
    Draft a payment reminder message.
    """
    system_prompt = (
        "You are AURA Collections Agent, a business manager in India. "
        "Your task is to draft a clear, professional payment reminder for customer dues. "
        f"The messaging tone should be: {tone}."
    )

    user_prompt = (
        f"Customer Name: {customer_name}\n"
        f"Outstanding Balance: ₹{outstanding_due}\n\n"
        "Draft a short, direct message asking the customer to settle their outstanding balance. "
        "Make sure to include the exact amount due."
    )

    schema = {
        "type": "object",
        "properties": {
            "reminder_message": {"type": "string"},
            "tone": {"type": "string", "enum": ["polite", "firm", "urgent"]}
        },
        "required": ["reminder_message", "tone"]
    }

    res, source = query_llm(system_prompt, user_prompt, schema)

    if source == "template_fallback" or not res:
        # Fallback template
        fallback_msg = (
            f"Dear {customer_name}, a friendly reminder that an amount of ₹{outstanding_due:.2f} "
            f"is outstanding. Please settle this at your earliest convenience. Thank you!"
        )
        res = {
            "reminder_message": fallback_msg,
            "tone": tone
        }
        source = "template_fallback"

    return res, source
