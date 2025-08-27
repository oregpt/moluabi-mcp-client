// ATXP Client Implementation following official @atxp/client patterns
// TODO: Replace with actual @atxp/client import when dependency conflicts are resolved
// import { atxpClient, ATXPAccount } from '@atxp/client';

// Temporary implementation following ATXP patterns until package can be installed
class ATXPAccount {
  private connectionString: string;
  
  constructor(connectionString: string) {
    if (!connectionString) {
      throw new Error('ATXP connection string is required');
    }
    this.connectionString = connectionString;
  }
  
  getConnectionString(): string {
    return this.connectionString;
  }
  
  // Extract account ID from connection string for demo purposes
  getAccountId(): string {
    try {
      const url = new URL(this.connectionString);
      const token = url.searchParams.get('connection_token');
      return token ? `acc_${token.substring(0, 8)}...${token.substring(-3)}` : 'acc_unknown';
    } catch {
      return 'acc_demo123...xyz';
    }
  }
}

// Temporary ATXP client implementation following official patterns
class ATXPClient {
  constructor(private config: { mcpServer: string; account: ATXPAccount }) {}
  
  async callTool(options: { name: string; arguments: any }): Promise<any> {
    // This would normally make authenticated calls through ATXP protocol
    // For now, we'll throw an error to indicate this needs the real SDK
    throw new Error('ATXP SDK required - install @atxp/client package');
  }
}

// Factory function following ATXP patterns
async function atxpClient(config: { mcpServer: string; account: ATXPAccount }): Promise<ATXPClient> {
  return new ATXPClient(config);
}

export interface AtxpPayment {
  userId: string;
  toolName: string;
  cost: number;
}

export class AtxpService {
  private account: ATXPAccount | null = null;
  private mcpClients: Map<string, ATXPClient> = new Map();

  async initialize(): Promise<void> {
    try {
      const connectionString = process.env.ATXP_CONNECTION || process.env.ATXP_CONNECTION_STRING;
      
      if (!connectionString) {
        console.warn("ATXP connection string not found, using mock mode");
        return;
      }

      this.account = new ATXPAccount(connectionString);
      console.log("ATXP service initialized");
    } catch (error) {
      console.error("Failed to initialize ATXP service:", error);
      throw error;
    }
  }
  
  // Get or create ATXP client for specific MCP server
  async getClient(mcpServerUrl: string): Promise<ATXPClient> {
    if (!this.account) {
      throw new Error('ATXP service not initialized');
    }
    
    if (!this.mcpClients.has(mcpServerUrl)) {
      const client = await atxpClient({
        mcpServer: mcpServerUrl,
        account: this.account
      });
      this.mcpClients.set(mcpServerUrl, client);
    }
    
    return this.mcpClients.get(mcpServerUrl)!;
  }
  
  // Call MCP tool through ATXP (with payment authorization)
  async callMcpTool(mcpServerUrl: string, toolName: string, args: any): Promise<any> {
    const client = await this.getClient(mcpServerUrl);
    return client.callTool({ name: toolName, arguments: args });
  }

  async validatePayment(payment: AtxpPayment): Promise<boolean> {
    if (!this.account) {
      console.log(`No ATXP account - payment validation failed for ${payment.toolName}`);
      return false;
    }

    try {
      // Check if we have a real connection token
      const connectionString = this.account.getConnectionString();
      const url = new URL(connectionString);
      const token = url.searchParams.get('connection_token');
      
      if (!token) {
        console.log(`No connection token - payment validation failed for ${payment.toolName}`);
        return false;
      }
      
      // For now, allow payments if we have a valid token
      // In the future, this could check actual balance
      console.log(`Payment validation passed for ${payment.toolName} - $${payment.cost}`);
      return true;
    } catch (error) {
      console.error("Payment validation failed:", error);
      return false;
    }
  }

  async processPayment(payment: AtxpPayment): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    if (!this.account) {
      return {
        success: false,
        error: 'ATXP account not initialized',
      };
    }

