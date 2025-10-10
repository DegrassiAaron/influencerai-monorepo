#!/usr/bin/env python3
"""Sequential Thinking MCP Server - Step-by-step reasoning"""

import json
from typing import Any
from datetime import datetime

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

server = Server("sequential-thinking")

# Store for reasoning chains
reasoning_chains = {}

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="sequential_start",
            description="Start a new sequential reasoning chain",
            inputSchema={
                "type": "object",
                "properties": {
                    "task": {"type": "string", "description": "The task to reason about"},
                    "chain_id": {"type": "string", "description": "Optional chain ID"}
                },
                "required": ["task"]
            }
        ),
        Tool(
            name="sequential_step",
            description="Add a reasoning step to an existing chain",
            inputSchema={
                "type": "object",
                "properties": {
                    "chain_id": {"type": "string", "description": "Chain ID"},
                    "step": {"type": "string", "description": "Reasoning step"},
                    "observation": {"type": "string", "description": "Optional observation"}
                },
                "required": ["chain_id", "step"]
            }
        ),
        Tool(
            name="sequential_conclude",
            description="Conclude a reasoning chain with final answer",
            inputSchema={
                "type": "object",
                "properties": {
                    "chain_id": {"type": "string", "description": "Chain ID"},
                    "conclusion": {"type": "string", "description": "Final conclusion"}
                },
                "required": ["chain_id", "conclusion"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    if name == "sequential_start":
        chain_id = arguments.get("chain_id", f"chain_{len(reasoning_chains)}")
        reasoning_chains[chain_id] = {
            "task": arguments["task"],
            "steps": [],
            "started_at": datetime.now().isoformat(),
            "status": "active"
        }
        return [TextContent(
            type="text",
            text=f"Started reasoning chain '{chain_id}' for task: {arguments['task']}"
        )]

    elif name == "sequential_step":
        chain_id = arguments["chain_id"]
        if chain_id not in reasoning_chains:
            raise ValueError(f"Chain {chain_id} not found")

        step = {
            "step": arguments["step"],
            "observation": arguments.get("observation", ""),
            "timestamp": datetime.now().isoformat()
        }
        reasoning_chains[chain_id]["steps"].append(step)

        return [TextContent(
            type="text",
            text=f"Added step {len(reasoning_chains[chain_id]['steps'])} to chain '{chain_id}'"
        )]

    elif name == "sequential_conclude":
        chain_id = arguments["chain_id"]
        if chain_id not in reasoning_chains:
            raise ValueError(f"Chain {chain_id} not found")

        reasoning_chains[chain_id]["conclusion"] = arguments["conclusion"]
        reasoning_chains[chain_id]["status"] = "completed"
        reasoning_chains[chain_id]["completed_at"] = datetime.now().isoformat()

        # Format the full chain
        chain = reasoning_chains[chain_id]
        result = f"## Reasoning Chain: {chain['task']}\n\n"
        for i, step in enumerate(chain['steps'], 1):
            result += f"**Step {i}:** {step['step']}\n"
            if step['observation']:
                result += f"*Observation:* {step['observation']}\n"
            result += "\n"
        result += f"**Conclusion:** {chain['conclusion']}\n"

        return [TextContent(type="text", text=result)]

    raise ValueError(f"Unknown tool: {name}")

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
