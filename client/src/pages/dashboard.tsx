import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import CreateAgentForm from "@/components/tools/create-agent-form";
import ListAgentsDisplay from "@/components/tools/list-agents-display";
import ChatInterface from "@/components/tools/chat-interface";
import DynamicToolForm from "@/components/tools/dynamic-tool-form";
import LoadingOverlay from "@/components/ui/loading-overlay";
import { useCostTracker } from "@/hooks/use-cost-tracker";
import { useWebSocket } from "@/hooks/use-websocket";

type ToolType = 
  | 'create_agent' 
  | 'list_agents' 
  | 'get_agent' 
  | 'update_agent' 
  | 'delete_agent'
  | 'add_user_to_agent' 
  | 'remove_user_from_agent' 
  | 'prompt_agent' 
  | 'upload_file_to_agent' 
  | 'get_usage_report';

export default function Dashboard() {
  const [currentTool, setCurrentTool] = useState<ToolType>('create_agent');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const { totalSpent, sessionSpent, addCost } = useCostTracker();
  const { connected: wsConnected } = useWebSocket();

  const toolConfigs = {
    create_agent: {
      title: 'Create Agent',
      description: 'Build a new AI assistant with custom instructions',
      cost: 0.05
    },
    list_agents: {
      title: 'List Agents',
      description: 'View and manage all accessible agents',
      cost: 0.05
    },
    get_agent: {
      title: 'View Agent',
      description: 'Retrieve detailed information about an agent',
      cost: 0.05
    },
    update_agent: {
      title: 'Update Agent',
      description: 'Modify agent settings and instructions',
      cost: 0.05
    },
    delete_agent: {
      title: 'Delete Agent',
      description: 'Permanently remove an agent and its data',
      cost: 0.05
    },
    add_user_to_agent: {
      title: 'Add User Access',
      description: 'Grant a user access to an agent',
      cost: 0.05
    },
    remove_user_from_agent: {
      title: 'Remove User Access',
      description: 'Revoke user access from an agent',
      cost: 0.05
    },
    prompt_agent: {
      title: 'Chat with Agent',
      description: 'Send messages and get AI-powered responses',
      cost: 0.05
    },
    upload_file_to_agent: {
      title: 'Upload File',
      description: 'Add documents to an agent\'s knowledge base',
      cost: 0.05
    },
    get_usage_report: {
      title: 'Usage Report',
      description: 'View token consumption and cost analytics',
      cost: 0.05
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
        onToolChange={setCurrentTool}
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
    </div>
  );
}
