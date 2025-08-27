import { 
  users, agents, agentAccess, mcpToolUsage, agentFiles,
  type User, type InsertUser, type Agent, type InsertAgent, 
  type McpToolUsage, type InsertMcpToolUsage, type AgentAccess, type AgentFile
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Agent operations
  createAgent(agent: InsertAgent): Promise<Agent>;
  getAgent(id: number, userId: string): Promise<Agent | undefined>;
  getUserAgents(userId: string): Promise<Agent[]>;
  updateAgent(id: number, userId: string, updates: Partial<InsertAgent>): Promise<Agent | undefined>;
  deleteAgent(id: number, userId: string): Promise<boolean>;

  // Agent access operations
  addUserToAgent(agentId: number, userId: string, ownerId: string): Promise<boolean>;
  removeUserFromAgent(agentId: number, userId: string, ownerId: string): Promise<boolean>;
  getUserAgentAccess(userId: string): Promise<AgentAccess[]>;

  // Usage tracking
  recordToolUsage(usage: InsertMcpToolUsage): Promise<McpToolUsage>;
  getUserUsageReport(userId: string, startDate?: Date, endDate?: Date): Promise<McpToolUsage[]>;

  // File operations
  addAgentFile(agentId: number, fileName: string, fileSize: number, fileType: string, uploadedBy: string): Promise<AgentFile>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private agents: Map<number, Agent>;
  private agentAccess: Map<string, AgentAccess[]>;
  private toolUsage: McpToolUsage[];
  private agentFiles: AgentFile[];
  private agentIdCounter: number = 1;
  private usageIdCounter: number = 1;
  private fileIdCounter: number = 1;

  constructor() {
    this.users = new Map();
    this.agents = new Map();
    this.agentAccess = new Map();
    this.toolUsage = [];
    this.agentFiles = [];

    // Initialize with demo user
    const demoUser: User = {
      id: "user_demo_123",
      username: "demo",
      password: "demo",
      atxpConnectionString: process.env.ATXP_CONNECTION || "",
      createdAt: new Date(),
    };
    this.users.set(demoUser.id, demoUser);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const id = this.agentIdCounter++;
    const now = new Date();
    const newAgent: Agent = {
      ...agent,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.agents.set(id, newAgent);
    return newAgent;
  }

  async getAgent(id: number, userId: string): Promise<Agent | undefined> {
    const agent = this.agents.get(id);
    if (!agent) return undefined;
    
    // Check if user has access (owner or granted access)
    if (agent.ownerId === userId) return agent;
    
    const userAccess = this.agentAccess.get(userId) || [];
    const hasAccess = userAccess.some(access => access.agentId === id);
    
    return hasAccess ? agent : undefined;
  }

  async getUserAgents(userId: string): Promise<Agent[]> {
    const ownedAgents = Array.from(this.agents.values()).filter(agent => agent.ownerId === userId);
    const accessibleAgentIds = (this.agentAccess.get(userId) || []).map(access => access.agentId);
    const accessibleAgents = accessibleAgentIds.map(id => this.agents.get(id)).filter(Boolean) as Agent[];
    
    return [...ownedAgents, ...accessibleAgents];
  }

  async updateAgent(id: number, userId: string, updates: Partial<InsertAgent>): Promise<Agent | undefined> {
    const agent = this.agents.get(id);
    if (!agent || agent.ownerId !== userId) return undefined;
    
    const updatedAgent: Agent = {
      ...agent,
      ...updates,
      updatedAt: new Date(),
    };
    this.agents.set(id, updatedAgent);
    return updatedAgent;
  }

  async deleteAgent(id: number, userId: string): Promise<boolean> {
    const agent = this.agents.get(id);
    if (!agent || agent.ownerId !== userId) return false;
    
    this.agents.delete(id);
    // Clean up access records
    for (const [uid, accesses] of this.agentAccess.entries()) {
      this.agentAccess.set(uid, accesses.filter(access => access.agentId !== id));
    }
    // Clean up files
    this.agentFiles = this.agentFiles.filter(file => file.agentId !== id);
    return true;
  }

  async addUserToAgent(agentId: number, userId: string, ownerId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent || agent.ownerId !== ownerId) return false;
    
    const userAccess = this.agentAccess.get(userId) || [];
    if (userAccess.some(access => access.agentId === agentId)) return false; // Already has access
    
    const access: AgentAccess = {
      id: userAccess.length + 1,
      agentId,
      userId,
      grantedAt: new Date(),
    };
    
    userAccess.push(access);
    this.agentAccess.set(userId, userAccess);
    return true;
  }

  async removeUserFromAgent(agentId: number, userId: string, ownerId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent || agent.ownerId !== ownerId) return false;
    
    const userAccess = this.agentAccess.get(userId) || [];
    const filteredAccess = userAccess.filter(access => access.agentId !== agentId);
    
    if (filteredAccess.length === userAccess.length) return false; // No access to remove
    
    this.agentAccess.set(userId, filteredAccess);
    return true;
  }

  async getUserAgentAccess(userId: string): Promise<AgentAccess[]> {
    return this.agentAccess.get(userId) || [];
  }

  async recordToolUsage(usage: InsertMcpToolUsage): Promise<McpToolUsage> {
    const record: McpToolUsage = {
      ...usage,
      id: this.usageIdCounter++,
      createdAt: new Date(),
    };
    this.toolUsage.push(record);
    return record;
  }

  async getUserUsageReport(userId: string, startDate?: Date, endDate?: Date): Promise<McpToolUsage[]> {
    return this.toolUsage.filter(usage => {
      if (usage.userId !== userId) return false;
      if (startDate && usage.createdAt < startDate) return false;
      if (endDate && usage.createdAt > endDate) return false;
      return true;
    });
  }

  async addAgentFile(agentId: number, fileName: string, fileSize: number, fileType: string, uploadedBy: string): Promise<AgentFile> {
    const file: AgentFile = {
      id: this.fileIdCounter++,
      agentId,
      fileName,
      fileSize,
      fileType,
      uploadedBy,
      createdAt: new Date(),
    };
    this.agentFiles.push(file);
    return file;
  }
}

export const storage = new MemStorage();
