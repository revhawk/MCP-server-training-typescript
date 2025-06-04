# MCP Server Implementation in TypeScript

This is a TypeScript implementation of a Model Context Protocol (MCP) server. The server provides a set of tools for interacting with a database and performing web searches.

## Features

- MCP protocol implementation
- SQLite database integration
- Web search capabilities
- RESTful API endpoints
- Interactive API documentation with Swagger UI
- CORS support
- Session management
- Server-Sent Events (SSE) for real-time updates

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mcp-typescript-workshop.git
cd mcp-typescript-workshop
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on port 3000 by default. You can access:
- API Documentation: http://localhost:3000/api-docs
- MCP Endpoint: http://localhost:3000/mcp

## Testing the Server

You can test the server using curl commands. Here's a complete sequence to test all functionality:

1. Initialize a new session:
```bash
curl -v -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'
```
This will return a session ID that you'll need for subsequent requests.

2. List available tools:
```bash
curl -v -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","method":"list_tools","params":{},"id":2}'
```

3. Get all employees:
```bash
curl -v -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","method":"call_tool","params":{"name":"get_employees","arguments":{}},"id":3}'
```

4. Search employees by department:
```bash
curl -v -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","method":"call_tool","params":{"name":"search_employees","arguments":{"department":"Engineering"}},"id":4}'
```

5. Perform a web search:
```bash
curl -v -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{"jsonrpc":"2.0","method":"call_tool","params":{"name":"web_search","arguments":{"query":"Model Context Protocol"}},"id":5}'
```

6. Terminate the session:
```bash
curl -v -X DELETE http://localhost:3000/mcp \
  -H "mcp-session-id: YOUR_SESSION_ID"
```

Note: Replace `YOUR_SESSION_ID` with the session ID received from the initialize request.

### Expected Responses

1. Initialize response:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "sessionId": "e6c389d7-e90a-4d09-a916-47bc5edd365e",
    "serverInfo": {
      "name": "workshop-typescript-server",
      "version": "1.0.0"
    }
  },
  "id": 1
}
```

2. Get employees response:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [{
      "type": "text",
      "text": "Employees:\nID: 1, Name: Alice Johnson, Department: Engineering, Salary: $85000\nID: 2, Name: Bob Smith, Department: Marketing, Salary: $62000\nID: 3, Name: Carol Davis, Department: Engineering, Salary: $92000\nID: 4, Name: David Wilson, Department: Sales, Salary: $58000\n"
    }]
  },
  "id": 3
}
```

## API Documentation

The API documentation is available at `http://localhost:3000/api-docs` when the server is running. The documentation includes:

- All available endpoints
- Request/response schemas
- Interactive testing interface
- Example requests and responses

## Available Endpoints

### POST /mcp
Main endpoint for MCP communication. Handles:
- Session initialization
- Tool listing
- Tool execution

### GET /mcp
Server-Sent Events (SSE) endpoint for real-time updates.

### DELETE /mcp
Endpoint for terminating an MCP session.

## Available Tools

1. **get_employees**
   - Description: Get all employees from the database
   - No input parameters required

2. **web_search**
   - Description: Search the web for information
   - Input parameters:
     - query (string): Search query

3. **search_employees**
   - Description: Search employees by department or name
   - Input parameters:
     - department (string, optional): Department to search in
     - name (string, optional): Name to search for

## Session Management

The server uses session IDs to maintain state between requests. The session ID is:
- Generated during initialization
- Required in the `mcp-session-id` header for subsequent requests
- Automatically cleaned up when the session is terminated

## Error Handling

The server provides detailed error responses in the following format:
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Error description"
  },
  "id": null
}
```

## Development

### Project Structure
```
src/
  ├── server.ts      # Main server implementation
  ├── swagger.ts     # API documentation configuration
  └── types/         # TypeScript type definitions
```

### Building
```bash
npm run build
```

### Testing
```bash
npm test
```

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request 