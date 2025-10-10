#!/usr/bin/env python3
"""Memory Bank MCP Server - Persistent memory management"""

import json
import os
import sys
from datetime import datetime
from typing import Any
from pathlib import Path

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

MEMORY_PATH = Path(os.getenv("MEMORY_PATH", "/data/memories.json"))

class MemoryBank:
    def __init__(self):
        self.memories = self._load()

    def _load(self):
        if MEMORY_PATH.exists():
            with open(MEMORY_PATH) as f:
                return json.load(f)
        return []

    def _save(self):
        MEMORY_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(MEMORY_PATH, 'w') as f:
            json.dump(self.memories, f, indent=2)

    def store(self, content: str, tags: list = None, category: str = None, metadata: dict = None):
        memory = {
            "id": str(len(self.memories)),
            "content": content,
            "tags": tags or [],
            "category": category,
            "metadata": metadata or {},
            "created_at": datetime.now().isoformat()
        }
        self.memories.append(memory)
        self._save()
        return memory

    def recall(self, query: str, limit: int = 5):
        # Simple keyword matching (could be enhanced with embeddings)
        results = [m for m in self.memories if query.lower() in m["content"].lower()]
        return results[:limit]

    def forget(self, memory_id: str):
        self.memories = [m for m in self.memories if m["id"] != memory_id]
        self._save()

memory_bank = MemoryBank()
server = Server("memory-bank")

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(name="memory_store", description="Store information", inputSchema={
            "type": "object",
            "properties": {
                "content": {"type": "string"},
                "tags": {"type": "array", "items": {"type": "string"}},
                "category": {"type": "string"}
            },
            "required": ["content"]
        }),
        Tool(name="memory_recall", description="Recall memories", inputSchema={
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "limit": {"type": "number", "default": 5}
            },
            "required": ["query"]
        })
    ]

@server.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    if name == "memory_store":
        result = memory_bank.store(arguments["content"], arguments.get("tags"), arguments.get("category"))
        return [TextContent(type="text", text=f"Stored memory: {result['id']}")]
    elif name == "memory_recall":
        results = memory_bank.recall(arguments["query"], arguments.get("limit", 5))
        return [TextContent(type="text", text=json.dumps(results, indent=2))]
    raise ValueError(f"Unknown tool: {name}")

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
