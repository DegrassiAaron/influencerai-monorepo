#!/usr/bin/env python3
"""Playwright MCP Server - Browser automation and web scraping"""

import json
from typing import Any
import asyncio

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

try:
    from playwright.async_api import async_playwright, Browser, Page
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

server = Server("playwright")

# Global browser instance
browser: Browser = None
pages = {}

async def get_browser():
    """Get or create browser instance"""
    global browser
    if browser is None:
        if not PLAYWRIGHT_AVAILABLE:
            raise RuntimeError("Playwright not available")
        playwright = await async_playwright().start()
        browser = await playwright.chromium.launch(headless=True)
    return browser

async def get_page(page_id: str = "default") -> Page:
    """Get or create a page"""
    if page_id not in pages:
        browser = await get_browser()
        pages[page_id] = await browser.new_page()
    return pages[page_id]

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="browser_navigate",
            description="Navigate to a URL",
            inputSchema={
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "URL to navigate to"},
                    "page_id": {"type": "string", "description": "Page identifier", "default": "default"},
                    "wait_until": {
                        "type": "string",
                        "enum": ["load", "domcontentloaded", "networkidle"],
                        "default": "load"
                    }
                },
                "required": ["url"]
            }
        ),
        Tool(
            name="browser_screenshot",
            description="Take a screenshot of the current page",
            inputSchema={
                "type": "object",
                "properties": {
                    "page_id": {"type": "string", "default": "default"},
                    "selector": {"type": "string", "description": "CSS selector to screenshot"},
                    "full_page": {"type": "boolean", "default": False}
                }
            }
        ),
        Tool(
            name="browser_click",
            description="Click an element on the page",
            inputSchema={
                "type": "object",
                "properties": {
                    "selector": {"type": "string", "description": "CSS selector to click"},
                    "page_id": {"type": "string", "default": "default"}
                },
                "required": ["selector"]
            }
        ),
        Tool(
            name="browser_extract",
            description="Extract data from the page",
            inputSchema={
                "type": "object",
                "properties": {
                    "selector": {"type": "string", "description": "CSS selector"},
                    "attribute": {"type": "string", "description": "Attribute to extract (text, html, href, etc.)"},
                    "page_id": {"type": "string", "default": "default"},
                    "all": {"type": "boolean", "default": False, "description": "Extract all matching elements"}
                },
                "required": ["selector"]
            }
        ),
        Tool(
            name="browser_fill",
            description="Fill a form field",
            inputSchema={
                "type": "object",
                "properties": {
                    "selector": {"type": "string", "description": "CSS selector for input"},
                    "value": {"type": "string", "description": "Value to fill"},
                    "page_id": {"type": "string", "default": "default"}
                },
                "required": ["selector", "value"]
            }
        ),
        Tool(
            name="browser_close",
            description="Close a browser page",
            inputSchema={
                "type": "object",
                "properties": {
                    "page_id": {"type": "string", "default": "default"}
                }
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    if not PLAYWRIGHT_AVAILABLE:
        return [TextContent(
            type="text",
            text="Playwright not available. Install with: pip install playwright && playwright install"
        )]

    try:
        if name == "browser_navigate":
            page = await get_page(arguments.get("page_id", "default"))
            await page.goto(
                arguments["url"],
                wait_until=arguments.get("wait_until", "load")
            )
            title = await page.title()
            return [TextContent(
                type="text",
                text=f"Navigated to: {arguments['url']}\nTitle: {title}"
            )]

        elif name == "browser_screenshot":
            page = await get_page(arguments.get("page_id", "default"))
            selector = arguments.get("selector")

            if selector:
                element = await page.query_selector(selector)
                screenshot = await element.screenshot()
            else:
                screenshot = await page.screenshot(
                    full_page=arguments.get("full_page", False)
                )

            # Return base64 encoded screenshot
            import base64
            encoded = base64.b64encode(screenshot).decode()
            return [TextContent(
                type="text",
                text=f"Screenshot captured ({len(screenshot)} bytes)\nBase64: {encoded[:100]}..."
            )]

        elif name == "browser_click":
            page = await get_page(arguments.get("page_id", "default"))
            await page.click(arguments["selector"])
            return [TextContent(
                type="text",
                text=f"Clicked element: {arguments['selector']}"
            )]

        elif name == "browser_extract":
            page = await get_page(arguments.get("page_id", "default"))
            selector = arguments["selector"]
            attribute = arguments.get("attribute", "text")

            if arguments.get("all", False):
                elements = await page.query_selector_all(selector)
                results = []
                for element in elements:
                    if attribute == "text":
                        value = await element.text_content()
                    elif attribute == "html":
                        value = await element.inner_html()
                    else:
                        value = await element.get_attribute(attribute)
                    results.append(value)
                return [TextContent(
                    type="text",
                    text=json.dumps(results, indent=2)
                )]
            else:
                element = await page.query_selector(selector)
                if not element:
                    return [TextContent(type="text", text=f"Element not found: {selector}")]

                if attribute == "text":
                    value = await element.text_content()
                elif attribute == "html":
                    value = await element.inner_html()
                else:
                    value = await element.get_attribute(attribute)

                return [TextContent(type="text", text=str(value))]

        elif name == "browser_fill":
            page = await get_page(arguments.get("page_id", "default"))
            await page.fill(arguments["selector"], arguments["value"])
            return [TextContent(
                type="text",
                text=f"Filled {arguments['selector']} with value"
            )]

        elif name == "browser_close":
            page_id = arguments.get("page_id", "default")
            if page_id in pages:
                await pages[page_id].close()
                del pages[page_id]
                return [TextContent(type="text", text=f"Closed page: {page_id}")]
            return [TextContent(type="text", text=f"Page not found: {page_id}")]

    except Exception as e:
        return [TextContent(type="text", text=f"Error: {str(e)}")]

    raise ValueError(f"Unknown tool: {name}")

async def main():
    async with stdio_server() as (read_stream, write_stream):
        try:
            await server.run(read_stream, write_stream, server.create_initialization_options())
        finally:
            # Cleanup
            global browser
            if browser:
                await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
