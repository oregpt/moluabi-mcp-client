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

  async initialize(): Promise<void> {
    try {
      const connectionString = process.env.ATXP_CONNECTION || process.env.ATXP_CONNECTION_STRING;
      
      if (!connectionString) {
        console.warn("ATXP connection string not found - SDK-only mode");
        return;
      }

      this.initialized = true;
      console.log("ATXP service initialized for SDK-only integration");
    } catch (error) {
      console.error("Failed to initialize ATXP service:", error);
      throw error;
    }
  }

  // Create 5-step ATXP flow for SDK-only architecture
  createAtxpFlow(operation: string, cost: number, mcpResponse?: any): AtxpFlowData {
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
    const mcpSuccess = mcpResponse && typeof mcpResponse === 'object' && mcpResponse.success !== false;
    const executionStep: AtxpFlowStep = {
      id: 'tool-execution-payment',
      label: 'Tool Execution + Payment',
      status: mcpSuccess ? 'success' : 'error',
      timestamp: new Date().toISOString(),
      details: mcpSuccess 
        ? `Executing ${operation} with integrated payment processing via MCP server`
        : `${operation} execution failed on MCP server`,
      cost: cost
    };

    // Step 4: Payment Confirmation (reflects actual MCP server payment status)
    // Check if payment was actually processed or if fallback was used
    const paymentProcessed = mcpResponse?.paymentProcessed === true;
    const usedFallback = mcpResponse?.usedFallback === true || mcpResponse?.fallback === true;
    
    console.log(`🔍 Payment status check for ${operation}:`, {
      mcpSuccess,
      paymentProcessed,
      usedFallback,
      responseKeys: mcpResponse ? Object.keys(mcpResponse) : 'no response'
    });
    
    let paymentStatus: 'success' | 'warning' | 'error';
    let paymentDetails: string;
    
    if (!mcpSuccess) {
      paymentStatus = 'error';
      paymentDetails = 'Payment not processed due to operation failure';
    } else if (paymentProcessed) {
      paymentStatus = 'success';
      paymentDetails = 'Payment processed successfully through ATXP SDK';
    } else if (usedFallback) {
      paymentStatus = 'warning';
      paymentDetails = 'ATXP payment failed - operation completed using fallback mode';
    } else {
      // Default case: operation succeeded but no clear payment indicator
      paymentStatus = 'warning';
      paymentDetails = 'Payment APIs unavailable - operation completed in prototype mode';
    }
    
    const paymentStep: AtxpFlowStep = {
      id: 'payment-confirmation',
      label: 'Payment Confirmation',
      status: paymentStatus,
      timestamp: new Date().toISOString(),
      details: paymentDetails,
      cost: paymentWasProcessed ? cost : 0
    };

    // Step 5: Operation Complete
    const completionStep: AtxpFlowStep = {
      id: 'operation-complete',
      label: 'Operation Complete',
      status: mcpSuccess ? 'success' : 'error',
      timestamp: new Date().toISOString(),
      details: mcpSuccess 
        ? `${operation} executed successfully${paymentStatus === 'warning' ? ' (payment in prototype mode)' : ''}`
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

  // Call MCP tool with ATXP payment processing
  async callMcpTool(serverUrl: string, toolName: string, args: any): Promise<any> {
    // This should integrate with the actual ATXP SDK for payment processing
    // For now, throw error since SDK integration is not implemented
    throw new Error('ATXP SDK integration not implemented - payment processing unavailable');
  }

  getConnectionStatus(): { connected: boolean; mode: string } {
    return {
      connected: this.initialized,
      mode: 'SDK-only via MCP server'
    };
  }
}

// Global ATXP service instance
export const atxpService = new AtxpService();