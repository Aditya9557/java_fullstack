"""
agent.py - The Plan-and-Act Agent for T11 Smart Packing List.

This module implements the core agent loop:
1. Receives user travel goals / queries.
2. Formulates a plan using system guidelines.
3. Decides and executes tool calls (check_weather, add_item, get_packing_list).
4. Feeds tool observations back into the loop until the plan is complete.
5. Retains state in SessionMemory across multi-turn interactions.
"""

from __future__ import annotations
import os
import json
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from openai import OpenAI

from tools import TOOL_SCHEMAS, TOOL_REGISTRY, get_packing_list
from memory import SessionMemory

from pathlib import Path

# Load environment variables from CA-1/.env or current working directory
env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

SYSTEM_PROMPT = """You are an intelligent, proactive Travel Packing Agent (Topic T11: Smart Packing List Agent).
Your purpose is to build a customized, highly practical packing list that adapts dynamically to the traveler's destination weather, duration, and trip purpose.

Rules you MUST follow (Plan-and-Act Agentic behavior):
1. AN AGENT, NOT A CHATBOT: Do not merely give generic text advice. You MUST use your tools to check real weather and record items into the structured packing list.
2. CHECK WEATHER FIRST: When a destination is mentioned, always call `check_weather(city)` before deciding on clothing or weather protection gear.
3. USE `add_item`: Call `add_item(item, category, quantity)` for each necessary item to populate the traveler's list. Use appropriate categories like 'Clothing', 'Weather Gear', 'Work & Electronics', 'Toiletries & Meds', 'Trekking & Outdoor', 'Documents & Money'.
4. USE MEMORY ACROSS TURNS: You remember the trip details, past items packed, and destination across conversational turns. If the user asks what is packed or adds new constraints, reference and build upon existing memory.
5. CONCISE & PRACTICAL: Give a structured summary of what was planned, why specific gear was chosen based on the weather, and what items were added.
"""


class SmartPackingAgent:
    """
    A Plan-and-Act AI Agent powered by Groq.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: str = "qwen/qwen3.6-27b"
    ):
        resolved_key = api_key or os.getenv("GROQ_API_KEY")
        if not resolved_key:
            raise ValueError(
                "GROQ_API_KEY is not set. Please set GROQ_API_KEY in your environment or .env file."
            )
        
        resolved_base_url = base_url or os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
        self.model = os.getenv("MODEL", model)
        
        self.client = OpenAI(
            api_key=resolved_key,
            base_url=resolved_base_url
        )
        self.memory = SessionMemory(system_prompt=SYSTEM_PROMPT)

    def run_turn(self, user_input: str, max_steps: int = 12, verbose: bool = True) -> Dict[str, Any]:
        """
        Execute one conversational turn through the Plan-and-Act loop.
        
        Args:
            user_input: The user's query or instruction.
            max_steps: Safeguard against infinite tool loops.
            verbose: If True, prints the live multi-step execution trace.
            
        Returns:
            Dict containing the final response, step traces, and current packing list.
        """
        if verbose:
            print("\n" + "=" * 70)
            print(f"👤 USER: {user_input}")
            print("=" * 70)

        initial_msg_count = len(self.memory.messages)
        # 1. Store user input in session memory
        self.memory.add_user_message(user_input)
        
        step_traces: List[Dict[str, Any]] = []
        step_count = 0
        final_answer = ""

        try:
            # 2. Plan-Act Execution Loop
            while step_count < max_steps:
                step_count += 1
                
                # Decide next action using model & conversation history
                # Robust completion call with automatic rate limit backoff retry
                max_retries = 5
                response = None
                last_error = None
                for attempt in range(max_retries):
                    try:
                        response = self.client.chat.completions.create(
                            model=self.model,
                            messages=self.memory.get_messages(),
                            tools=TOOL_SCHEMAS,
                            tool_choice="auto",
                            temperature=0.2,
                            max_tokens=800,
                        )
                        break
                    except Exception as e:
                        last_error = e
                        err_str = str(e).lower()
                        if "rate_limit" in err_str or "429" in err_str:
                            import time
                            import re
                            match = re.search(r"try again in ([\d\.]+)s", str(e), re.IGNORECASE)
                            wait_time = float(match.group(1)) + 1.0 if match else (3.0 * (attempt + 1))
                            if verbose:
                                print(f"⏳ [Rate Limit Backoff] Waiting {wait_time:.1f}s before retry (Attempt {attempt+1}/{max_retries})...")
                            time.sleep(wait_time)
                        else:
                            raise e
                            
                if response is None:
                    raise RuntimeError(f"Rate limit reached after {max_retries} retries. Details: {last_error}")
            
                message = response.choices[0].message
                tool_calls = message.tool_calls

                # Case A: Model decided on one or more tool calls (Action Phase)
                if tool_calls:
                    # Add assistant intent to memory
                    self.memory.add_assistant_message(
                        content=message.content,
                        tool_calls=[tc.model_dump() for tc in tool_calls]
                    )
                    
                    for tool_call in tool_calls:
                        fn_name = tool_call.function.name
                        raw_args = tool_call.function.arguments
                        try:
                            args = json.loads(raw_args)
                        except Exception:
                            args = {}

                        if verbose:
                            print(f"\n⚙️  [Step {step_count} - Action] Calling Tool: `{fn_name}`")
                            print(f"    Arguments: {args}")

                        # Execute tool
                        tool_fn = TOOL_REGISTRY.get(fn_name)
                        if tool_fn:
                            try:
                                obs = tool_fn(**args)
                            except Exception as e:
                                obs = json.dumps({"error": f"Tool execution failed: {str(e)}"})
                        else:
                            obs = json.dumps({"error": f"Tool '{fn_name}' not found."})

                        if verbose:
                            # Print concise snippet of observation
                            short_obs = obs if len(obs) < 250 else obs[:240] + "... (truncated)"
                            print(f"👁️  [Step {step_count} - Observation]:\n    {short_obs.strip()}")

                        # Record trace
                        step_traces.append({
                            "step": step_count,
                            "action": fn_name,
                            "args": args,
                            "observation": obs
                        })

                        # Update memory with tool observation
                        self.memory.add_tool_message(
                            tool_call_id=tool_call.id,
                            name=fn_name,
                            content=obs
                        )

                # Case B: Model completed its plan and produced the final response
                else:
                    final_answer = message.content or ""
                    self.memory.add_assistant_message(content=final_answer)
                    if verbose:
                        print(f"\n🤖 [Step {step_count} - Final Answer]:\n{final_answer}\n")
                    break

            current_list = json.loads(get_packing_list())
            return {
                "response": final_answer,
                "traces": step_traces,
                "total_steps": step_count,
                "packing_list": current_list
            }
        except Exception as e:
            # Rollback memory on failure so failed turn does not corrupt message history
            self.memory.messages = self.memory.messages[:initial_msg_count]
            raise e
