#!/usr/bin/env python3
"""Magic MCP Server - AI-powered utilities and transformations"""

import json
import os
from typing import Any

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

server = Server("magic")

# Configure OpenRouter API
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
if OPENROUTER_API_KEY and OPENAI_AVAILABLE:
    openai.api_key = OPENROUTER_API_KEY
    openai.api_base = "https://openrouter.ai/api/v1"

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="magic_transform",
            description="Transform data using AI-powered pattern matching",
            inputSchema={
                "type": "object",
                "properties": {
                    "data": {"type": "string", "description": "Data to transform"},
                    "transformation": {"type": "string", "description": "Transformation description"},
                    "format": {"type": "string", "description": "Output format", "default": "text"}
                },
                "required": ["data", "transformation"]
            }
        ),
        Tool(
            name="magic_analyze",
            description="Analyze patterns and structure in data",
            inputSchema={
                "type": "object",
                "properties": {
                    "data": {"type": "string", "description": "Data to analyze"},
                    "analysis_type": {
                        "type": "string",
                        "enum": ["structure", "pattern", "sentiment", "summary"],
                        "description": "Type of analysis"
                    }
                },
                "required": ["data", "analysis_type"]
            }
        ),
        Tool(
            name="magic_generate",
            description="Generate code or content based on description",
            inputSchema={
                "type": "object",
                "properties": {
                    "description": {"type": "string", "description": "What to generate"},
                    "language": {"type": "string", "description": "Programming language or format"},
                    "style": {"type": "string", "description": "Style guidelines"}
                },
                "required": ["description"]
            }
        ),
        Tool(
            name="magic_execute",
            description="Execute advanced AI-powered operations",
            inputSchema={
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "Command to execute"},
                    "parameters": {"type": "object", "description": "Command parameters"}
                },
                "required": ["command"]
            }
        )
    ]

async def call_ai(prompt: str, system_message: str = "") -> str:
    """Call AI API if available, otherwise return placeholder"""
    if not OPENAI_AVAILABLE or not OPENROUTER_API_KEY:
        return f"[AI unavailable - would process: {prompt[:100]}...]"

    try:
        messages = []
        if system_message:
            messages.append({"role": "system", "content": system_message})
        messages.append({"role": "user", "content": prompt})

        response = openai.ChatCompletion.create(
            model="anthropic/claude-3-haiku",
            messages=messages,
            max_tokens=1000
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"[AI error: {str(e)}]"

@server.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    if name == "magic_transform":
        prompt = f"""Transform the following data according to these instructions:

Data:
{arguments['data']}

Transformation:
{arguments['transformation']}

Output format: {arguments.get('format', 'text')}"""

        result = await call_ai(prompt, "You are a data transformation expert.")
        return [TextContent(type="text", text=result)]

    elif name == "magic_analyze":
        analysis_prompts = {
            "structure": "Analyze and describe the structure of this data:",
            "pattern": "Identify patterns and trends in this data:",
            "sentiment": "Analyze the sentiment and tone of this text:",
            "summary": "Provide a concise summary of this data:"
        }

        analysis_type = arguments["analysis_type"]
        prompt = f"{analysis_prompts[analysis_type]}\n\n{arguments['data']}"

        result = await call_ai(prompt, f"You are a {analysis_type} analysis expert.")
        return [TextContent(type="text", text=result)]

    elif name == "magic_generate":
        prompt = f"""Generate {arguments.get('language', 'content')} based on this description:

{arguments['description']}

Style: {arguments.get('style', 'clear and concise')}"""

        result = await call_ai(prompt, "You are a code and content generation expert.")
        return [TextContent(type="text", text=result)]

    elif name == "magic_execute":
        command = arguments["command"]
        params = arguments.get("parameters", {})

        # Simple command execution (can be extended)
        if command == "reverse":
            text = params.get("text", "")
            return [TextContent(type="text", text=text[::-1])]
        elif command == "count_words":
            text = params.get("text", "")
            count = len(text.split())
            return [TextContent(type="text", text=f"Word count: {count}")]
        elif command == "to_json":
            data = params.get("data", {})
            return [TextContent(type="text", text=json.dumps(data, indent=2))]
        else:
            return [TextContent(type="text", text=f"Unknown command: {command}")]

    raise ValueError(f"Unknown tool: {name}")

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
