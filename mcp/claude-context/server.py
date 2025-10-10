#!/usr/bin/env python3
"""Claude Context MCP Server - Conversational context management"""

import json
import os
from pathlib import Path
from typing import Any
from datetime import datetime

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

CONTEXT_PATH = Path(os.getenv("CONTEXT_PATH", "/data"))

server = Server("claude-context")

class ContextManager:
    def __init__(self):
        CONTEXT_PATH.mkdir(parents=True, exist_ok=True)

    def save_context(self, name: str, content: str, metadata: dict = None):
        """Save a context to file"""
        context = {
            "name": name,
            "content": content,
            "metadata": metadata or {},
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }

        file_path = CONTEXT_PATH / f"{name}.json"
        with open(file_path, 'w') as f:
            json.dump(context, f, indent=2)

        return context

    def load_context(self, name: str):
        """Load a context from file"""
        file_path = CONTEXT_PATH / f"{name}.json"
        if not file_path.exists():
            raise FileNotFoundError(f"Context '{name}' not found")

        with open(file_path, 'r') as f:
            return json.load(f)

    def merge_contexts(self, names: list[str], merged_name: str):
        """Merge multiple contexts into one"""
        contexts = []
        for name in names:
            try:
                ctx = self.load_context(name)
                contexts.append(ctx)
            except FileNotFoundError:
                pass

        if not contexts:
            raise ValueError("No valid contexts found to merge")

        merged_content = "\n\n---\n\n".join([ctx["content"] for ctx in contexts])
        merged_metadata = {
            "source_contexts": names,
            "merged_at": datetime.now().isoformat()
        }

        return self.save_context(merged_name, merged_content, merged_metadata)

    def search_contexts(self, query: str, limit: int = 5):
        """Search contexts by keyword"""
        results = []
        for file_path in CONTEXT_PATH.glob("*.json"):
            try:
                with open(file_path, 'r') as f:
                    context = json.load(f)
                    if query.lower() in context["content"].lower():
                        results.append({
                            "name": context["name"],
                            "snippet": context["content"][:200] + "...",
                            "created_at": context["created_at"]
                        })
            except (json.JSONDecodeError, KeyError):
                continue

        return results[:limit]

context_manager = ContextManager()

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="context_save",
            description="Save a context for later retrieval",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Context name/identifier"},
                    "content": {"type": "string", "description": "Context content to save"},
                    "metadata": {"type": "object", "description": "Optional metadata"}
                },
                "required": ["name", "content"]
            }
        ),
        Tool(
            name="context_load",
            description="Load a previously saved context",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Context name to load"}
                },
                "required": ["name"]
            }
        ),
        Tool(
            name="context_merge",
            description="Merge multiple contexts into one",
            inputSchema={
                "type": "object",
                "properties": {
                    "names": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of context names to merge"
                    },
                    "merged_name": {"type": "string", "description": "Name for merged context"}
                },
                "required": ["names", "merged_name"]
            }
        ),
        Tool(
            name="context_search",
            description="Search for contexts containing a keyword",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "limit": {"type": "number", "default": 5, "description": "Max results"}
                },
                "required": ["query"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    if name == "context_save":
        result = context_manager.save_context(
            arguments["name"],
            arguments["content"],
            arguments.get("metadata")
        )
        return [TextContent(
            type="text",
            text=f"Saved context '{result['name']}' with {len(result['content'])} characters"
        )]

    elif name == "context_load":
        context = context_manager.load_context(arguments["name"])
        return [TextContent(
            type="text",
            text=json.dumps(context, indent=2)
        )]

    elif name == "context_merge":
        result = context_manager.merge_contexts(
            arguments["names"],
            arguments["merged_name"]
        )
        return [TextContent(
            type="text",
            text=f"Merged {len(arguments['names'])} contexts into '{result['name']}'"
        )]

    elif name == "context_search":
        results = context_manager.search_contexts(
            arguments["query"],
            arguments.get("limit", 5)
        )
        return [TextContent(
            type="text",
            text=json.dumps(results, indent=2)
        )]

    raise ValueError(f"Unknown tool: {name}")

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
