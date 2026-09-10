# CA-1 Project: Smart Packing List Agent (Topic T11 - Travel)

**Course**: CSE476 Agentic AI and Intelligent Automation  
**Topic**: T11. Smart Packing List Agent [Travel]  
**Mode**: Solo Project  
**Provider**: Groq (`qwen/qwen3.6-27b`)  

---

### 1. Tools Used by the Agent
The agent is equipped with two primary callable tools: `check_weather(city: str)` and `add_item(item: str, category: str, quantity: int)`. Instead of guessing or hallucinating local temperatures, the agent dynamically invokes `check_weather` whenever a destination is identified to fetch live Celsius temperature, weather conditions (such as rain or cold), precipitation chances, and clothing hints. Based on these observed conditions combined with the trip purpose (e.g. business conference, vacation, trekking), the agent decides exactly what gear is required and invokes `add_item` across structured categories (`Clothing`, `Weather Gear`, `Work & Electronics`, `Toiletries & Meds`, `Trekking & Outdoor`) to populate the persistent packing state.

### 2. What the Memory Does
Memory in this agent is managed through `SessionMemory`, maintaining both the ongoing conversation message history (including assistant reasoning intents, tool calls, and tool execution observations) and persistent trip metadata (destination, trip duration, detected weather, and the categorized packing list). This allows the agent to maintain full context across conversational turns. When a user asks follow-up questions (e.g., *"What rain protection did you pack for me?"* or *"I am staying 2 extra days to go trekking; what else do I need?"*), the agent reads back its previous memory rather than repeating redundant weather tool calls, ensuring consistent, multi-turn plan adjustments without losing earlier items.

### 3. Honest Failure and How It Was Handled
During initial testing, when given a combined multi-requirement query (*"I'm going to Shimla for 3 days for a conference, pack my bags"*), the model occasionally attempted to generate the complete packing list in plain conversational text in a single step without invoking the `check_weather` or `add_item` tools first. To solve this failure mode, we strengthened the agentic system prompt with explicit Plan-and-Act decision rules requiring tool verification prior to recommendation, configured structured JSON tool schemas with clear enum categories, and implemented a multi-step evaluation loop in `agent.py` that checks for tool execution completion before generating the final user-facing response.

---

### Quick Start

1. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```
2. Set your Groq API Key in `.env`:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   MODEL=qwen/qwen3.6-27b
   ```
3. Run the interactive notebook demo:
   ```bash
   jupyter notebook demo.ipynb
   ```
