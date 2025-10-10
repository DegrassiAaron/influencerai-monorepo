#!/usr/bin/env python3
"""Knowledge Graph MCP Server - Graph-based knowledge management"""

import json
import os
from typing import Any
from datetime import datetime

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams, PointStruct
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

server = Server("knowledge-graph")

# Configuration
QDRANT_URL = os.getenv("QDRANT_URL", "http://qdrant:6333")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "knowledge_graph")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

# Initialize clients
qdrant_client = None
if QDRANT_AVAILABLE:
    try:
        qdrant_client = QdrantClient(url=QDRANT_URL)
    except Exception as e:
        print(f"Qdrant connection failed: {e}")

if OPENROUTER_API_KEY and OPENAI_AVAILABLE:
    openai.api_key = OPENROUTER_API_KEY
    openai.api_base = "https://openrouter.ai/api/v1"

# In-memory graph storage (simple implementation)
knowledge_graph = {
    "entities": {},
    "relations": []
}

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="kg_add_entity",
            description="Add entity to knowledge graph",
            inputSchema={
                "type": "object",
                "properties": {
                    "entity": {"type": "string", "description": "Entity name/ID"},
                    "type": {"type": "string", "description": "Entity type (person, concept, event, etc.)"},
                    "properties": {"type": "object", "description": "Additional properties"}
                },
                "required": ["entity", "type"]
            }
        ),
        Tool(
            name="kg_add_relation",
            description="Add relation between entities in the graph",
            inputSchema={
                "type": "object",
                "properties": {
                    "from_entity": {"type": "string", "description": "Source entity"},
                    "relation": {"type": "string", "description": "Relation type (knows, related_to, causes, etc.)"},
                    "to_entity": {"type": "string", "description": "Target entity"},
                    "properties": {"type": "object", "description": "Relation metadata"}
                },
                "required": ["from_entity", "relation", "to_entity"]
            }
        ),
        Tool(
            name="kg_query",
            description="Query knowledge graph for entities and relations",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Query string (entity name or pattern)"},
                    "query_type": {
                        "type": "string",
                        "enum": ["entity", "relation", "path"],
                        "default": "entity",
                        "description": "Type of query"
                    },
                    "limit": {"type": "number", "default": 10, "description": "Max results"}
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="kg_get_neighbors",
            description="Get neighboring entities (connected by relations)",
            inputSchema={
                "type": "object",
                "properties": {
                    "entity": {"type": "string", "description": "Entity to find neighbors for"},
                    "depth": {"type": "number", "default": 1, "description": "Search depth (hops)"}
                },
                "required": ["entity"]
            }
        ),
        Tool(
            name="kg_stats",
            description="Get knowledge graph statistics",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    if name == "kg_add_entity":
        entity_id = arguments["entity"]
        entity_data = {
            "type": arguments["type"],
            "properties": arguments.get("properties", {}),
            "created_at": datetime.now().isoformat()
        }
        knowledge_graph["entities"][entity_id] = entity_data

        return [TextContent(
            type="text",
            text=f"Added entity '{entity_id}' of type '{entity_data['type']}'"
        )]

    elif name == "kg_add_relation":
        from_entity = arguments["from_entity"]
        to_entity = arguments["to_entity"]
        relation = arguments["relation"]

        # Check if entities exist
        if from_entity not in knowledge_graph["entities"]:
            return [TextContent(
                type="text",
                text=f"Error: Entity '{from_entity}' not found. Add it first with kg_add_entity."
            )]
        if to_entity not in knowledge_graph["entities"]:
            return [TextContent(
                type="text",
                text=f"Error: Entity '{to_entity}' not found. Add it first with kg_add_entity."
            )]

        relation_data = {
            "from": from_entity,
            "relation": relation,
            "to": to_entity,
            "properties": arguments.get("properties", {}),
            "created_at": datetime.now().isoformat()
        }
        knowledge_graph["relations"].append(relation_data)

        return [TextContent(
            type="text",
            text=f"Added relation: {from_entity} --[{relation}]--> {to_entity}"
        )]

    elif name == "kg_query":
        query = arguments["query"].lower()
        query_type = arguments.get("query_type", "entity")
        limit = arguments.get("limit", 10)

        results = []

        if query_type == "entity":
            for entity_id, entity_data in knowledge_graph["entities"].items():
                if query in entity_id.lower() or query in entity_data["type"].lower():
                    results.append({
                        "id": entity_id,
                        "type": entity_data["type"],
                        "properties": entity_data["properties"]
                    })
                    if len(results) >= limit:
                        break

        elif query_type == "relation":
            for rel in knowledge_graph["relations"]:
                if query in rel["relation"].lower():
                    results.append({
                        "from": rel["from"],
                        "relation": rel["relation"],
                        "to": rel["to"]
                    })
                    if len(results) >= limit:
                        break

        return [TextContent(
            type="text",
            text=json.dumps({"query": arguments["query"], "results": results}, indent=2)
        )]

    elif name == "kg_get_neighbors":
        entity = arguments["entity"]
        depth = arguments.get("depth", 1)

        if entity not in knowledge_graph["entities"]:
            return [TextContent(
                type="text",
                text=f"Error: Entity '{entity}' not found"
            )]

        neighbors = set()
        current_level = {entity}

        for _ in range(depth):
            next_level = set()
            for rel in knowledge_graph["relations"]:
                if rel["from"] in current_level:
                    neighbors.add(rel["to"])
                    next_level.add(rel["to"])
                if rel["to"] in current_level:
                    neighbors.add(rel["from"])
                    next_level.add(rel["from"])
            current_level = next_level

        neighbors.discard(entity)  # Remove self

        neighbor_data = []
        for neighbor in neighbors:
            if neighbor in knowledge_graph["entities"]:
                neighbor_data.append({
                    "id": neighbor,
                    "type": knowledge_graph["entities"][neighbor]["type"]
                })

        return [TextContent(
            type="text",
            text=json.dumps({
                "entity": entity,
                "depth": depth,
                "neighbors": neighbor_data
            }, indent=2)
        )]

    elif name == "kg_stats":
        stats = {
            "entities_count": len(knowledge_graph["entities"]),
            "relations_count": len(knowledge_graph["relations"]),
            "entity_types": {},
            "relation_types": {}
        }

        # Count entity types
        for entity_data in knowledge_graph["entities"].values():
            entity_type = entity_data["type"]
            stats["entity_types"][entity_type] = stats["entity_types"].get(entity_type, 0) + 1

        # Count relation types
        for rel in knowledge_graph["relations"]:
            rel_type = rel["relation"]
            stats["relation_types"][rel_type] = stats["relation_types"].get(rel_type, 0) + 1

        return [TextContent(
            type="text",
            text=json.dumps(stats, indent=2)
        )]

    raise ValueError(f"Unknown tool: {name}")

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
