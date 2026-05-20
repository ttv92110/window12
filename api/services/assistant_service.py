from api.repositories.conversation_repo import conversation_repo
from typing import List, Dict

# Simple mock responses
MOCK_RESPONSES = {
    "hello": "Hello! How can I help you with Windows 12 today?",
    "help": "You can ask me about the OS features, apps, or just chat. I'm still learning!",
    "who are you": "I'm your Windows 12 AI Assistant. I can answer questions about this OS and help you navigate.",
    "bye": "Goodbye! Have a great day.",
}

class AssistantService:
    async def get_history(self, user_id: str) -> List[Dict]:
        return conversation_repo.get_all(user_id)

    async def send_message(self, user_id: str, content: str) -> Dict:
        # Save user message
        user_msg = conversation_repo.create(user_id, {"role": "user", "content": content})

        # Generate mock response
        reply = self.generate_reply(content)

        # Save assistant message
        assistant_msg = conversation_repo.create(user_id, {"role": "assistant", "content": reply})
        return {"user": user_msg, "assistant": assistant_msg}

    def generate_reply(self, prompt: str) -> str:
        prompt_lower = prompt.lower().strip()
        # Check for exact matches
        for key, response in MOCK_RESPONSES.items():
            if key in prompt_lower:
                return response
        # Fallback
        if "?" in prompt:
            return "That's an interesting question! I'm still learning, but I'll do my best to help."
        return "I see. Tell me more, or ask me something about Windows 12!"

    async def clear_history(self, user_id: str):
        conversation_repo.delete_all(user_id)

assistant_service = AssistantService()