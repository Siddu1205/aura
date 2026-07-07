import os
import json
import logging

logger = logging.getLogger("aura.llm")

def query_llm(system_prompt: str, user_prompt: str, json_schema: dict = None) -> tuple[dict, str]:
    """
    Unified LLM call. Tries Anthropic first, then Gemini.
    If both fail or are missing, returns the mock/fallback template structure.
    Returns: (result_dict_or_string, language_source)
    """
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")

    # If schema is provided, we want to parse it as JSON
    # Try Anthropic Claude
    if anthropic_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=anthropic_key)
            
            # Use JSON schema if provided
            if json_schema:
                # Anthropic tool calling or system prompting for structured output
                # For hackathon simplicity, we instruct the model to return JSON
                modified_prompt = f"{user_prompt}\n\nYou MUST reply in JSON matching this schema: {json.dumps(json_schema)}"
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=1000,
                    system=system_prompt,
                    messages=[{"role": "user", "content": modified_prompt}],
                    temperature=0.2
                )
                text = response.content[0].text.strip()
                # Parse JSON
                # Clean up markdown block if present
                if text.startswith("```json"):
                    text = text.split("```json")[1].split("```")[0].strip()
                elif text.startswith("```"):
                    text = text.split("```")[1].split("```")[0].strip()
                return json.loads(text), "llm"
            else:
                response = client.messages.create(
                    model="claude-3-5-sonnet-20240620",
                    max_tokens=1000,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_prompt}],
                    temperature=0.7
                )
                return response.content[0].text.strip(), "llm"
        except Exception as e:
            logger.warning(f"Anthropic API call failed: {e}. Trying Gemini fallback.")

    # Try Google Gemini
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            
            # Use gemini-1.5-flash for speed
            model_name = "gemini-1.5-flash" if json_schema else "gemini-1.5-pro"
            
            generation_config = {}
            if json_schema:
                generation_config = {
                    "response_mime_type": "application/json",
                    "response_schema": json_schema
                }
            
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=system_prompt,
                generation_config=generation_config
            )
            
            response = model.generate_content(user_prompt)
            text = response.text.strip()
            
            if json_schema:
                return json.loads(text), "llm"
            return text, "llm"
        except Exception as e:
            logger.warning(f"Gemini API call failed: {e}. Using local template fallback.")

    # Local template fallback
    return None, "template_fallback"
