import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  TextContent,
  isInitializeRequest
} from '@modelcontextprotocol/sdk/types.js';
import sqlite3 from 'sqlite3';
import axios from 'axios';
import express from 'express';
import { randomUUID } from 'node:crypto';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';

// Database setup
const db = new sqlite3.Database(':memory:');

// Initialize sample data
function setupDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create table
      db.run(`
        CREATE TABLE employees (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          department TEXT NOT NULL,
          salary INTEGER
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
      });

      // Insert sample data
      const stmt = db.prepare('INSERT INTO employees VALUES (?, ?, ?, ?)');
      const sampleData = [
        [1, 'Alice Johnson', 'Engineering', 85000],
        [2, 'Bob Smith', 'Marketing', 62000],
        [3, 'Carol Davis', 'Engineering', 92000],
        [4, 'David Wilson', 'Sales', 58000]
      ];

      sampleData.forEach(row => {
        stmt.run(row);
      });

      stmt.finalize((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

// Create MCP server
const server = new Server(
  {
    name: 'workshop-typescript-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {
        get_employees: {
          description: 'Get all employees from the database',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        web_search: {
          description: 'Search the web for information',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
            },
            required: ['query'],
          },
        },
        search_employees: {
          description: 'Search employees by department or name',
          inputSchema: {
            type: 'object',
            properties: {
              department: {
                type: 'string',
                description: 'Department to search in',
              },
              name: {
                type: 'string',
                description: 'Name to search for',
              },
            },
          },
        },
      },
    },
  }
);

// Initialize server
server.oninitialized = () => {
  console.log('MCP Server initialized');
};

// Add type for error
interface ErrorWithCode extends Error {
  code?: string;
}

// Add type for tool arguments
interface ToolArguments {
  query?: string;
  department?: string;
  name?: string;
}

// Set up tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    switch (name) {
      case 'get_employees': {
        const rows = await new Promise((resolve, reject) => {
          db.all('SELECT * FROM employees', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
        let output = 'Employees:\n';
        (rows as any[]).forEach((row) => {
          output += `ID: ${row.id}, Name: ${row.name}, Department: ${row.department}, Salary: $${row.salary}\n`;
        });
        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      }
      case 'web_search': {
        const args = request.params.arguments as ToolArguments;
        const query = args?.query;
        if (!query) {
          throw new Error('Query parameter is required');
        }
        if (query.length > 500) {
          throw new Error('Query too long');
        }
        try {
          const response = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`, {
            timeout: 5000 // 5 second timeout
          });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        } catch (error) {
          const err = error as ErrorWithCode;
          if (err.code === 'ECONNABORTED') {
            throw new Error('Search request timed out');
          }
          throw error;
        }
      }
      case 'search_employees': {
        const args = request.params.arguments as ToolArguments;
        const department = args?.department;
        const name = args?.name;
        if (!department && !name) {
          throw new Error('Either department or name parameter is required');
        }
        return new Promise((resolve, reject) => {
          const query = `
            SELECT * FROM employees 
            WHERE (? IS NULL OR department = ?)
            AND (? IS NULL OR name LIKE ?)
          `;
          db.all(query, [department, department, name, name ? `%${name}%` : null], (err, rows) => {
            if (err) {
              reject(err);
              return;
            }
            resolve({
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(rows, null, 2),
                },
              ],
            });
          });
        });
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error('Error in call_tool handler:', error);
    throw error;
  }
});

// Session management
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const sessions: { [sessionId: string]: { lastActive: number; transport: StreamableHTTPServerTransport } } = {};

