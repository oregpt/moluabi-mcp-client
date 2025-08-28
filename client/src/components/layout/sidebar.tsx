import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SidebarProps {
  currentTool: string;
  onToolChange: (tool: string) => void;
  isOpen: boolean;
  onClose: () => void;
  totalSpent: number;
  sessionSpent: number;
}

export default function Sidebar({ 
  currentTool, 
  onToolChange, 
  isOpen, 
  onClose, 
  totalSpent, 
  sessionSpent 
}: SidebarProps) {
  const { data: atxpStatus } = useQuery({
    queryKey: ['/api/atxp/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const navItems = [
    { id: 'create_agent', label: 'Create Agent', icon: 'fas fa-plus-circle' },
    { id: 'list_agents', label: 'List Agents', icon: 'fas fa-list' },
    { id: 'get_agent', label: 'View Agent', icon: 'fas fa-eye' },
    { id: 'update_agent', label: 'Update Agent', icon: 'fas fa-edit' },
    { id: 'delete_agent', label: 'Delete Agent', icon: 'fas fa-trash', destructive: true },
    { id: 'add_user_to_agent', label: 'Assign User to Agent', icon: 'fas fa-user-plus' },
    { id: 'remove_user_from_agent', label: 'Unassign User From Agent', icon: 'fas fa-user-minus' },
    // { id: 'prompt_agent', label: 'Chat with Agent', icon: 'fas fa-comment-dots' }, // Temporarily hidden
    { id: 'get_usage_report', label: 'Usage Report', icon: 'fas fa-chart-bar' },
    { id: 'refresh_pricing', label: 'Refresh Pricing', icon: 'fas fa-dollar-sign' },
  ];

  const handleNavClick = (toolId: string) => {
    onToolChange(toolId);
    onClose();
  };

  return (
    <div 
      className={`fixed left-0 top-0 h-full w-72 bg-card border-r border-border transform transition-transform duration-300 ease-in-out z-50 overflow-y-auto custom-scrollbar ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="p-6">
        {/* Logo and Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-robot text-primary-foreground text-lg"></i>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">MoluAbi</h1>
              <p className="text-sm text-muted-foreground">MCP Client</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-secondary rounded-md"
            data-testid="close-sidebar"
          >
            <i className="fas fa-times text-muted-foreground"></i>
          </button>
        </div>

        {/* ATXP Connection Status */}
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-foreground">ATXP Status</h3>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full animate-pulse-slow ${
                (atxpStatus as any)?.connected ? 'bg-accent' : 'bg-destructive'
              }`}></div>
              <span className={`text-xs font-medium ${
                (atxpStatus as any)?.connected ? 'text-accent' : 'text-destructive'
              }`}>
                {(atxpStatus as any)?.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {(atxpStatus as any)?.accountId || 'No account connected'}
          </div>
        </div>

        {/* Cost Tracking */}
        <div className="mb-6 p-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg border border-primary/20">
          <h3 className="text-sm font-medium text-foreground mb-3">Cost Tracking</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Session Total</span>
              <span className="text-sm font-semibold text-foreground">${sessionSpent.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">All Time</span>
              <span className="text-sm font-semibold text-foreground">${totalSpent.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Variable Pricing</span>
              <span className="text-xs font-medium text-accent">Dynamic</span>
            </div>
            {(atxpStatus as any)?.balance !== undefined && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Balance</span>
                <span className="text-xs font-medium text-primary">${(atxpStatus as any).balance.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">MCP Tools</h3>
          
          {/* Agent Management Tools */}
          <div className="space-y-1 mb-3">
            {navItems.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentTool === item.id
                    ? 'bg-primary text-primary-foreground'
                    : item.destructive
                    ? 'text-destructive hover:text-destructive-foreground hover:bg-destructive/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
                data-testid={`nav-${item.id}`}
              >
                <i className={`${item.icon} w-4`}></i>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-border my-3"></div>

          {/* User Management Tools */}
          <div className="space-y-1 mb-3">
            {navItems.slice(5, 7).map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentTool === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
                data-testid={`nav-${item.id}`}
              >
                <i className={`${item.icon} w-4`}></i>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-border my-3"></div>

          {/* Interaction Tools */}
          <div className="space-y-1 mb-3">
            {navItems.slice(7, 10).map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentTool === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
                data-testid={`nav-${item.id}`}
              >
                <i className={`${item.icon} w-4`}></i>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-border my-3"></div>

          {/* Pricing Tool */}
          <div className="space-y-1">
            {navItems.slice(10).map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentTool === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
                data-testid={`nav-${item.id}`}
              >
                <i className={`${item.icon} w-4`}></i>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
