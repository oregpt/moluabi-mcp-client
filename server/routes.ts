import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { mcpClient } from "./services/mcp-client";
import { atxpService } from "./services/atxp-client";
import { insertAgentSchema, insertMcpToolUsageSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize services
  try {
    await atxpService.initialize();
    await mcpClient.connect();
  } catch (error) {
    console.error("Failed to initialize services:", error);
  }

  // Agent management routes - use MCP server
  app.post("/api/agents", async (req, res) => {
    try {
      const userId = req.body.userId || "user_demo_123";
      
      // Call MCP server to create agent
      const mcpResponse = await mcpClient.callTool({
        name: "create_agent",
        arguments: {
          name: req.body.name,
          description: req.body.description,
          type: req.body.type,
          instructions: req.body.instructions
        }
      });
      
      // Extract cost and agent data from MCP response
      let actualCost = 0;
      let agentData = null;
      
      if (mcpResponse && typeof mcpResponse === 'object') {
        if ('cost' in mcpResponse) actualCost = mcpResponse.cost || 0;
        if ('agent' in mcpResponse) agentData = mcpResponse.agent;
      }
      
      // Record tool usage with actual cost
      await storage.recordToolUsage({
        userId,
        toolName: "create_agent",
        cost: actualCost.toString(),
        status: "success",
        request: req.body,
        response: mcpResponse,
      });

      res.status(201).json(mcpResponse);
    } catch (error) {
      console.error("Create agent error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/agents", async (req, res) => {
    try {
      const userId = req.query.userId as string || "user_demo_123";
      
      // Call MCP server to list agents
      const mcpResponse = await mcpClient.callTool({
        name: "list_agents",
        arguments: {}
      });
      
      // Extract cost from MCP response
      let actualCost = 0;
      if (mcpResponse && typeof mcpResponse === 'object' && 'cost' in mcpResponse) {
        actualCost = mcpResponse.cost || 0;
      }
      
      // Record tool usage with actual cost
      await storage.recordToolUsage({
        userId,
        toolName: "list_agents",
        cost: actualCost.toString(),
        status: "success",
        request: { userId },
        response: mcpResponse,
      });

      res.json(mcpResponse);
    } catch (error) {
      console.error("List agents error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/agents/:id", async (req, res) => {
    try {
      const userId = req.query.userId as string || "user_demo_123";
      const agentId = parseInt(req.params.id);
      
      // Call MCP server to get agent
      const mcpResponse = await mcpClient.callTool({
        name: "get_agent",
        arguments: { agentId }
      });
      
      // Extract cost from MCP response
      let actualCost = 0;
      if (mcpResponse && typeof mcpResponse === 'object' && 'cost' in mcpResponse) {
        actualCost = mcpResponse.cost || 0;
      }

      // Record tool usage with actual cost
      await storage.recordToolUsage({
        userId,
        toolName: "get_agent",
        agentId,
        cost: actualCost.toString(),
        status: "success",
        request: { agentId, userId },
        response: mcpResponse,
      });

      res.json(mcpResponse);
    } catch (error) {
      console.error("Get agent error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/agents/:id", async (req, res) => {
    try {
      const userId = req.body.userId || "user_demo_123";
      const agentId = parseInt(req.params.id);
      
      // Call MCP server to update agent
      const mcpResponse = await mcpClient.callTool({
        name: "update_agent",
        arguments: {
          agentId,
          name: req.body.name,
          description: req.body.description,
          instructions: req.body.instructions
        }
      });
      
      // Extract cost from MCP response
      let actualCost = 0;
      if (mcpResponse && typeof mcpResponse === 'object' && 'cost' in mcpResponse) {
        actualCost = mcpResponse.cost || 0;
      }

      // Record tool usage with actual cost
      await storage.recordToolUsage({
        userId,
        toolName: "update_agent",
        agentId,
        cost: actualCost.toString(),
        status: "success",
        request: { agentId, updates: req.body },
        response: mcpResponse,
      });

      res.json(mcpResponse);
    } catch (error) {
      console.error("Update agent error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/agents/:id", async (req, res) => {
    try {
      const userId = req.query.userId as string || "user_demo_123";
      const agentId = parseInt(req.params.id);
      
      // Call MCP server to delete agent
      const mcpResponse = await mcpClient.callTool({
        name: "delete_agent",
        arguments: { agentId }
      });
      
      // Extract cost from MCP response
      let actualCost = 0;
      if (mcpResponse && typeof mcpResponse === 'object' && 'cost' in mcpResponse) {
        actualCost = mcpResponse.cost || 0;
      }

      // Record tool usage with actual cost
      await storage.recordToolUsage({
        userId,
        toolName: "delete_agent",
        agentId,
        cost: actualCost.toString(),
        status: "success",
        request: { agentId, userId },
        response: mcpResponse,
      });

      res.json(mcpResponse);
    } catch (error) {
      console.error("Delete agent error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // MCP tool execution routes
  app.post("/api/mcp/tools/:toolName", async (req, res) => {
    try {
      const { toolName } = req.params;
      const userId = req.body.userId || "user_demo_123";
      
      // Broadcast operation start
      const broadcast = (global as any).broadcastAtxpFlow;
      if (broadcast) {
        broadcast({
          stepId: 'operation-start',
          label: `Starting ${toolName} operation`,
          status: 'in-progress',
          operation: `${toolName} request`,
          details: `User ${userId} requesting ${toolName}`
        });
      }

      // Validate payment - no hardcoded cost
      const paymentValid = await atxpService.validatePayment({
        userId,
        toolName,
        cost: 0, // Will be updated when real pricing is available
      });

      if (!paymentValid) {
        return res.status(402).json({ error: "Payment validation failed" });
      }

      // Broadcast MCP execution start (reuse broadcast variable)
      if (broadcast) {
        broadcast({
          stepId: 'mcp-execution',
          label: `Executing MCP tool: ${toolName}`,
          status: 'in-progress',
          operation: `${toolName} execution`,
          details: `Calling MCP server with ${Object.keys(req.body.arguments || {}).length} parameters`
        });
      }

      // Call MCP tool
      const startTime = Date.now();
      let mcpResponse;
      let status = "success";
      let errorMessage;
      let actualCost = 0; // No fallback - must come from MCP response

      try {
        // For user access tools, use the request body directly as arguments
        const toolArguments = (toolName === 'add_user_to_agent' || toolName === 'remove_user_from_agent') 
          ? { agentId: req.body.agentId, userEmail: req.body.userEmail }
          : req.body.arguments || {};
        
          
        mcpResponse = await mcpClient.callTool({
          name: toolName,
          arguments: toolArguments,
        });
        
        // Extract actual cost from MCP response - new format from working examples
        if (mcpResponse && typeof mcpResponse === 'object') {
          if ('cost' in mcpResponse && typeof mcpResponse.cost === 'number') {
            actualCost = mcpResponse.cost;
          }
        }
        
        // Broadcast MCP success
        if (broadcast) {
          broadcast({
            stepId: 'mcp-execution',
            label: `MCP tool ${toolName} completed successfully`,
            status: 'success',
            details: `Cost extracted: $${actualCost.toFixed(3)}`,
            cost: actualCost,
            duration: Date.now() - startTime
          });
        }
      } catch (error) {
        status = "error";
        errorMessage = error instanceof Error ? error.message : "MCP call failed";
        mcpResponse = null;
        actualCost = 0;
        
        // Broadcast MCP error
        if (broadcast) {
          broadcast({
            stepId: 'mcp-execution',
            label: `MCP tool ${toolName} failed`,
            status: 'error',
            details: errorMessage || 'Unknown MCP error',
            duration: Date.now() - startTime
          });
        }
      }

      const executionTime = Date.now() - startTime;

      // Process payment with actual cost
      if (status === "success") {
        await atxpService.processPayment({
          userId,
          toolName,
          cost: actualCost,
        });
      }

      // Broadcast usage recording
      if (broadcast) {
        broadcast({
          stepId: 'usage-recording',
          label: 'Recording tool usage...',
          status: 'in-progress',
          details: `Saving ${toolName} execution data`
        });
      }

      // Record usage with actual cost
      await storage.recordToolUsage({
        userId,
        toolName,
        agentId: req.body.agentId,
        cost: actualCost.toString(),
        executionTime,
        status,
        errorMessage,
        request: req.body,
        response: mcpResponse,
      });
      
      // Broadcast usage recording success
      if (broadcast) {
        broadcast({
          stepId: 'usage-recording',
          label: 'Tool usage recorded successfully',
          status: 'success',
          details: `${toolName} data saved to storage`,
          cost: actualCost
        });
      }

      if (status === "error") {
        return res.status(500).json({ error: errorMessage });
      }

      // Return the response in the same format as the MCP server
      if (mcpResponse && typeof mcpResponse === 'object' && 'success' in mcpResponse) {
        // Pass through the complete MCP response with additional metadata
        res.json({
          ...mcpResponse,
          executionTime,
        });
      } else {
        // Fallback for unexpected response format
        res.json({
          success: true,
          response: mcpResponse,
          cost: actualCost,
          executionTime,
        });
      }
    } catch (error) {
      console.error("MCP tool execution error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Usage reporting
  app.get("/api/usage", async (req, res) => {
    try {
      const userId = req.query.userId as string || "user_demo_123";
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      const usage = await storage.getUserUsageReport(userId, startDate, endDate);
      
      const summary = {
        totalCost: usage.reduce((sum, record) => sum + parseFloat(record.cost), 0),
        totalActions: usage.length,
        successfulActions: usage.filter(record => record.status === "success").length,
        failedActions: usage.filter(record => record.status === "error").length,
        usage,
      };

      res.json(summary);
    } catch (error) {
      console.error("Usage report error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Get current pricing from MCP server
  app.get("/api/pricing", async (req, res) => {
    try {
      const userId = req.query.userId as string || "user_demo_123";
      
      // Validate payment for get_pricing tool - use expected cost
      const paymentValid = await atxpService.validatePayment({
        userId,
        toolName: "get_pricing",
        cost: 0.001, // Standard get_pricing cost from MCP response
      });

      if (!paymentValid) {
        return res.status(402).json({ error: "Payment validation failed" });
      }

      // Get pricing directly from MCP server
      const startTime = Date.now();
      let pricingData;
      let status = "success";
      let errorMessage;

      try {
        pricingData = await mcpClient.getPricing();
      } catch (error) {
        status = "error";
        errorMessage = error instanceof Error ? error.message : "Pricing call failed";
        pricingData = null;
      }

      const executionTime = Date.now() - startTime;

      // Process payment if successful - use actual or expected cost
      if (status === "success") {
        const actualCost = pricingData?.cost || 0.001;
        await atxpService.processPayment({
          userId,
          toolName: "get_pricing",
          cost: actualCost,
        });
      }

      // Record usage - use actual or expected cost
      const actualCost = pricingData?.cost || 0.001;
      await storage.recordToolUsage({
        userId,
        toolName: "get_pricing",
        agentId: undefined,
        cost: actualCost.toString(),
        executionTime,
        status,
        errorMessage,
        request: {},
        response: pricingData,
      });

      if (status === "error") {
        return res.status(500).json({ error: errorMessage });
      }

      res.json({
        success: true,
        pricing: pricingData,
        cost: actualCost, // Use actual cost from MCP response
        executionTime,
      });
    } catch (error) {
      console.error("Get pricing error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // ATXP status
  app.get("/api/atxp/status", async (req, res) => {
    try {
      const status = atxpService.getConnectionStatus();
      const balance = await atxpService.getAccountBalance();
      
      res.json({
        ...status,
        balance,
      });
    } catch (error) {
      console.error("ATXP status error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Global WebSocket broadcast function
  const broadcastAtxpFlow = (stepData: any) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'atxp-flow',
          ...stepData
        }));
      }
    });
  };
  
  // Make broadcastAtxpFlow available globally
  (global as any).broadcastAtxpFlow = broadcastAtxpFlow;
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        
        // Handle different message types
        switch (data.type) {
          case 'subscribe':
            // In production, implement proper subscription management
            ws.send(JSON.stringify({ type: 'subscribed', channel: data.channel }));
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    // Send initial status
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'status',
        data: {
          connected: true,
          timestamp: new Date().toISOString(),
        }
      }));
    }
  });

  return httpServer;
}
