"""
memory.py - Session Memory for T11 Smart Packing List Agent.

This module implements the conversation and trip state memory that:
1. Retains conversation history across multiple turns.
2. Tracks persistent trip metadata (destination, duration, trip purpose, weather).
3. Holds the session packing list so it remains consistent and queryable across turns.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
import json


@dataclass
class TripContext:
    """Stores key travel context extracted from conversation."""
    destination: Optional[str] = None
    duration_days: Optional[int] = None
    purpose: Optional[str] = None  # e.g., 'work conference', 'vacation', 'trekking'
    weather_summary: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "destination": self.destination,
            "duration_days": self.duration_days,
            "purpose": self.purpose,
            "weather_summary": self.weather_summary,
        }


class SessionMemory:
    """
    Manages multi-turn conversation history and persistent state for the agent.
    """

    def __init__(self, system_prompt: str):
        self.system_prompt = system_prompt
        self.messages: List[Dict[str, Any]] = [
            {"role": "system", "content": system_prompt}
        ]
        self.trip_context = TripContext()
        self.turns_count = 0

    def add_user_message(self, content: str) -> None:
        """Add a user turn to message memory."""
        self.messages.append({"role": "user", "content": content})
        self.turns_count += 1

    def add_assistant_message(self, content: Optional[str] = None, tool_calls: Optional[List[Any]] = None) -> None:
        """Add an assistant response or tool call intent to memory."""
        msg: Dict[str, Any] = {"role": "assistant"}
        if content is not None:
            msg["content"] = content
        if tool_calls is not None:
            msg["tool_calls"] = tool_calls
        self.messages.append(msg)

    def add_tool_message(self, tool_call_id: str, name: str, content: str) -> None:
        """Add tool execution output to memory."""
        self.messages.append({
            "role": "tool",
            "tool_call_id": tool_call_id,
            "name": name,
            "content": content
        })

    def update_context(self, destination: Optional[str] = None, duration_days: Optional[int] = None, 
                       purpose: Optional[str] = None, weather_summary: Optional[Dict[str, Any]] = None) -> None:
        """Update persistent trip context."""
        if destination:
            self.trip_context.destination = destination
        if duration_days:
            self.trip_context.duration_days = duration_days
        if purpose:
            self.trip_context.purpose = purpose
        if weather_summary:
            self.trip_context.weather_summary = weather_summary

    def get_messages(self) -> List[Dict[str, Any]]:
        """
        Return an optimized message list formatted for the LLM completions API.
        Prunes intermediate tool calls from older completed turns to conserve tokens
        and prevent Groq rate limit errors.
        """
        if len(self.messages) <= 2:
            return list(self.messages)

        # Find index of last user message (start of current active turn)
        last_user_idx = -1
        for i in range(len(self.messages) - 1, -1, -1):
            if self.messages[i].get("role") == "user":
                last_user_idx = i
                break

        if last_user_idx <= 1:
            return list(self.messages)

        optimized: List[Dict[str, Any]] = [self.messages[0]]

        # Keep only user prompts and final answers from prior completed turns
        for msg in self.messages[1:last_user_idx]:
            role = msg.get("role")
            if role == "user":
                optimized.append(msg)
            elif role == "assistant" and msg.get("content") and not msg.get("tool_calls"):
                optimized.append(msg)

        # Keep all messages from the current active turn
        optimized.extend(self.messages[last_user_idx:])
        return optimized

    def get_memory_summary(self) -> str:
        """Provide a human-readable snapshot of the active memory."""
        lines = [
            f"--- Active Session Memory (Turn {self.turns_count}) ---",
            f"Destination: {self.trip_context.destination or 'Not set'}",
            f"Trip Type: {self.trip_context.purpose or 'General'}",
            f"Weather Known: {'Yes' if self.trip_context.weather_summary else 'No'}",
            f"Messages in History: {len(self.messages)}",
        ]
        return "\n".join(lines)
