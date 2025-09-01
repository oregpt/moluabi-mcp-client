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
  atxpError?: string; // Capture ATXP errors for transparency
}

export class MoluAbiMcpClient {
  private client: Client | null = null;
  private transport: any | null = null;
  private serverUrl = 'https://moluabi-mcp-server.replit.app';
  private paymentMethod: 'apikey' | 'atxp' = 'apikey'; // Default to API key method

  async connect(): Promise<void> {
    try {
      // Both payment methods now use the same JSON-RPC endpoint
      const currentServerUrl = this.getCurrentServerUrl();
      console.log(`Attempting to connect to remote MCP server: ${currentServerUrl} (${this.paymentMethod} mode)`);
      
      // Simply mark as connected since we'll test authentication per request
      console.log(`Connected to remote MCP server: ${currentServerUrl} (${this.paymentMethod} mode)`);
      this.client = {} as Client; // Placeholder to indicate connection
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

  // Set payment method (apikey or atxp)
  setPaymentMethod(method: 'apikey' | 'atxp'): void {
    this.paymentMethod = method;
    console.log(`Payment method set to: ${method}`);
  }

  // Both payment methods now use the same endpoint
  private getCurrentServerUrl(): string {
    return this.serverUrl;
  }

  // Get current payment method
  getPaymentMethod(): 'apikey' | 'atxp' {
    return this.paymentMethod;
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
        apiKey: apiKey.trim(), // Ensure no whitespace issues
        ...toolCall.arguments
      };

      // Both methods now use ATXP authentication - only difference is cost
      console.log(`Using ${this.paymentMethod === 'atxp' ? 'ATXP Billing' : 'Free Tier'} with ATXP authentication and unified JSON-RPC endpoint`);
      
      const result = await atxpService.callMcpTool(
        this.serverUrl,
        toolCall.name,
        authenticatedArguments
      );
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

      // Use JSON-RPC to list available tools (free operation)
      const response = await fetch(this.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          "jsonrpc": "2.0",
          "method": "tools/list",
          "params": {},
          "id": 1
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to list tools: ${response.status}`);
      }

      const result = await response.json();
      if (result.result && result.result.content) {
        return result.result.content || [];
      }
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

      // Use ATXP authentication for pricing (both methods use same auth)
      const result = await atxpService.callMcpTool(
        this.serverUrl,
        'get_pricing',
        { apiKey }
      );
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