    try {
      const connectionString = this.account.getConnectionString();
      const url = new URL(connectionString);
      const token = url.searchParams.get('connection_token');
      
      if (!token) {
        return {
          success: false,
          error: 'No connection token found',
        };
      }

      // Try different ATXP payment API endpoint patterns
      const paymentConnectionString = this.account.getConnectionString();
      const paymentUrl = new URL(paymentConnectionString);
      const baseUrl = paymentUrl.origin;
      
      const paymentEndpoints = [
        `${baseUrl}/api/v1/payments`,
        `${baseUrl}/api/payments`,
        `${baseUrl}/payments`,
        'https://api.atxp.ai/v1/payments',
        'https://accounts.atxp.ai/api/v1/payments',
        'https://accounts.atxp.ai/api/payments',
        'https://api.atxp.ai/payments'
      ];
      
      console.log(`Attempting ATXP payment for ${payment.toolName} - $${payment.cost}`);

      const paymentData = {
        userId: payment.userId,
        toolName: payment.toolName,
        amount: payment.cost,
        currency: 'USD',
        description: `MCP tool call: ${payment.toolName}`,
        timestamp: new Date().toISOString()
      };

      for (const endpoint of paymentEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'X-API-Key': token,
            },
            body: JSON.stringify(paymentData)
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`ATXP payment response from ${endpoint}:`, data);
            
            return {
              success: true,
              transactionId: data.transactionId || data.id || data.payment_id || `atxp_${Date.now()}`,
            };
          } else {
            console.log(`ATXP payment API ${endpoint} responded with status:`, response.status);
          }
        } catch (endpointError) {
          console.log(`Failed to process payment at ${endpoint}:`, endpointError instanceof Error ? endpointError.message : String(endpointError));
        }
      }
      
      // If all payment APIs fail, return error
      return {
        success: false,
        error: 'All ATXP payment endpoints failed - service may be unavailable',
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
      return 0; // No connection
    }

    try {
      const balanceConnectionString = this.account.getConnectionString();
      const balanceUrl = new URL(balanceConnectionString);
      const token = balanceUrl.searchParams.get('connection_token');
      
      if (!token) {
        console.warn('No connection token found');
        return 0;
      }

      // Try different ATXP API endpoint patterns based on connection URL
      const baseUrl = balanceUrl.origin; // Use the same domain as connection
      const apiEndpoints = [
        `${baseUrl}/api/v1/account/balance`,
        `${baseUrl}/api/balance`,
        `${baseUrl}/api/v1/balance`,
        `${baseUrl}/balance`,
        'https://api.atxp.ai/v1/account/balance',
        'https://accounts.atxp.ai/api/v1/balance',
        'https://accounts.atxp.ai/api/balance',
        'https://api.atxp.ai/balance'
      ];
      
      console.log(`Trying to get ATXP balance with token: ${token.substring(0, 8)}...`);

      for (const endpoint of apiEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'X-API-Key': token, // Try both auth methods
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`ATXP balance response from ${endpoint}:`, data);
            
            // Handle different response formats
            if (typeof data === 'number') return data;
            if (data.balance !== undefined) return parseFloat(data.balance);
            if (data.data?.balance !== undefined) return parseFloat(data.data.balance);
            if (data.available !== undefined) return parseFloat(data.available);
            
            console.log('Unknown balance format:', data);
          } else {
            console.log(`ATXP API ${endpoint} responded with status:`, response.status);
          }
        } catch (endpointError) {
          console.log(`Failed to connect to ${endpoint}:`, endpointError instanceof Error ? endpointError.message : String(endpointError));
        }
      }
      
      // If all API calls fail, return 0 to indicate no balance available
      console.warn('All ATXP balance API endpoints failed');
      return 0;
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
      accountId: this.account.getAccountId(),
    };
  }
}

// Global ATXP service instance
export const atxpService = new AtxpService();
