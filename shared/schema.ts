import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  atxpConnectionString: text("atxp_connection_string"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agents = pgTable("agents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
  instructions: text("instructions").notNull(),
  type: text("type").notNull(), // file-based, team, hybrid
  isPublic: boolean("is_public").default(false).notNull(),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agentAccess = pgTable("agent_access", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: integer("agent_id").notNull().references(() => agents.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
});

export const mcpToolUsage = pgTable("mcp_tool_usage", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().references(() => users.id),
  toolName: text("tool_name").notNull(),
  agentId: integer("agent_id").references(() => agents.id),
  cost: decimal("cost", { precision: 10, scale: 4 }).notNull(),
  tokensUsed: integer("tokens_used").default(0),
  executionTime: integer("execution_time_ms"),
  status: text("status").notNull(), // success, error, pending
  errorMessage: text("error_message"),
  request: jsonb("request").notNull(),
  response: jsonb("response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agentFiles = pgTable("agent_files", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: integer("agent_id").notNull().references(() => agents.id),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  atxpConnectionString: true,
});

export const insertAgentSchema = createInsertSchema(agents).pick({
  name: true,
  description: true,
  instructions: true,
  type: true,
  isPublic: true,
  ownerId: true,
  metadata: true,
});

export const insertMcpToolUsageSchema = createInsertSchema(mcpToolUsage).pick({
  userId: true,
  toolName: true,
  agentId: true,
  cost: true,
  tokensUsed: true,
  executionTime: true,
  status: true,
  errorMessage: true,
  request: true,
  response: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

export type InsertMcpToolUsage = z.infer<typeof insertMcpToolUsageSchema>;
export type McpToolUsage = typeof mcpToolUsage.$inferSelect;

export type AgentAccess = typeof agentAccess.$inferSelect;
export type AgentFile = typeof agentFiles.$inferSelect;
