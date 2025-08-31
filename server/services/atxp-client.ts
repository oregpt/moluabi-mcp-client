// Simplified ATXP Service - SDK-Only Architecture
// All payment processing is handled by MCP server through ATXP SDK

export interface AtxpFlowStep {
  id: string;
  label: string;
  status: 'success' | 'warning' | 'error' | 'in-progress';
  timestamp: string;
  details: string;
  cost: number;
}

export interface AtxpFlowData {
  steps: AtxpFlowStep[];
  totalSteps: number;
  totalCost: number;
  operation: string;
}

export class AtxpService {
  private initialized = false;
  private atxpAvailable = false;
  private atxpAccount: any = null;

  async initialize(): Promise<void> {
    try {
      const connectionString = process.env.ATXP_CONNECTION || process.env.ATXP_CONNECTION_STRING;
      
      if (!connectionString) {
        console.warn("ATXP connection string not found - will fall back to direct HTTP");
        this.initialized = true;
        return;
      }

      // Try to load ATXP SDK
      try {
        const { ATXPAccount } = await import('@atxp/client');
        this.atxpAccount = new ATXPAccount(connectionString, {
          network: 'base',
        });
        this.atxpAvailable = true;
        console.log("ATXP service initialized with SDK integration");
      } catch (importError) {
        console.warn("ATXP SDK not available - will fall back to direct HTTP:", importError instanceof Error ? importError.message : String(importError));
        this.atxpAvailable = false;
      }

      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize ATXP service:", error);
      this.initialized = true; // Still mark as initialized to allow fallback
      this.atxpAvailable = false;
    }
  }

  // Pure ATXP integration - server now supports standard MCP format
  async callMcpTool(serverUrl: string, toolName: string, toolArguments: any): Promise<any> {
    if (!this.atxpAvailable) {
      throw new Error("ATXP SDK not available - package not installed or import failed");
    }

    try {
      const { atxpClient } = await import('@atxp/client');
      const { ConsoleLogger, LogLevel } = await import('@atxp/common');

      console.log(`Making ATXP call for ${toolName} with standard MCP format`);
      
      const mcpEndpoint = `${serverUrl}/mcp/call`;
      const client = await atxpClient({
        mcpServer: mcpEndpoint,
        account: this.atxpAccount,
        allowedAuthorizationServers: [
          'https://auth.atxp.ai',
          'https://atxp-accounts-staging.onrender.com/',
          serverUrl
        ],
        logger: new ConsoleLogger({ level: LogLevel.DEBUG })
      });

      // Direct ATXP call with standard MCP format (server now supports this!)
      const result = await client.callTool({
        name: toolName,  // Standard MCP format
        arguments: toolArguments,
      });
      
      console.log(`ATXP call successful for ${toolName}`);
      return result;
    } catch (error) {
      console.error(`ATXP call failed for ${toolName}:`, error);
      throw error;
    }
  }

