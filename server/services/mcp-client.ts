import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface McpToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface McpResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export class MoluAbiMcpClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  async connect(): Promise<void> {
    try {
      // Try to connect to the MoluAbi MCP server
      this.transport = new StdioClientTransport({
        command: "npx",
        args: ["tsx", "../mcp-server/src/server.ts"],
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
      });

      this.client = new Client({
        name: "moluabi-web-client",
        version: "1.0.0",
      }, {
        capabilities: {}
      });

      await this.client.connect(this.transport);
      console.log("Connected to MoluAbi MCP server");
    } catch (error) {
      console.warn("Failed to connect to MCP server, using mock mode:", error.message);
      // Don't throw error, just set client to null to indicate mock mode
      this.client = null;
      this.transport = null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }

  async callTool(toolCall: McpToolCall): Promise<McpResponse> {
    if (!this.client) {
      // Return mock responses when MCP server is not available
      return this.getMockResponse(toolCall);
    }

    try {
      const result = await this.client.callTool(toolCall);
      return result as McpResponse;
    } catch (error) {
      console.error(`MCP tool call failed for ${toolCall.name}:`, error);
      throw error;
    }
  }

  private getMockResponse(toolCall: McpToolCall): McpResponse {
    switch (toolCall.name) {
      case "prompt_agent":
        return {
          content: [{
            type: "text",
            text: `Mock response from agent ${toolCall.arguments.agentId}: I received your message "${toolCall.arguments.message}" and I'm ready to help! (This is a mock response since no MCP server is connected)`
          }]
        };
      default:
        return {
          content: [{
            type: "text", 
            text: `Mock response for ${toolCall.name}: Operation completed successfully in demo mode.`
          }]
        };
    }
  }

  async listTools(): Promise<any[]> {
    if (!this.client) {
      throw new Error("MCP client not connected");
    }

    try {
      const result = await this.client.listTools();
      return result.tools || [];
    } catch (error) {
      console.error("Failed to list MCP tools:", error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}

// Global MCP client instance
export const mcpClient = new MoluAbiMcpClient();
