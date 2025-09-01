import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import CreateAgentForm from "@/components/tools/create-agent-form";
import ListAgentsDisplay from "@/components/tools/list-agents-display";
import ChatInterface from "@/components/tools/chat-interface";
import DynamicToolForm from "@/components/tools/dynamic-tool-form";
import LoadingOverlay from "@/components/ui/loading-overlay";
import { AtxpFlowMonitor } from "@/components/layout/atxp-flow-monitor";
import { useCostTracker } from "@/hooks/use-cost-tracker";
import { useWebSocket } from "@/hooks/use-websocket";
import { apiRequest, queryClient } from "@/lib/queryClient";

type ToolType = 
  | 'create_agent' 
  | 'list_agents' 
  | 'get_agent' 
  | 'update_agent' 
  | 'delete_agent'
  | 'add_user_to_agent' 
  | 'remove_user_from_agent' 
  | 'prompt_agent' 
 
  | 'get_usage_report'
  | 'refresh_pricing';

export default function Dashboard() {
  const [currentTool, setCurrentTool] = useState<ToolType>('create_agent');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const { totalSpent, sessionSpent, addCost } = useCostTracker();
  const { connected: wsConnected } = useWebSocket();

  // Fetch current pricing from MCP server
  const { data: pricingData, refetch: refetchPricing } = useQuery({
    queryKey: ['/api/pricing'],
    enabled: false, // Only fetch when manually triggered
  });

  // No default pricing - must come from real MCP server
  const pricingResponse = pricingData as any;
  const pricingStructure = pricingResponse?.pricing?.pricing || {};
  const currentPricing: Record<string, number> = pricingStructure?.operations || {};

  const toolConfigs = {
    create_agent: {
      title: 'Create Agent',
      description: 'Build a new AI assistant with custom instructions',
      cost: currentPricing.create_agent || 0
    },
    list_agents: {
      title: 'List Agents',
      description: 'View and manage all accessible agents',
      cost: currentPricing.list_agents || 0
    },
    get_agent: {
      title: 'View Agent',
      description: 'Retrieve detailed information about an agent',
      cost: currentPricing.get_agent || 0
    },
    update_agent: {
      title: 'Update Agent',
      description: 'Modify agent settings and instructions',
      cost: currentPricing.update_agent || 0
    },
    delete_agent: {
      title: 'Delete Agent',
      description: 'Permanently remove an agent and its data',
      cost: currentPricing.delete_agent || 0
    },
    add_user_to_agent: {
      title: 'Assign User to Agent',
      description: 'Grant a user access to an agent',
      cost: currentPricing.add_user_to_agent || 0.005
    },
    remove_user_from_agent: {
      title: 'Unassign User From Agent',
      description: 'Revoke user access from an agent',
      cost: currentPricing.remove_user_from_agent || 0.005
    },
    prompt_agent: {
      title: 'Chat with Agent',
      description: 'Send messages and get AI-powered responses',
      cost: currentPricing.prompt_agent || 0
    },
    get_usage_report: {
      title: 'Usage Report',
      description: 'View token consumption and cost analytics',
      cost: currentPricing.get_usage_report || 0.002
    },
    refresh_pricing: {
      title: 'Refresh Pricing',
      description: 'Get latest pricing information from MCP server',
      cost: currentPricing.get_pricing || 0.001
    }
  };

  const currentConfig = toolConfigs[currentTool];

  const showLoading = (message: string) => {
    setLoadingMessage(message);
    setIsLoading(true);
  };

  const hideLoading = () => {
    setIsLoading(false);
    setLoadingMessage("");
  };

  const handleToolExecution = async (cost: number) => {
    addCost(cost);
  };

  const handleRefreshPricing = async () => {
    try {
      showLoading("Fetching latest pricing from MCP server...");
      const result = await refetchPricing();
      if (result.data) {
        const responseData = result.data as any;
        
        // Check for payment failure in ATXP mode
        let hasPaymentFailure = false;
        if (responseData?.content && Array.isArray(responseData.content) && responseData.content[0]?.text) {
          hasPaymentFailure = responseData.content[0].text.includes('[PAYMENT_FAILED]');
        }
        
        // Get current payment method
        const paymentMethodResponse = await fetch('/api/payment-method');
        const paymentMethodData = await paymentMethodResponse.json();
        const paymentMethod = paymentMethodData.paymentMethod || 'apikey';
        
        // If ATXP mode and payment failed, don't process the pricing data
        if (paymentMethod === 'atxp' && hasPaymentFailure) {
          hideLoading();
          // Don't add to cost tracker or process data
          return;
        }
        
        // Add cost for the pricing call
        addCost(responseData?.cost || 0);
        
        // Handle ATXP flow data from pricing response
        if (responseData?.atxpFlow) {
          console.log('📋 Found ATXP flow data in pricing response:', responseData.atxpFlow);
          setTimeout(() => {
            if ((window as any).updateAtxpFlow) {
              console.log('📋 Calling updateAtxpFlow from pricing');
              (window as any).updateAtxpFlow(responseData.atxpFlow);
            }
          }, 500);
        }
      }
      hideLoading();
    } catch (error) {
      console.error('Failed to refresh pricing:', error);
      hideLoading();
    }
  };

  const renderToolContent = () => {
    switch (currentTool) {
      case 'create_agent':
        return (
          <CreateAgentForm 
            onExecute={handleToolExecution}
            showLoading={showLoading}
            hideLoading={hideLoading}
          />
        );
      case 'list_agents':
        return (
          <ListAgentsDisplay 
            onExecute={handleToolExecution}
            showLoading={showLoading}
            hideLoading={hideLoading}
          />
        );
      case 'prompt_agent':
        return (
          <ChatInterface 
            onExecute={handleToolExecution}
            showLoading={showLoading}
            hideLoading={hideLoading}
          />
        );
      case 'refresh_pricing':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <button
                onClick={handleRefreshPricing}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
                data-testid="view-price-list-button"
              >
                View Price List
              </button>
              <p className="text-muted-foreground mt-2">
                View current pricing for all available services
              </p>
            </div>
            {pricingData && pricingStructure ? (
              <div className="space-y-6">
                {/* Models Pricing */}
                {pricingStructure.models && Object.keys(pricingStructure.models).length > 0 && (
                  <div className="bg-card rounded-lg p-4 border">
                    <h3 className="text-lg font-medium mb-4">Models (per 1K tokens)</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {Object.entries(pricingStructure.models).map(([model, costs]: [string, any]) => (
                        <div key={model} className="bg-muted/50 rounded p-3">
                          <div className="font-medium mb-2">{model}</div>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Input:</span>
                              <span>${costs.inputCost?.toFixed(4) || '0.0000'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Output:</span>
                              <span>${costs.outputCost?.toFixed(4) || '0.0000'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Operations Pricing */}
                {currentPricing && Object.keys(currentPricing).length > 0 && (
                  <div className="bg-card rounded-lg p-4 border">
                    <h3 className="text-lg font-medium mb-4">Operations</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(currentPricing).map(([operation, cost]) => (
                        <div key={operation} className="flex justify-between">
                          <span className="text-muted-foreground">{operation.replace(/_/g, ' ')}</span>
                          <span className="font-medium">${typeof cost === 'number' ? cost.toFixed(3) : '0.000'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        );
      default:
        return (
          <DynamicToolForm 
            toolName={currentTool}
            config={currentConfig}
            onExecute={handleToolExecution}
            showLoading={showLoading}
            hideLoading={hideLoading}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar 
        currentTool={currentTool}
        onToolChange={(tool: string) => setCurrentTool(tool as ToolType)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        totalSpent={totalSpent}
        sessionSpent={sessionSpent}
      />

      <div className="lg:ml-72">
        <Header 
          title={currentConfig.title}
          description={currentConfig.description}
          cost={currentConfig.cost}
          onMenuToggle={() => setSidebarOpen(true)}
        />

        <main className="p-6">
          <div className="max-w-4xl mx-auto animate-fade-in">
            {renderToolContent()}
          </div>
        </main>
      </div>

      <LoadingOverlay 
        isVisible={isLoading}
        message={loadingMessage}
        cost={currentConfig.cost}
      />
      
      <AtxpFlowMonitor />
    </div>
  );
}
