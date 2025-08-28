import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { atxpService } from './atxp-client.js';

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
  private transport: any | null = null;
  private serverUrl = 'https://moluabi-mcp-server.replit.app';
  private useAtxp = true; // Use ATXP for authenticated tool calls

  async connect(): Promise<void> {
    try {
      // For now, we'll use HTTP calls directly to the remote MCP server
      // Since the MCP SDK doesn't have built-in HTTP transport for remote servers
      console.log(`Attempting to connect to remote MCP server: ${this.serverUrl}`);
      
      // Test connection to the remote server by trying to access the root
      const response = await fetch(`${this.serverUrl}`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log(`Connected to remote MCP server: ${this.serverUrl}`);
        // Mark as connected but we'll use HTTP calls instead of transport
        this.client = {} as Client; // Placeholder to indicate connection
      } else {
        throw new Error(`Server responded with status ${response.status}`);
      }
    } catch (error) {
      console.warn(`Failed to connect to remote MCP server (${this.serverUrl}), using mock mode:`, error instanceof Error ? error.message : String(error));
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
      throw new Error('MCP server not connected');
    }

    try {
      const apiKey = process.env.MOLUABI_MCP_API_KEY;
      if (!apiKey) {
        throw new Error('MOLUABI_MCP_API_KEY not found in environment variables');
      }

      // Add API key to arguments for authentication
      const authenticatedArguments = {
        apiKey,
        ...toolCall.arguments
      };

      if (this.useAtxp) {
        // Use ATXP client for authenticated, paid tool calls
        try {
          const result = await atxpService.callMcpTool(
            this.serverUrl,
            toolCall.name,
            authenticatedArguments
          );
          return result as McpResponse;
        } catch (atxpError) {
          // If ATXP fails, fall back to direct HTTP (for now)
          console.warn(`ATXP call failed, falling back to direct HTTP:`, atxpError instanceof Error ? atxpError.message : String(atxpError));
        }
      }
      
      // Use the new HTTP endpoint for MCP tool calls with exact format from working examples
      const response = await fetch(`${this.serverUrl}/mcp/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: toolCall.name,
          arguments: authenticatedArguments
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MCP server responded with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
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
      const apiKey = process.env.MOLUABI_MCP_API_KEY;
      if (!apiKey) {
        throw new Error('MOLUABI_MCP_API_KEY not found in environment variables');
      }

      // Use the new HTTP endpoint to list available tools
      const response = await fetch(`${this.serverUrl}/tools`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list tools: ${response.status}`);
      }

      const result = await response.json();
      return result.tools || [];
    } catch (error) {
      console.error("Failed to list MCP tools:", error);
      throw error;
    }
  }

  async getPricing(): Promise<any> {
    if (!this.client) {
      throw new Error("MCP client not connected");
    }

    try {
      const apiKey = process.env.MOLUABI_MCP_API_KEY;
      if (!apiKey) {
        throw new Error('MOLUABI_MCP_API_KEY not found in environment variables');
      }

      // Use get_pricing tool instead of /pricing endpoint to match working examples
      const response = await fetch(`${this.serverUrl}/mcp/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'get_pricing',
          arguments: { apiKey }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get pricing: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Failed to get pricing from MCP server:", error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}

// Global MCP client instance
export const mcpClient = new MoluAbiMcpClient();
