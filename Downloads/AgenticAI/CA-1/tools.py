"""
tools.py - Tools for the T11 Smart Packing List Agent.

This module provides the two required tools (plus helpers):
1. check_weather(city: str) -> dict: Fetches or calculates forecast conditions for a destination.
2. add_item(item: str, category: str, quantity: int) -> dict: Adds an item to the session packing list.
3. add_items_batch(items: list) -> dict: Adds multiple items in a single tool call for efficiency.
4. get_packing_list() -> dict: Returns current packed items grouped by category.
"""

from __future__ import annotations
import json
from typing import Any, Dict, List

# Global in-memory packing storage
_PACKING_LIST: Dict[str, List[Dict[str, Any]]] = {}

# City climate heuristics fallback when offline / no external API
_KNOWN_CITY_WEATHER: Dict[str, Dict[str, Any]] = {
    "shimla": {
        "city": "Shimla, India",
        "temp_c": 9,
        "condition": "Cold & Rainy",
        "humidity": "82%",
        "rain_probability": "75%",
        "wind": "14 km/h",
        "clothing_hint": "Heavy winter layers, thermal innerwear, waterproof jacket / umbrella, waterproof boots.",
    },
    "manali": {
        "city": "Manali, India",
        "temp_c": 6,
        "condition": "Chilly with Evening Showers",
        "humidity": "88%",
        "rain_probability": "60%",
        "wind": "10 km/h",
        "clothing_hint": "Fleece jacket, thermal innerwear, gloves, sturdy hiking boots, umbrella.",
    },
    "goa": {
        "city": "Goa, India",
        "temp_c": 31,
        "condition": "Sunny & Humid",
        "humidity": "78%",
        "rain_probability": "15%",
        "wind": "18 km/h",
        "clothing_hint": "Breathable cotton/linen clothes, swimwear, sunhat, sunglasses, sunscreen (SPF 50).",
    },
    "katra": {
        "city": "Katra, Jammu & Kashmir, India",
        "temp_c": 19,
        "condition": "Pleasant with Cool Mountain Breeze",
        "humidity": "55%",
        "rain_probability": "20%",
        "wind": "12 km/h",
        "clothing_hint": "Formal / smart-casual layers, walking shoes, light jacket or blazer for evening.",
    },
    "jammu": {
        "city": "Jammu, India",
        "temp_c": 24,
        "condition": "Clear & Sunny",
        "humidity": "48%",
        "rain_probability": "10%",
        "wind": "10 km/h",
        "clothing_hint": "Light business shirts, blazer for conference, sunglasses, comfortable walking shoes.",
    },
    "london": {
        "city": "London, UK",
        "temp_c": 12,
        "condition": "Overcast & Drizzly",
        "humidity": "85%",
        "rain_probability": "70%",
        "wind": "22 km/h",
        "clothing_hint": "Trench coat / rain jacket, compact umbrella, comfortable walking shoes, layerable sweater.",
    },
    "paris": {
        "city": "Paris, France",
        "temp_c": 16,
        "condition": "Mild & Breezy",
        "humidity": "65%",
        "rain_probability": "30%",
        "wind": "15 km/h",
        "clothing_hint": "Light jacket or trench, smart casual outfits, scarf, walking shoes.",
    },
    "dubai": {
        "city": "Dubai, UAE",
        "temp_c": 38,
        "condition": "Hot & Sunny",
        "humidity": "45%",
        "rain_probability": "0%",
        "wind": "12 km/h",
        "clothing_hint": "Lightweight breathable fabrics, sunglasses, hydration essentials, light cardigan for AC.",
    },
    "tokyo": {
        "city": "Tokyo, Japan",
        "temp_c": 19,
        "condition": "Clear & Pleasant",
        "humidity": "55%",
        "rain_probability": "20%",
        "wind": "11 km/h",
        "clothing_hint": "Layers, light jacket, slip-on shoes for temple visits, portable charger.",
    },
    "new york": {
        "city": "New York, USA",
        "temp_c": 14,
        "condition": "Crisp & Windy",
        "humidity": "50%",
        "rain_probability": "25%",
        "wind": "24 km/h",
        "clothing_hint": "Windbreaker or medium coat, comfortable sneakers, cross-body bag.",
    },
}


