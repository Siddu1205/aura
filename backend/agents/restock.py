from backend.services.llm import query_llm

def draft_restock_po(product_name: str, current_stock: int, reorder_threshold: int, supplier_name: str, unit_cost: float) -> tuple[dict, str]:
    """
    Draft a purchase order for restocking.
    """
    suggested_qty = int(reorder_threshold * 2) if reorder_threshold > 0 else 50
    total_cost = suggested_qty * unit_cost

    system_prompt = (
        "You are AURA Restock Agent, a helpful retail operations assistant. "
        "Your task is to draft a polite, professional purchase order message to a supplier "
        "on behalf of a store owner."
    )
    
    user_prompt = (
        f"Supplier: {supplier_name}\n"
        f"Product: {product_name}\n"
        f"Current Stock: {current_stock} units\n"
        f"Reorder Threshold: {reorder_threshold} units\n"
        f"Suggested Qty to order: {suggested_qty}\n"
        f"Unit Cost: ₹{unit_cost}\n"
        f"Total Cost: ₹{total_cost}\n\n"
        "Draft a short, actionable message to send over WhatsApp/email to this supplier. "
        "It must request the stock and confirm unit price."
    )

    schema = {
        "type": "object",
        "properties": {
            "supplier_message": {"type": "string"},
            "recommended_quantity": {"type": "integer"},
            "urgency": {"type": "string", "enum": ["low", "medium", "high"]}
        },
        "required": ["supplier_message", "recommended_quantity", "urgency"]
    }

    res, source = query_llm(system_prompt, user_prompt, schema)

    if source == "template_fallback" or not res:
        # Fallback template
        fallback_msg = (
            f"Dear {supplier_name}, please deliver {suggested_qty} units of {product_name} "
            f"to our store. Unit cost: ₹{unit_cost}. Total: ₹{total_cost}. Thank you!"
        )
        res = {
            "supplier_message": fallback_msg,
            "recommended_quantity": suggested_qty,
            "urgency": "high" if current_stock == 0 else "medium"
        }
        source = "template_fallback"

    return res, source
