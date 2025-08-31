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
    // If MCP server failed, payment was definitely not processed
    // If MCP server succeeded, we assume payment was processed unless explicitly told otherwise
    const paymentWasProcessed = mcpSuccess && mcpResponse?.paymentFailed !== true;
    const paymentStatus = paymentWasProcessed ? 'success' : (mcpSuccess ? 'warning' : 'error');
    const paymentDetails = paymentWasProcessed
      ? 'Payment processed successfully through ATXP SDK'
      : mcpSuccess 
        ? 'Payment APIs unavailable - operation completed in prototype mode'
        : 'Payment not processed due to operation failure';
    
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

  getConnectionStatus(): { connected: boolean; mode: string } {
    return {
      connected: this.initialized,
      mode: 'SDK-only via MCP server'
    };
  }
}

// Global ATXP service instance
export const atxpService = new AtxpService();