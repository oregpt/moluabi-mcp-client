import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Agent } from "@shared/schema";

interface ListAgentsDisplayProps {
  onExecute: (cost: number) => void;
  showLoading: (message: string) => void;
  hideLoading: () => void;
}

export default function ListAgentsDisplay({ onExecute, showLoading, hideLoading }: ListAgentsDisplayProps) {
  const { toast } = useToast();

  const { data: agents = [], isLoading, error, refetch } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/agents?userId=user_demo_123");
      return response.json();
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      showLoading("Refreshing agents list...");
      await refetch();
      return true;
    },
    onSuccess: () => {
      onExecute(0.05);
      toast({
        title: "Agents list refreshed!",
        description: `Found ${agents.length} agents. Cost: $0.05`,
      });
      hideLoading();
    },
    onError: (error) => {
      toast({
        title: "Failed to refresh agents",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      hideLoading();
    },
  });

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return d.toLocaleDateString();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'file-based': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'team': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'hybrid': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-destructive text-2xl mb-4"></i>
          <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Agents</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Failed to load agents'}
          </p>
          <Button onClick={handleRefresh} data-testid="button-retry">
            <i className="fas fa-sync-alt mr-2"></i>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm animate-slide-up">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Your Agents</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <i className="fas fa-dollar-sign text-accent"></i>
              <span>Cost: $0.05</span>
            </div>
            <Button 
              onClick={handleRefresh}
              disabled={refreshMutation.isPending}
              size="sm"
              data-testid="button-refresh-agents"
            >
              <i className={`fas fa-sync-alt mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`}></i>
              Refresh List ($0.05)
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          View and manage all accessible agents.
        </p>
      </div>

      {isLoading ? (
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="w-16 h-6 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </div>
      ) : agents.length === 0 ? (
        <div className="p-6 text-center">
          <i className="fas fa-robot text-muted-foreground text-3xl mb-4"></i>
          <h3 className="text-lg font-semibold text-foreground mb-2">No Agents Found</h3>
          <p className="text-sm text-muted-foreground">
            You haven't created any agents yet. Create your first agent to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                        <i className="fas fa-robot text-primary text-sm"></i>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {agent.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {agent.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={getTypeColor(agent.type)}>
                      {agent.type}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className="bg-accent/10 text-accent">
                      Active
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {formatDate(agent.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                        data-testid={`button-view-agent-${agent.id}`}
                        title="View agent"
                      >
                        <i className="fas fa-eye text-sm"></i>
                      </button>
                      <button 
                        className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                        data-testid={`button-edit-agent-${agent.id}`}
                        title="Edit agent"
                      >
                        <i className="fas fa-edit text-sm"></i>
                      </button>
                      <button 
                        className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                        data-testid={`button-delete-agent-${agent.id}`}
                        title="Delete agent"
                      >
                        <i className="fas fa-trash text-sm"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