  // Create 5-step ATXP flow for SDK-only architecture
  createAtxpFlow(operation: string, cost: number, mcpResponse?: any, mcpErrors?: string[]): AtxpFlowData {
    const now = new Date().toISOString();
    
    // Step 1: ATXP Authentication (validated by MCP server)
    const authStep: AtxpFlowStep = {
      id: 'auth-start',
      label: 'ATXP Authentication',
      status: 'success',
      timestamp: now,
      details: `Authenticating with API key for ${operation}`,
      cost: 0
    };

    // Step 2: Payment Pre-Authorization (handled by MCP server SDK)
    const preAuthStep: AtxpFlowStep = {
      id: 'payment-preauth',
      label: 'Payment Pre-Authorization',
      status: 'success',
      timestamp: now,
      details: `MCP server validates payment capacity via ATXP SDK`,
      cost: 0
    };

    // Step 3: Tool Execution + Payment (single MCP call handles both)
    // Check both HTTP success AND actual response content for real status
    const hasResponse = mcpResponse && typeof mcpResponse === 'object';
    
    // Extract text from the actual response structure - try multiple possible locations
    let responseText = '';
    if (hasResponse) {
      if (mcpResponse.content && mcpResponse.content[0] && mcpResponse.content[0].text) {
        responseText = mcpResponse.content[0].text;
      } else if (mcpResponse.message) {
        responseText = mcpResponse.message;
      } else if (mcpResponse.error) {
        responseText = mcpResponse.error;
      } else {
        // Convert the entire response to text for display
        responseText = JSON.stringify(mcpResponse);
      }
    }
    
    // Look for actual failure indicators - avoid false positives from JSON structure
    const responseContainsActualError = responseText && (
      responseText.toLowerCase().includes('error:') ||
      responseText.toLowerCase().includes('failed:') ||
      responseText.toLowerCase().includes('insufficient funds') ||
      responseText.toLowerCase().includes('payment declined') ||
      responseText.toLowerCase().includes('authentication failed') ||
      responseText.toLowerCase().includes('unauthorized')
    );
    
    // Check if response explicitly indicates success
    const hasSuccessField = mcpResponse && (
      mcpResponse.success === true ||
      (mcpResponse.agents && mcpResponse.agents.success === true) ||
      (mcpResponse.content && mcpResponse.content.length > 0)
    );
    
    const mcpSuccess = hasResponse && (hasSuccessField || (!responseContainsActualError && mcpResponse.success !== false));
    
    const executionStep: AtxpFlowStep = {
      id: 'tool-execution-payment',
      label: 'Tool Execution + Payment',
      status: mcpSuccess ? 'success' : 'error',
      timestamp: new Date().toISOString(),
      details: mcpSuccess 
        ? `Executing ${operation} with integrated payment processing via MCP server`
        : `${operation} execution failed: ${responseText || 'No response from MCP server'}`,
      cost: cost
    };

    // Step 4: Payment Confirmation - pure ATXP integration
    let paymentStatus: 'success' | 'warning' | 'error';
    let paymentDetails: string;
    
    if (mcpResponse?.atxpError) {
      // ATXP failed with error from mcp-client fallback
      paymentStatus = 'error';
      paymentDetails = mcpResponse.atxpError;
    } else if (!mcpSuccess) {
      // Operation failed
      paymentStatus = 'error';
      paymentDetails = 'Payment not processed due to operation failure';
    } else {
      // ATXP succeeded with standard MCP format
      paymentStatus = 'success';
      paymentDetails = responseText 
        ? `ATXP payment processed successfully. Response: "${responseText}"`
        : 'ATXP payment processed successfully';
    }
    
    const paymentStep: AtxpFlowStep = {
      id: 'payment-confirmation',
      label: 'Payment Confirmation',
      status: paymentStatus,
      timestamp: new Date().toISOString(),
      details: paymentDetails,
      cost: paymentStatus === 'success' ? cost : 0
    };

    // Step 5: Operation Complete
    const completionStep: AtxpFlowStep = {
      id: 'operation-complete',
      label: 'Operation Complete',
      status: mcpSuccess ? 'success' : 'error',
      timestamp: new Date().toISOString(),
      details: mcpSuccess 
        ? `${operation} executed successfully${paymentStatus === 'warning' ? ' (payment status unclear)' : paymentStatus === 'error' ? ' (payment failed)' : ''}`
        : `${operation} execution failed`,
      cost: 0
    };

    return {
      steps: [authStep, preAuthStep, executionStep, paymentStep, completionStep],
      totalSteps: 5,
      totalCost: cost,
      operation
    };
  }

  getConnectionStatus(): { connected: boolean; mode: string } {
    return {
      connected: this.initialized,
      mode: this.atxpAvailable ? 'ATXP SDK with fallback' : 'Direct HTTP (ATXP unavailable)'
    };
  }
}

// Global ATXP service instance
export const atxpService = new AtxpService();