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

  // Create ATXP flow based on actual MCP server response - no simulation
  createAtxpFlow(operation: string, cost: number, mcpResponse?: any): AtxpFlowData {
    const now = new Date().toISOString();
    const steps: AtxpFlowStep[] = [];
    
    // Only show actual steps that occurred based on MCP response
    if (mcpResponse) {
      // If we have an MCP response, show what actually happened
      const actualStatus = mcpResponse.success ? 'success' : 'error';
      const actualDetails = mcpResponse.success 
        ? `${operation} executed successfully via MCP server`
        : `${operation} failed: ${mcpResponse.error || 'Unknown error'}`;
      
      steps.push({
        id: 'mcp-execution',
        label: 'MCP Server Request',
        status: actualStatus,
        timestamp: now,
        details: actualDetails,
        cost: cost
      });

      // Only add payment info if MCP server explicitly provides it
      if (mcpResponse.paymentProcessed !== undefined) {
        steps.push({
          id: 'payment-status',
          label: 'Payment Status',
          status: mcpResponse.paymentProcessed ? 'success' : 'error',
          timestamp: now,
          details: mcpResponse.paymentProcessed 
            ? 'Payment processed by MCP server via ATXP SDK'
            : 'Payment processing failed or unavailable',
          cost: mcpResponse.paymentProcessed ? cost : 0
        });
      }
    } else {
      // No response yet - show pending
      steps.push({
        id: 'mcp-pending',
        label: 'MCP Server Request',
        status: 'in-progress',
        timestamp: now,
        details: `Sending ${operation} request to MCP server...`,
        cost: 0
      });
    }

    return {
      steps,
      totalSteps: steps.length,
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