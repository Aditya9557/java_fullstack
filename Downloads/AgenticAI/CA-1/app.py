"""
app.py - Web Server and API Backend for Smart Packing List Agent.

Runs a zero-dependency local web server (using Python's built-in http.server)
that serves the frontend UI and provides REST API endpoints for agent interactions.
"""

from __future__ import annotations
import http.server
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

# Ensure current directory is on path
current_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(current_dir))

from agent import SmartPackingAgent
from tools import get_packing_list, clear_packing_list

STATIC_DIR = current_dir / "static"


class AgentSession:
    """State manager holding active agent instance."""
    def __init__(self):
        self.agent = SmartPackingAgent()

    def reset(self):
        clear_packing_list()
        self.agent = SmartPackingAgent()


session = AgentSession()


class AgentRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom request handler serving static files and handling JSON API routes."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def do_POST(self):
        parsed_url = urlparse(self.path)
        
        # Route: /api/chat - Sends prompt to agent and returns response + traces + packing list
        if parsed_url.path == "/api/chat":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                data = json.loads(body)
                prompt = data.get("prompt", "").strip()
                if not prompt:
                    self._send_json({"error": "Prompt cannot be empty"}, status=400)
                    return
                
                # Execute agent turn
                result = session.agent.run_turn(prompt, verbose=True)
                self._send_json(result)
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
            return

        # Route: /api/reset - Resets conversation memory and packing list
        elif parsed_url.path == "/api/reset":
            session.reset()
            self._send_json({"status": "success", "message": "Session and memory reset."})
            return

        else:
            self._send_json({"error": "Endpoint not found"}, status=404)

    def do_GET(self):
        parsed_url = urlparse(self.path)
        
        # Route: /api/state - Returns current memory summary and packing list
        if parsed_url.path == "/api/state":
            packing_state = json.loads(get_packing_list())
            memory_summary = session.agent.memory.get_memory_summary()
            self._send_json({
                "packing_list": packing_state,
                "memory_summary": memory_summary,
                "trip_context": session.agent.memory.trip_context.to_dict()
            })
            return

        # Default static file serving (index.html, css, js)
        if parsed_url.path == "/":
            self.path = "/index.html"
        return super().do_GET()

    def _send_json(self, data: dict, status: int = 200):
        response_bytes = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(response_bytes)


def run_server(port: int = 5050):
    server_address = ("", port)
    httpd = http.server.HTTPServer(server_address, AgentRequestHandler)
    print(f"\n🚀 Smart Packing Agent Web UI is running at: http://localhost:{port}")
    print("Press Ctrl+C to stop the server.\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5050))
    run_server(port)
