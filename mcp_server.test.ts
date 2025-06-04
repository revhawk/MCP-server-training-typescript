import MCPServer from './mcp_server';
import { Socket } from 'net';

// Create server instance
const server = new MCPServer(3000);

// Handle incoming messages
server.on('message', (clientId: string, message: any) => {
    console.log(`Received message from ${clientId}:`, message);
    
    // Example: Echo the message back to the client
    server.sendToClient(clientId, {
        type: 'echo',
        payload: message
    });
});

// Start the server
server.start();

// Example: Broadcast a message to all clients
setInterval(() => {
    server.broadcast({
        type: 'heartbeat',
        payload: {
            timestamp: Date.now()
        }
    });
}, 5000);

// Example client connection
const client = new Socket();
client.connect(3000, 'localhost', () => {
    console.log('Connected to server');
    
    // Send a test message
    client.write(JSON.stringify({
        type: 'test',
        payload: {
            message: 'Hello, MCP Server!'
        }
    }));
});

client.on('data', (data: Buffer) => {
    console.log('Received from server:', JSON.parse(data.toString()));
}); 