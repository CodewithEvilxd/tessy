# Tessy Plugins & AI Connectors

Manifests and skills for connecting AI coding assistants and chat apps to your Tessy instance.

## Directory Structure

| Directory / File | Target Ecosystem | Details |
|---|---|---|
| `.claude-plugin/` | Claude Code | Skills and prompt hooks |
| `.cursor-plugin/` | Cursor | Extension manifest and prompt definitions |
| `skills/make-a-page/` | Agent Skills | Canonical prompt skill for AI agents |
| `openai/` | ChatGPT / OpenAI | Agent plugin manifest, icons, and test cases |
| `gemini/` | Google Gemini CLI / IDE | MCP server extension definition |
| `lhm/` | LM Studio / LHM | Local model plugin manifest |
| `mcp.json` / `.mcp.json` | Model Context Protocol | Generic Streamable HTTP MCP config |

## MCP Endpoint

Every connector points to your Tessy MCP server:
```
https://tessy.page/api/mcp
```
For self-hosted instances, replace with `https://YOUR-DOMAIN/api/mcp`.