// Start server
async function main() {
  try {
    await setupDatabase();
    console.log('Database initialized with sample data');
    
    const app = express();
    app.use(express.json());
    app.use(cors());  // Enable CORS for all routes

    // Map to store transports by session ID
    const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

    // Handle POST requests for client-to-server communication
    /**
     * @swagger
     * /mcp:
     *   post:
     *     tags:
     *       - MCP
     *     summary: Handle MCP requests
     *     description: Main endpoint for MCP communication, handling initialization, tool listing, and tool calls
     *     parameters:
     *       - in: header
     *         name: mcp-session-id
     *         schema:
     *           type: string
     *         description: Session ID for existing sessions (not required for initialization)
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             oneOf:
     *               - $ref: '#/components/schemas/InitializeRequest'
     *               - $ref: '#/components/schemas/ListToolsRequest'
     *               - $ref: '#/components/schemas/CallToolRequest'
     *     responses:
     *       200:
     *         description: Successful response
     *         content:
     *           application/json:
     *             schema:
     *               oneOf:
     *                 - $ref: '#/components/schemas/ToolResponse'
     *                 - type: object
     *                   properties:
     *                     jsonrpc:
     *                       type: string
     *                       example: '2.0'
     *                     result:
     *                       type: object
     *                       properties:
     *                         sessionId:
     *                           type: string
     *                         serverInfo:
     *                           type: object
     *                           properties:
     *                             name:
     *                               type: string
     *                             version:
     *                               type: string
     *                     id:
     *                       type: [string, number]
     *       400:
     *         description: Bad request
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *       500:
     *         description: Internal server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    app.post('/mcp', async (req, res) => {
      try {
        console.log('Received POST request to /mcp');
        console.log('Request body:', req.body);
        console.log('Request headers:', req.headers);
        
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let transport: StreamableHTTPServerTransport;

        if (sessionId && sessions[sessionId]) {
          console.log(`Reusing existing transport for session ${sessionId}`);
          transport = sessions[sessionId].transport;
          sessions[sessionId].lastActive = Date.now();
        } else if (!sessionId && req.body.method === 'initialize') {
          console.log('Creating new transport for initialization request');
          
          // Generate a new session ID
          const newSessionId = randomUUID();
          console.log('Generated new session ID:', newSessionId);
          
          // Create new transport for initialization request
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => newSessionId,
            onsessioninitialized: (sessionId) => {
              console.log(`Session initialized with ID: ${sessionId}`);
              sessions[sessionId] = {
                lastActive: Date.now(),
                transport
              };
            }
          });

          // Store transport immediately
          sessions[newSessionId] = {
            lastActive: Date.now(),
            transport
          };
          console.log(`Stored transport for session ${newSessionId}`);

          // Clean up transport when closed
          transport.onclose = () => {
            if (transport.sessionId) {
              console.log(`Cleaning up transport for session ${transport.sessionId}`);
              delete sessions[transport.sessionId];
            }
          };

          try {
            // Connect to the MCP server
            console.log('Connecting transport to MCP server...');
            await server.connect(transport);
            console.log('Transport connected successfully');
            
            // Send success response immediately
            res.json({
              jsonrpc: '2.0',
              result: {
                sessionId: newSessionId,
                serverInfo: {
                  name: 'workshop-typescript-server',
                  version: '1.0.0'
                }
              },
              id: req.body.id
            });
            return;
          } catch (error) {
            console.error('Error connecting transport:', error);
            if (!res.headersSent) {
              res.status(500).json({
                jsonrpc: '2.0',
                error: {
                  code: -32000,
                  message: 'Failed to initialize transport',
                },
                id: null,
              });
            }
            return;
          }
        } else if (sessionId) {
          console.log(`Session ID provided: ${sessionId}`);
          if (!sessions[sessionId]) {
            console.log('Session ID not found in sessions');
            if (!res.headersSent) {
              res.status(400).json({
                jsonrpc: '2.0',
                error: {
                  code: -32001,
                  message: 'Invalid session ID'
                },
                id: null
              });
            }
            return;
          }
          transport = sessions[sessionId].transport;
          sessions[sessionId].lastActive = Date.now();
        } else {
          console.log('Invalid request - no session ID or not an initialization request');
          if (!res.headersSent) {
            res.status(400).json({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: 'Bad Request: No valid session ID provided',
              },
              id: null,
            });
          }
          return;
        }

        try {
          // Handle the request
          console.log('Handling request...');
          
          if (req.body.method === 'list_tools') {
            console.log('Processing list_tools request');
            try {
              const tools = {
                tools: [
                  {
                    name: 'get_employees',
                    description: 'Get all employees from the database',
                    inputSchema: {
                      type: 'object',
                      properties: {},
                      required: [],
                    },
                  },
                  {
                    name: 'web_search',
                    description: 'Search the web for information',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        query: {
                          type: 'string',
                          description: 'Search query',
                        },
                      },
                      required: ['query'],
                    },
                  },
                  {
                    name: 'search_employees',
                    description: 'Search employees by department or name',
                    inputSchema: {
                      type: 'object',
                      properties: {
                        department: {
                          type: 'string',
                          description: 'Department to search in',
                        },
                        name: {
                          type: 'string',
                          description: 'Name to search for',
                        },
                      },
                    },
                  },
                ],
              };
              
              console.log('Sending tools response:', tools);
              if (!res.headersSent) {
                res.json({
                  jsonrpc: '2.0',
                  result: tools,
                  id: req.body.id,
                });
              }
            } catch (error) {
              console.error('Error handling list_tools request:', error);
              if (!res.headersSent) {
                res.status(500).json({
                  jsonrpc: '2.0',
                  error: {
                    code: -32000,
                    message: 'Error handling list_tools request',
                  },
                  id: req.body.id,
                });
              }
            }
            return;
          } else if (req.body.method === 'call_tool') {
            console.log('Processing call_tool request:', req.body.params);
            try {
              const { name, arguments: args } = req.body.params;
              let result;

              switch (name) {
                case 'get_employees': {
                  const rows = await new Promise((resolve, reject) => {
                    db.all('SELECT * FROM employees', (err, rows) => {
                      if (err) reject(err);
                      else resolve(rows);
                    });
                  });
                  let output = 'Employees:\n';
                  (rows as any[]).forEach((row) => {
                    output += `ID: ${row.id}, Name: ${row.name}, Department: ${row.department}, Salary: $${row.salary}\n`;
                  });
                  result = {
                    content: [
                      {
                        type: 'text',
                        text: output,
                      },
                    ],
                  };
                  break;
                }
                case 'web_search': {
                  const query = args?.query as string;
                  if (!query) {
                    throw new Error('Query parameter is required');
                  }
                  if (query.length > 500) {
                    throw new Error('Query too long');
                  }
                  try {
                    const response = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`, {
                      timeout: 5000 // 5 second timeout
                    });
                    result = {
                      content: [
                        {
                          type: 'text',
                          text: JSON.stringify(response.data, null, 2),
                        },
                      ],
                    };
                  } catch (error) {
                    const err = error as ErrorWithCode;
                    if (err.code === 'ECONNABORTED') {
                      throw new Error('Search request timed out');
                    }
                    throw error;
                  }
                  break;
                }
                case 'search_employees': {
                  let query = 'SELECT * FROM employees WHERE 1=1';
                  const params: any[] = [];
                  
                  if (args.department) {
                    query += ' AND department = ?';
                    params.push(args.department);
                  }
                  if (args.name) {
                    query += ' AND name LIKE ?';
                    params.push(`%${args.name}%`);
                  }
                  
                  const rows = await new Promise((resolve, reject) => {
                    db.all(query, params, (err, rows) => {
                      if (err) reject(err);
                      else resolve(rows);
                    });
                  });
                  
                  let output = 'Search Results:\n';
                  (rows as any[]).forEach((row) => {
                    output += `ID: ${row.id}, Name: ${row.name}, Department: ${row.department}, Salary: $${row.salary}\n`;
                  });
                  
                  result = {
                    content: [
                      {
                        type: 'text',
                        text: output,
                      },
                    ],
                  };
                  break;
                }
                default:
                  throw new Error(`Unknown tool: ${name}`);
              }

              console.log('Sending tool response:', result);
              if (!res.headersSent) {
                res.json({
                  jsonrpc: '2.0',
                  result,
                  id: req.body.id,
                });
              }
            } catch (error) {
              console.error('Error handling call_tool request:', error);
              if (!res.headersSent) {
                res.status(500).json({
                  jsonrpc: '2.0',
                  error: {
                    code: -32000,
                    message: `Error handling call_tool request: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
                  },
                  id: req.body.id,
                });
              }
            }
            return;
          }
          
          // For any other requests, use the transport
          console.log('Using transport for request:', req.body.method);
          await transport.handleRequest(req, res, req.body);
          console.log('Request handled successfully');
        } catch (error) {
          console.error('Error handling request:', error);
          if (!res.headersSent) {
            res.status(500).json({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: 'Internal server error',
              },
              id: null,
            });
          }
        }
      } catch (error) {
        console.error('Unexpected error in POST handler:', error);
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Internal server error',
            data: error instanceof Error ? error.message : 'Unknown error'
          },
          id: null
        });
      }
    });

    // Reusable handler for GET and DELETE requests
    const handleSessionRequest = async (req: express.Request, res: express.Response) => {
      try {
        console.log(`Received ${req.method} request to /mcp`);
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        if (!sessionId || !sessions[sessionId]) {
          console.log('Invalid or missing session ID');
          if (!res.headersSent) {
            res.status(400).send('Invalid or missing session ID');
          }
          return;
        }
        
        const transport = sessions[sessionId].transport;
        await transport.handleRequest(req, res);
        console.log(`${req.method} request handled successfully`);
      } catch (error) {
        console.error(`Error handling ${req.method} request:`, error);
        if (!res.headersSent) {
          res.status(500).send('Internal server error');
        }
      }
    };

    // Handle GET requests for server-to-client notifications via SSE
    /**
     * @swagger
     * /mcp:
     *   get:
     *     tags:
     *       - MCP
     *     summary: Server-Sent Events endpoint
     *     description: Endpoint for server-to-client notifications via SSE. Establishes a persistent connection for real-time updates.
     *     parameters:
     *       - in: header
     *         name: mcp-session-id
     *         required: true
     *         schema:
     *           type: string
     *         description: Session ID for the SSE connection
     *     responses:
     *       200:
     *         description: SSE connection established
     *         content:
     *           text/event-stream:
     *             schema:
     *               type: string
     *       400:
     *         description: Invalid or missing session ID
     *       500:
     *         description: Internal server error
     */
    app.get('/mcp', handleSessionRequest);

    // Handle DELETE requests for session termination
    /**
     * @swagger
     * /mcp:
     *   delete:
     *     tags:
     *       - MCP
     *     summary: Terminate session
     *     description: Endpoint for terminating an MCP session. Cleans up session resources and closes any open connections.
     *     parameters:
     *       - in: header
     *         name: mcp-session-id
     *         required: true
     *         schema:
     *           type: string
     *         description: Session ID to terminate
     *     responses:
     *       200:
     *         description: Session terminated successfully
     *       400:
     *         description: Invalid or missing session ID
     *       500:
     *         description: Internal server error
     */
    app.delete('/mcp', handleSessionRequest);

    // Serve Swagger documentation
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    const PORT = 3000;
    const httpServer = app.listen(PORT, '0.0.0.0', () => {
      console.log(`MCP Server listening on port ${PORT}`);
      console.log('Available tools:');
      console.log('1. get_employees - Get all employees from the database');
      console.log('2. web_search - Search the web for information');
      console.log('3. search_employees - Search employees by department or name');
    });

    // Handle server shutdown gracefully
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Closing server...');
      httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received. Closing server...');
      httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    // Handle uncaught errors
    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception thrown:', err);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error in main:', error);
  process.exit(1);
}); 