def check_weather(city: str) -> str:
    """
    Look up current weather forecast and temperature for a given city.
    
    Args:
        city: The name of the destination city (e.g., 'Shimla', 'London', 'Goa').
        
    Returns:
        JSON string containing temperature in Celsius, weather condition, rain chance, and clothing hints.
    """
    clean_city = city.strip().lower()
    
    for key, data in _KNOWN_CITY_WEATHER.items():
        if key in clean_city or clean_city in key:
            return json.dumps(data, indent=2)
            
    fallback_data = {
        "city": city.title(),
        "temp_c": 22,
        "condition": "Partly Cloudy with Possible Showers",
        "humidity": "60%",
        "rain_probability": "40%",
        "wind": "15 km/h",
        "clothing_hint": "Moderate temperature layers, carry a light sweater and a compact umbrella.",
    }
    return json.dumps(fallback_data, indent=2)


def add_item(item: str, category: str = "General", quantity: int = 1) -> str:
    """
    Add a single item to the traveler's packing list under a specified category.
    
    Args:
        item: The name of the item to pack (e.g., 'Waterproof Rain Jacket', 'Laptop & Charger', 'Formal Blazer').
        category: The category (e.g., 'Clothing', 'Weather Gear', 'Work & Electronics', 'Toiletries & Meds', 'Trekking & Outdoor').
        quantity: The number of units to pack (defaults to 1).
        
    Returns:
        JSON string with confirmation status and updated item count.
    """
    cat_key = category.strip()
    item_clean = item.strip()
    
    if cat_key not in _PACKING_LIST:
        _PACKING_LIST[cat_key] = []
        
    for existing in _PACKING_LIST[cat_key]:
        if existing["item"].lower() == item_clean.lower():
            existing["quantity"] += quantity
            return json.dumps({
                "status": "updated",
                "message": f"Updated quantity for '{item_clean}' to {existing['quantity']} under '{cat_key}'.",
                "category": cat_key,
                "item": item_clean,
                "quantity": existing["quantity"]
            })
            
    _PACKING_LIST[cat_key].append({
        "item": item_clean,
        "quantity": max(1, quantity)
    })
    
    total_items = sum(len(items) for items in _PACKING_LIST.values())
    return json.dumps({
        "status": "added",
        "message": f"Added '{item_clean}' (qty: {quantity}) to '{cat_key}'.",
        "category": cat_key,
        "item": item_clean,
        "quantity": quantity,
        "total_unique_items": total_items
    })


def add_items_batch(items: List[Dict[str, Any]]) -> str:
    """
    Add multiple items to the packing list in one operation.
    
    Args:
        items: List of dictionaries, each with 'item', 'category', and optional 'quantity'.
        
    Returns:
        JSON string confirming total items added.
    """
    results = []
    for entry in items:
        name = entry.get("item", "")
        cat = entry.get("category", "General")
        qty = entry.get("quantity", 1)
        if name:
            res = json.loads(add_item(item=name, category=cat, quantity=qty))
            results.append(res["message"])
            
    return json.dumps({
        "status": "batch_added",
        "items_processed": len(results),
        "messages": results
    }, indent=2)


def get_packing_list() -> str:
    """
    Retrieve all packed items grouped by category.
    
    Returns:
        JSON string representing the full categorized packing list.
    """
    total_items = sum(sum(it["quantity"] for it in items) for items in _PACKING_LIST.values())
    return json.dumps({
        "total_items_count": total_items,
        "categories": _PACKING_LIST
    }, indent=2)


def clear_packing_list() -> str:
    """Reset the packing list for a new trip session."""
    _PACKING_LIST.clear()
    return json.dumps({"status": "cleared", "message": "Packing list has been reset."})


# Tool Schema definitions for OpenAI / Groq Tool Calling API
TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "check_weather",
            "description": "Check the current weather forecast, temperature in Celsius, precipitation risk, and clothing hints for a travel destination.",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "The destination city name (e.g. 'Shimla', 'London', 'Goa', 'Paris')."
                    }
                },
                "required": ["city"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_item",
            "description": "Add an item to the traveler's packing list with category and quantity.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item": {
                        "type": "string",
                        "description": "Name of the item to pack (e.g. 'Heavy Winter Jacket', 'Umbrella', 'Formal Suit', 'Hiking Boots')."
                    },
                    "category": {
                        "type": "string",
                        "enum": ["Clothing", "Weather Gear", "Work & Electronics", "Toiletries & Meds", "Trekking & Outdoor", "Documents & Money", "General"],
                        "description": "Category for organizing the packed item."
                    },
                    "quantity": {
                        "type": "integer",
                        "description": "Number of units to pack (e.g. 1, 2, 3)."
                    }
                },
                "required": ["item", "category"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_packing_list",
            "description": "Get the current structured packing list with all packed categories, items, and quantities.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    }
]

# Function registry mapping tool names to callable Python functions
TOOL_REGISTRY = {
    "check_weather": check_weather,
    "add_item": add_item,
    "get_packing_list": get_packing_list,
}
