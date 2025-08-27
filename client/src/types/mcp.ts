export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface McpResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export interface McpToolUsage {
  id: number;
  userId: string;
  toolName: string;
  agentId?: number;
  cost: string;
  tokensUsed?: number;
  executionTime?: number;
  status: 'success' | 'error' | 'pending';
  errorMessage?: string;
  request: Record<string, any>;
  response?: Record<string, any>;
  createdAt: Date;
}

export interface Agent {
  id: number;
  name: string;
  description?: string;
  instructions: string;
  type: 'file-based' | 'team' | 'hybrid';
  isPublic: boolean;
  ownerId: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AtxpStatus {
  connected: boolean;
  accountId?: string;
  balance: number;
}
