import { apiRequest } from "./queryClient";

export interface CreateAgentRequest {
  name: string;
  description?: string;
  instructions: string;
  type: "file-based" | "team" | "hybrid";
  isPublic: boolean;
  userId: string;
}

export interface McpToolRequest {
  userId: string;
  agentId?: number;
  arguments?: Record<string, any>;
}

export const agentApi = {
  create: async (data: CreateAgentRequest) => {
    const response = await apiRequest("POST", "/api/agents", data);
    return response.json();
  },

  list: async (userId: string) => {
    const response = await apiRequest("GET", `/api/agents?userId=${userId}`);
    return response.json();
  },

  get: async (id: number, userId: string) => {
    const response = await apiRequest("GET", `/api/agents/${id}?userId=${userId}`);
    return response.json();
  },

  update: async (id: number, data: Partial<CreateAgentRequest>) => {
    const response = await apiRequest("PUT", `/api/agents/${id}`, data);
    return response.json();
  },

  delete: async (id: number, userId: string) => {
    const response = await apiRequest("DELETE", `/api/agents/${id}?userId=${userId}`);
    return response.json();
  },
};

export const mcpApi = {
  callTool: async (toolName: string, request: McpToolRequest) => {
    const response = await apiRequest("POST", `/api/mcp/tools/${toolName}`, request);
    return response.json();
  },
};

export const usageApi = {
  getReport: async (userId: string, startDate?: string, endDate?: string) => {
    let url = `/api/usage?userId=${userId}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    
    const response = await apiRequest("GET", url);
    return response.json();
  },
};

export const atxpApi = {
  getStatus: async () => {
    const response = await apiRequest("GET", "/api/atxp/status");
    return response.json();
  },
};
