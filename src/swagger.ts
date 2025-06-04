import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MCP Server API Documentation',
      version: '1.0.0',
      description: 'API documentation for the Model Context Protocol (MCP) server implementation',
      contact: {
        name: 'API Support',
        url: 'https://github.com/revhawk/MCP-server-training-typescript',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'MCP',
        description: 'Model Context Protocol endpoints',
      },
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            jsonrpc: {
              type: 'string',
              example: '2.0',
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'integer',
                  example: -32000,
                  description: 'Error code. Common codes: -32000 (Internal error), -32001 (Invalid session), -32029 (Rate limit exceeded)',
                },
                message: {
                  type: 'string',
                  example: 'Invalid session ID',
                },
                data: {
                  type: 'string',
                  description: 'Additional error details',
                },
              },
            },
            id: {
              type: ['string', 'number', 'null'],
              example: null,
            },
          },
        },
        ToolResponse: {
          type: 'object',
          properties: {
            jsonrpc: {
              type: 'string',
              example: '2.0',
            },
            result: {
              type: 'object',
              properties: {
                content: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: {
                        type: 'string',
                        enum: ['text', 'markdown', 'code', 'error', 'image'],
                      },
                      text: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
            id: {
              type: ['string', 'number'],
              example: 1,
            },
          },
        },
        InitializeRequest: {
          type: 'object',
          properties: {
            jsonrpc: {
              type: 'string',
              example: '2.0',
            },
            method: {
              type: 'string',
              enum: ['initialize'],
            },
            params: {
              type: 'object',
            },
            id: {
              type: ['string', 'number'],
            },
          },
        },
        ListToolsRequest: {
          type: 'object',
          properties: {
            jsonrpc: {
              type: 'string',
              example: '2.0',
            },
            method: {
              type: 'string',
              enum: ['list_tools'],
            },
            params: {
              type: 'object',
            },
            id: {
              type: ['string', 'number'],
            },
          },
        },
        CallToolRequest: {
          type: 'object',
          properties: {
            jsonrpc: {
              type: 'string',
              example: '2.0',
            },
            method: {
              type: 'string',
              enum: ['call_tool'],
            },
            params: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  enum: ['get_employees', 'web_search', 'search_employees'],
                },
                arguments: {
                  type: 'object',
                  properties: {
                    query: {
                      type: 'string',
                      description: 'Search query for web_search (max 500 characters)',
                    },
                    department: {
                      type: 'string',
                      description: 'Department to search in for search_employees',
                    },
                    name: {
                      type: 'string',
                      description: 'Name to search for in search_employees',
                    },
                  },
                },
              },
            },
            id: {
              type: ['string', 'number'],
            },
          },
        },
        Tool: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              enum: ['get_employees', 'web_search', 'search_employees'],
            },
            description: {
              type: 'string',
            },
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                },
                properties: {
                  type: 'object',
                },
                required: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
      securitySchemes: {
        sessionId: {
          type: 'apiKey',
          in: 'header',
          name: 'mcp-session-id',
          description: 'Session ID for authenticated requests',
        },
      },
    },
    security: [
      {
        sessionId: [],
      },
    ],
  },
  apis: ['./src/server.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options); 