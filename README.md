# SOP-Guidelines
This folder will store finance related and internal control related SOP

## MCP Integration

This project is configured to use the [Gamma](https://gamma.app) MCP server for
generating SOP documents and presentations. The configuration lives in
[`.mcp.json`](./.mcp.json):

| Server | Type | URL |
| ------ | ---- | --------------------------- |
| gamma  | http | `https://mcp.gamma.app/mcp` |

When you open this repo in Claude Code, you'll be prompted to approve the
project-scoped MCP server before its tools become available. Authentication is
handled by the Gamma MCP server on first use.
