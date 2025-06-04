# MCP Server Implementation

This repository contains a TypeScript implementation of a Model Context Protocol (MCP) server. The server demonstrates how to create a custom MCP server that provides tools for interacting with a database and performing web searches.

## Overview

The Model Context Protocol (MCP) is an open standard framework for standardizing how AI models interact with external tools and data sources. This implementation provides a practical example of creating an MCP server with custom tools.

## Features

- **Employee Database Management**
  - Get all employees
  - Search employees by department
  - Search employees by name
  - SQLite in-memory database with sample data

- **Web Search Integration**
  - DuckDuckGo API integration
  - Structured search results
  - Rich metadata support

- **MCP Protocol Support**
  - Session management
  - Tool registration
  - JSON-RPC 2.0 communication
  - SSE (Server-Sent Events) support

## Tools

The server implements three main tools:

1. **get_employees**
   - Description: Retrieves all employees from the database
   - Input: None required
   - Output: List of employees with their details

2. **search_employees**
   - Description: Searches employees by department or name
   - Input: Optional department and/or name parameters
   - Output: Filtered list of matching employees

3. **web_search**
   - Description: Performs web searches using DuckDuckGo
   - Input: Search query string
   - Output: Structured search results with metadata

## API Endpoints

- `POST /mcp` - Main endpoint for all MCP communications
  - Handles initialization, tool listing, and tool calls
  - Supports session management
  - Returns JSON-RPC 2.0 responses

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone [your-repo-url]
   cd [repo-name]
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm run dev
   ```

### Example Usage

1. Initialize a session:
   ```bash
   curl -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'
   ```

2. List available tools:
   ```bash
   curl -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -H "mcp-session-id: YOUR_SESSION_ID" \
     -d '{"jsonrpc":"2.0","method":"list_tools","params":{},"id":2}'
   ```

3. Call a tool:
   ```bash
   curl -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -H "mcp-session-id: YOUR_SESSION_ID" \
     -d '{"jsonrpc":"2.0","method":"call_tool","params":{"name":"get_employees","arguments":{}},"id":3}'
   ```

## Project Structure

```
src/
├── server.ts          # Main server implementation
├── types.ts           # TypeScript type definitions
└── utils/            # Utility functions
```

## Dependencies

- `@modelcontextprotocol/sdk` - MCP SDK for server implementation
- `express` - Web server framework
- `sqlite3` - SQLite database driver
- `axios` - HTTP client for web searches
- `cors` - CORS middleware

## Error Handling

The server implements comprehensive error handling:
- Invalid session IDs
- Missing required parameters
- Database errors
- Network errors
- Invalid tool calls

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Model Context Protocol (MCP) specification
- DuckDuckGo API
- SQLite project 