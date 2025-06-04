import { Server, Socket } from 'net';
import { EventEmitter } from 'events';

interface MCPMessage {
    type: string;
    payload: any;
}

class MCPServer extends EventEmitter {
    private server: Server;
    private clients: Map<string, Socket>;
    private port: number;

    constructor(port: number = 3000) {
        super();
        this.port = port;
        this.clients = new Map();
        this.server = new Server();
        this.setupServer();
    }

    private setupServer(): void {
        this.server.on('connection', (socket: Socket) => {
            const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
            this.clients.set(clientId, socket);
            console.log(`Client connected: ${clientId}`);

            socket.on('data', (data: Buffer) => {
                try {
                    const message: MCPMessage = JSON.parse(data.toString());
                    this.handleMessage(clientId, message);
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            });

            socket.on('close', () => {
                this.clients.delete(clientId);
                console.log(`Client disconnected: ${clientId}`);
            });

            socket.on('error', (error) => {
                console.error(`Client error: ${clientId}`, error);
                this.clients.delete(clientId);
            });
        });

        this.server.on('error', (error) => {
            console.error('Server error:', error);
        });
    }

    private handleMessage(clientId: string, message: MCPMessage): void {
        console.log(`Received message from ${clientId}:`, message);
        this.emit('message', clientId, message);
    }

    public start(): void {
        this.server.listen(this.port, () => {
            console.log(`MCP Server listening on port ${this.port}`);
        });
    }

    public stop(): void {
        this.server.close(() => {
            console.log('MCP Server stopped');
        });
    }

    public broadcast(message: MCPMessage): void {
        const messageStr = JSON.stringify(message);
        this.clients.forEach((client) => {
            client.write(messageStr);
        });
    }

    public sendToClient(clientId: string, message: MCPMessage): void {
        const client = this.clients.get(clientId);
        if (client) {
            client.write(JSON.stringify(message));
        }
    }
}

export default MCPServer; 