// Mock ATXP implementation - replace with real @atxp/client when available
interface ATXPAccount {
  constructor(connectionString: string): ATXPAccount;
}

class MockATXPAccount {
  constructor(private connectionString: string) {}
}

const ATXPAccount = MockATXPAccount as any;

export interface AtxpPayment {
  userId: string;
  toolName: string;
  cost: number;
}

export class AtxpService {
  private client: any = null;
  private account: ATXPAccount | null = null;

  async initialize(): Promise<void> {
    try {
      const connectionString = process.env.ATXP_CONNECTION || process.env.ATXP_CONNECTION_STRING;
      
      if (!connectionString) {
        console.warn("ATXP connection string not found, using mock mode");
        return;
      }

      this.account = new ATXPAccount(connectionString);
      
      // Note: We don't create the client here as it's per-MCP-server
      // The client will be created when needed for specific MCP server calls
      
      console.log("ATXP service initialized");
    } catch (error) {
      console.error("Failed to initialize ATXP service:", error);
      throw error;
    }
  }

  async validatePayment(payment: AtxpPayment): Promise<boolean> {
    if (!this.account) {
      // In development/demo mode, always allow payments
      console.log(`Mock payment validation: ${payment.toolName} - $${payment.cost}`);
      return true;
    }

    try {
      // In a real implementation, this would check the account balance
      // For now, we'll assume payments are valid if we have an account
      return true;
    } catch (error) {
      console.error("Payment validation failed:", error);
      return false;
    }
  }

  async processPayment(payment: AtxpPayment): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    if (!this.account) {
      // Mock payment processing
      return {
        success: true,
        transactionId: `mock_tx_${Date.now()}`,
      };
    }

    try {
      // In a real implementation, this would process the actual payment
      // For this demo, we'll simulate success
      return {
        success: true,
        transactionId: `atxp_tx_${Date.now()}`,
      };
    } catch (error) {
      console.error("Payment processing failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Payment failed",
      };
    }
  }

  async getAccountBalance(): Promise<number> {
    if (!this.account) {
      return 25.00; // Mock balance
    }

    try {
      // In a real implementation, this would fetch the actual balance
      return 25.00;
    } catch (error) {
      console.error("Failed to get account balance:", error);
      return 0;
    }
  }

  getConnectionStatus(): { connected: boolean; accountId?: string } {
    if (!this.account) {
      return {
        connected: false,
      };
    }

    return {
      connected: true,
      accountId: "acc_demo123...xyz", // In real implementation, extract from account
    };
  }
}

// Global ATXP service instance
export const atxpService = new AtxpService();
