# Will update soon.

### Prerequisites

- Node.js (LTS recommended)
- Docker (for running Ollama and the Atlassian MCP tool)
- Ollama installed and running locally
- A PostgreSQL database (Docker or local instance)
- Access to a Jira instance (for Atlassian integration)

# .env

`OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3 # Or another chat model you prefer
DATABASE_URL=postgresql://user:password@localhost:5432/mydatabase
JIRA_BASE_URL="[https://your-company.atlassian.net](https://your-company.atlassian.net)"
JIRA_API_TOKEN="YOUR_JIRA_API_TOKEN_HERE"
JIRA_USER_EMAIL="your_email@example.com"`

# To see available commands

npx mcp-cli -h

##

Project Structure
src/cli/: Contains the CLI commands that users interact with.
src/cli/commands/: Each file here defines a new CLI command (e.g., interact.command.ts).
src/services/: Core business logic and integrations (e.g., ollama.service.ts for LLM communication, database.service.ts for DB).
src/tools.ts: Defines the MCP tools exposed by your main server. These are the capabilities the LLM can use.
src/resources.ts: Defines MCP resources, which are static or dynamic data points the LLM might query.
src/server.ts: The main MCP server application that registers tools and resources, including federating external MCP servers.
