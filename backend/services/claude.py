from __future__ import annotations

import anthropic
from backend.config import CLAUDE_API_KEY

_client: anthropic.Anthropic | None = None


def get_claude() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)
    return _client


def generate_reply_suggestion(
    conversation_messages: list[dict],
    category: str,
    context: str = "",
) -> str:
    """
    Generate an AI reply suggestion for a freelancer responding to a client on soomgo.com.

    Args:
        conversation_messages: List of message dicts with role/content
        category: Detected category (e.g., 'ppt', 'design', 'general')
        context: Additional context about the project or freelancer

    Returns:
        A suggested reply string
    """
    client = get_claude()

    system_prompt = f"""당신은 숨고(soomgo.com) 플랫폼의 프리랜서를 돕는 AI 비서입니다.
프리랜서가 클라이언트에게 보낼 답변을 작성하는 것을 도와줍니다.

작업 카테고리: {category}
{f"추가 컨텍스트: {context}" if context else ""}

다음 지침에 따라 답변을 작성해주세요:
- 친절하고 전문적인 톤을 유지하세요
- 클라이언트의 요구사항을 정확히 이해했음을 보여주세요
- 구체적인 작업 가능 여부, 예상 기간, 비용 등을 간략히 언급하세요
- 한국어로 작성하세요
- 200자 이내로 간결하게 작성하세요"""

    # Build messages from conversation history
    messages = []
    for msg in conversation_messages[-10:]:  # Use last 10 messages for context
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    # If no messages, add a placeholder
    if not messages:
        messages = [{"role": "user", "content": "안녕하세요, 작업 문의 드립니다."}]

    # Add the request for a reply suggestion
    messages.append(
        {
            "role": "user",
            "content": "위 대화를 바탕으로 클라이언트에게 보낼 전문적인 답변을 작성해주세요.",
        }
    )

    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=512,
        system=system_prompt,
        messages=messages,
    )

    return response.content[0].text
