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

  // Agent management routes - SDK-only MCP server integration
  app.post("/api/agents", async (req, res) => {
    try {
      const userId = req.body.userId || "user_demo_123";
      
      // Call MCP server directly - it handles all payment processing via ATXP SDK
      const mcpResponse = await mcpClient.callTool({
        name: "create_agent",
        arguments: {
          name: req.body.name,
          description: req.body.description,
          type: req.body.type,
          instructions: req.body.instructions
        }
      });
      
      // Extract cost from MCP response
      let actualCost = 0;
      if (mcpResponse && typeof mcpResponse === 'object' && 'cost' in mcpResponse) {
        actualCost = Number(mcpResponse.cost) || 0;
      }
      
      // Create 5-step ATXP flow for user transparency
      const atxpFlow = atxpService.createAtxpFlow('create_agent', actualCost, mcpResponse);
      
      // Record tool usage with actual cost
      await storage.recordToolUsage({
        userId,
        toolName: "create_agent",
        cost: actualCost.toString(),
        status: (mcpResponse as any)?.success !== false ? "success" : "error",
        request: req.body,
        response: mcpResponse,
      });

      res.status(201).json({
        ...mcpResponse,
        atxpFlow
      });
    } catch (error) {
      console.error("Create agent error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/agents", async (req, res) => {
    try {
      const userId = req.query.userId as string || "user_demo_123";
      
      // Call MCP server directly - it handles all payment processing via ATXP SDK
      const mcpResponse = await mcpClient.callTool({
        name: "list_agents",
        arguments: {}
      });
      
      // Extract cost from MCP response
      let actualCost = 0;
      if (mcpResponse && typeof mcpResponse === 'object' && 'cost' in mcpResponse) {
        actualCost = Number(mcpResponse.cost) || 0;
      }
      
      // Create 5-step ATXP flow for user transparency
      const atxpFlow = atxpService.createAtxpFlow('list_agents', actualCost, mcpResponse);
      
      // Record tool usage with actual cost
      await storage.recordToolUsage({
        userId,
        toolName: "list_agents",
        cost: actualCost.toString(),
        status: (mcpResponse as any)?.success !== false ? "success" : "error",
        request: { userId },
        response: mcpResponse,
      });

      res.json({
        ...mcpResponse,
        atxpFlow
      });
    } catch (error) {
      console.error("List agents error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Direct HTTP test endpoint (bypassing ATXP) to prove our integration works
  app.get("/api/agents/direct-test", async (req, res) => {
    try {
      console.log('Testing direct HTTP call to MCP server');
      
      const payload = {
        name: 'list_agents',
        arguments: {
          apiKey: process.env.MOLUABI_MCP_API_KEY  // Use full environment variable
        }
      };
      
      const response = await fetch('https://moluabi-mcp-server.replit.app/mcp/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MCP server responded with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('Direct HTTP call successful');
      res.json({ 
        success: true, 
        directCall: result, 
        message: 'Direct HTTP call works perfectly - issue is with ATXP SDK wrapper',
        proofOfServerCompatibility: true
      });
    } catch (error) {
      console.error('Direct test error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Direct test failed' 
      });
    }
  });

  app.get("/api/agents/:id", async (req, res) => {
    try {
      const userId = req.query.userId as string || "user_demo_123";
      const agentId = parseInt(req.params.id);
      
      // Call MCP server directly - it handles all payment processing via ATXP SDK
      const mcpResponse = await mcpClient.callTool({
        name: "get_agent",
        arguments: { agentId: String(agentId) }
      });
      
      // Extract cost from MCP response
      let actualCost = 0;
      if (mcpResponse && typeof mcpResponse === 'object' && 'cost' in mcpResponse) {
        actualCost = Number(mcpResponse.cost) || 0;
      }

      // Create 5-step ATXP flow for user transparency
      const atxpFlow = atxpService.createAtxpFlow('get_agent', actualCost, mcpResponse);

      // Record tool usage with actual cost
      await storage.recordToolUsage({
        userId,
        toolName: "get_agent",
        agentId,
        cost: actualCost.toString(),
        status: (mcpResponse as any)?.success !== false ? "success" : "error",
        request: { agentId, userId },
        response: mcpResponse,
      });

      res.json({
        ...mcpResponse,
        atxpFlow
      });
    } catch (error) {
      console.error("Get agent error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put("/api/agents/:id", async (req, res) => {
    try {
      const userId = req.body.userId || "user_demo_123";
      const agentId = parseInt(req.params.id);
      
      // Call MCP server directly - it handles all payment processing via ATXP SDK
      const mcpResponse = await mcpClient.callTool({
        name: "update_agent",
        arguments: {
          agentId: String(agentId),
          name: req.body.name,
          description: req.body.description,
          instructions: req.body.instructions
        }
      });
      
      // Extract cost from MCP response
      let actualCost = 0;
      if (mcpResponse && typeof mcpResponse === 'object' && 'cost' in mcpResponse) {
        actualCost = Number(mcpResponse.cost) || 0;
      }

      // Create 5-step ATXP flow for user transparency
      const atxpFlow = atxpService.createAtxpFlow('update_agent', actualCost, mcpResponse);

      // Record tool usage with actual cost
      await storage.recordToolUsage({
        userId,
        toolName: "update_agent",
        agentId,
        cost: actualCost.toString(),
        status: (mcpResponse as any)?.success !== false ? "success" : "error",
        request: { agentId, updates: req.body },
        response: mcpResponse,
      });

      res.json({
        ...mcpResponse,
        atxpFlow
      });
    } catch (error) {
      console.error("Update agent error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/agents/:id", async (req, res) => {
    try {
      const userId = req.query.userId as string || "user_demo_123";
      const agentId = parseInt(req.params.id);
      
      // Call MCP server directly - it handles all payment processing via ATXP SDK
      const mcpResponse = await mcpClient.callTool({
        name: "delete_agent",
        arguments: { agentId: String(agentId) }
      });
      
      // Extract cost from MCP response
      let actualCost = 0;
      if (mcpResponse && typeof mcpResponse === 'object' && 'cost' in mcpResponse) {
        actualCost = Number(mcpResponse.cost) || 0;
      }

      // Create 5-step ATXP flow for user transparency
      const atxpFlow = atxpService.createAtxpFlow('delete_agent', actualCost, mcpResponse);

      // Record tool usage with actual cost
      await storage.recordToolUsage({
        userId,
        toolName: "delete_agent",
        agentId,
        cost: actualCost.toString(),
        status: (mcpResponse as any)?.success !== false ? "success" : "error",
        request: { agentId, userId },
        response: mcpResponse,
      });

      res.json({
        ...mcpResponse,
        atxpFlow
      });
    } catch (error) {
      console.error("Delete agent error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // MCP tool execution routes - SDK-only integration
  app.post("/api/mcp/tools/:toolName", async (req, res) => {
    try {
      const { toolName } = req.params;
      const userId = req.body.userId || "user_demo_123";

      // Call MCP tool directly - it handles all payment processing via ATXP SDK
      const startTime = Date.now();
      let mcpResponse;
      let status = "success";
      let errorMessage;
      let actualCost = 0;

      try {
        // For user access tools, use the request body directly as arguments
        const toolArguments = (toolName === 'add_user_to_agent' || toolName === 'remove_user_from_agent') 
          ? { agentId: req.body.agentId, userEmail: req.body.userEmail }
          : req.body.arguments || {};
        
        mcpResponse = await mcpClient.callTool({
          name: toolName,
          arguments: toolArguments,
        });
        
        // Extract actual cost from MCP response
        if (mcpResponse && typeof mcpResponse === 'object') {
          if ('cost' in mcpResponse && typeof mcpResponse.cost === 'number') {
            actualCost = mcpResponse.cost;
          }
        }
      } catch (error) {
        status = "error";
        errorMessage = error instanceof Error ? error.message : "MCP call failed";
        mcpResponse = null;
        actualCost = 0;
      }

      const executionTime = Date.now() - startTime;

      // Create 5-step ATXP flow for user transparency
      const atxpFlow = atxpService.createAtxpFlow(toolName, actualCost, mcpResponse);

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

      if (status === "error") {
        return res.status(500).json({ error: errorMessage });
      }

      // Return the response with standard ATXP flow
      const responseData = mcpResponse && typeof mcpResponse === 'object' && 'success' in mcpResponse
        ? { ...mcpResponse, executionTime }
        : { success: true, response: mcpResponse, cost: actualCost, executionTime };
      
      res.json({
        ...responseData,
        atxpFlow
      });
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

  // Get current pricing from MCP server - SDK-only integration
  app.get("/api/pricing", async (req, res) => {
    try {
      const userId = req.query.userId as string || "user_demo_123";

      // Get pricing directly from MCP server - it handles payment via ATXP SDK
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
      const actualCost = pricingData?.cost || 0.001;

      // Create 5-step ATXP flow for user transparency
      const atxpFlow = atxpService.createAtxpFlow('get_pricing', actualCost, pricingData ? { success: true } : { success: false });

      // Record usage - use actual or expected cost
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
        atxpFlow
      });
    } catch (error) {
      console.error("Get pricing error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // ATXP status - simplified for SDK-only mode
  app.get("/api/atxp/status", async (req, res) => {
    try {
      const status = atxpService.getConnectionStatus();
      
      res.json({
        ...status,
        balance: 'Managed by MCP server via SDK'
      });
    } catch (error) {
      console.error("ATXP status error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Payment method toggle endpoint
  app.post("/api/payment-method", async (req, res) => {
    try {
      const { method } = req.body;
      
      if (!method || !['apikey', 'atxp'].includes(method)) {
        return res.status(400).json({ error: 'Invalid payment method. Must be "apikey" or "atxp"' });
      }

      // Update MCP client payment method
      mcpClient.setPaymentMethod(method);
      
      console.log(`Payment method changed to: ${method}`);
      
      res.json({
        success: true,
        paymentMethod: method,
        message: `Payment method set to ${method === 'apikey' ? 'Free Tier' : 'ATXP Billing'}`
      });
    } catch (error) {
      console.error("Payment method change error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Get current payment method
  app.get("/api/payment-method", async (req, res) => {
    try {
      const currentMethod = mcpClient.getPaymentMethod();
      
      res.json({
        paymentMethod: currentMethod,
        servers: {
          apikey: 'https://moluabi-mcp-server.replit.app',
          atxp: process.env.MOLUABI_MCP_ATXP_SERVER || 'https://moluabi-mcp-server.replit.app/atxp'
        }
      });
    } catch (error) {
      console.error("Get payment method error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // TEST: Call working ATXP server with our exact same client implementation
  app.get("/api/test-working-server", async (req, res) => {
    try {
      console.log('Testing our ATXP client against known working server');
      
      // Use our exact same ATXP implementation but call working server
      const result = await atxpService.callMcpTool(
        'https://image.mcp.atxp.ai',  // Working ATXP server
        'generate_image',  // Known working tool
        {
          prompt: 'test image',
          style: 'digital_art'
        }
      );
      
      console.log('Test against working server successful:', result);
      res.json({
        success: true,
        workingServerCall: result,
        message: 'Our ATXP client works with working servers - issue is with MoluAbi server ATXP integration'
      });
    } catch (error) {
      console.error('Test against working server failed:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Unknown error",
        message: 'Our ATXP client has issues - problem is on our side'
      });
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
