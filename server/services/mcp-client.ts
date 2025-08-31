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
  private apiKeyServerUrl = 'https://moluabi-mcp-server.replit.app';
  private atxpServerUrl = process.env.MOLUABI_MCP_ATXP_SERVER || 'https://moluabi-mcp-server.replit.app:5001';
  private paymentMethod: 'apikey' | 'atxp' = 'apikey'; // Default to API key method

  async connect(): Promise<void> {
    try {
      // For now, we'll use HTTP calls directly to the remote MCP server
      // Since the MCP SDK doesn't have built-in HTTP transport for remote servers
      const currentServerUrl = this.getCurrentServerUrl();
      console.log(`Attempting to connect to remote MCP server: ${currentServerUrl} (${this.paymentMethod} mode)`);
      
      // Test connection to the remote server by trying to access the root
      const response = await fetch(`${currentServerUrl}`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        console.log(`Connected to remote MCP server: ${currentServerUrl} (${this.paymentMethod} mode)`);
        // Mark as connected but we'll use HTTP calls instead of transport
        this.client = {} as Client; // Placeholder to indicate connection
      } else {
        throw new Error(`Server responded with status ${response.status}`);
      }
    } catch (error) {
      console.warn(`Failed to connect to remote MCP server (${currentServerUrl}), using mock mode:`, error instanceof Error ? error.message : String(error));
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

  // Get current server URL based on payment method
  private getCurrentServerUrl(): string {
    return this.paymentMethod === 'atxp' ? this.atxpServerUrl : this.apiKeyServerUrl;
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
        apiKey,
        ...toolCall.arguments
      };

      if (this.paymentMethod === 'atxp') {
        // ATXP method: Use /atxp endpoint with JSON-RPC 2.0 and ATXP SDK
        console.log('Using ATXP payment method with /atxp endpoint');
        const result = await atxpService.callMcpTool(
          `${this.apiKeyServerUrl}/atxp`,  // Use /atxp endpoint instead of separate port
          toolCall.name,
          authenticatedArguments
        );
        return result as McpResponse;
      } else {
        // API Key method: Use /mcp/call endpoint with direct HTTP
        console.log('Using API key payment method with /mcp/call endpoint');
        const response = await fetch(`${this.apiKeyServerUrl}/mcp/call`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: toolCall.name,
            arguments: authenticatedArguments
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`MCP server responded with status ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        return result as McpResponse;
      }
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

      // Use get_pricing tool - route based on payment method
      const endpoint = this.paymentMethod === 'atxp' ? `${this.apiKeyServerUrl}/atxp` : `${this.apiKeyServerUrl}/mcp/call`;
      const response = await fetch(endpoint, {
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
