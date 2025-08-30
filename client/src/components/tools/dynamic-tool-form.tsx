import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ToolConfig {
  title: string;
  description: string;
  cost: number;
}

interface FormField {
  name: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'date' | 'file';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  accept?: string;
}

interface DynamicToolFormProps {
  toolName: string;
  config: ToolConfig;
  onExecute: (cost: number) => void;
  showLoading: (message: string) => void;
  hideLoading: () => void;
}

const getFieldsForTool = (toolName: string): FormField[] => {
  switch (toolName) {
    case 'create_agent':
      return [
        { name: 'name', type: 'text', label: 'Agent Name', placeholder: 'My New Agent', required: true },
        { name: 'description', type: 'text', label: 'Description', placeholder: 'Agent for customer support', required: true },
        { name: 'type', type: 'select', label: 'Agent Type', required: true, options: [
          { value: 'file-based', label: 'File-based' },
          { value: 'conversation', label: 'Conversation' },
          { value: 'hybrid', label: 'Hybrid' }
        ]},
      ];
    
    case 'get_agent':
      return [
        { name: 'agentId', type: 'number', label: 'Agent ID', placeholder: 'Enter agent ID', required: true },
      ];
    
    case 'update_agent':
      return [
        { name: 'agentId', type: 'number', label: 'Agent ID', placeholder: 'ID of agent to update', required: true },
        { name: 'name', type: 'text', label: 'New Name', placeholder: 'Updated agent name' },
        { name: 'description', type: 'text', label: 'New Description', placeholder: 'Updated description' },
        { name: 'instructions', type: 'textarea', label: 'New Instructions', placeholder: 'Updated instructions' },
      ];
    
    case 'delete_agent':
      return [
        { name: 'agentId', type: 'number', label: 'Agent ID', placeholder: 'ID of agent to delete', required: true },
      ];
    
    case 'add_user_to_agent':
      return [
        { name: 'agentId', type: 'number', label: 'Agent ID', placeholder: 'ID of the target agent', required: true },
        { name: 'userEmail', type: 'email', label: 'User Email', placeholder: 'user@example.com', required: true },
      ];
    
    case 'remove_user_from_agent':
      return [
        { name: 'agentId', type: 'number', label: 'Agent ID', placeholder: 'ID of the target agent', required: true },
        { name: 'userEmail', type: 'email', label: 'User Email', placeholder: 'user@example.com', required: true },
      ];
    
    case 'prompt_agent':
      return [
        { name: 'agentId', type: 'number', label: 'Agent ID', placeholder: 'ID of agent to chat with', required: true },
        { name: 'message', type: 'textarea', label: 'Message', placeholder: 'Hello! How can you help me?', required: true },
        { name: 'model', type: 'select', label: 'Model (Optional)', options: [
          { value: 'gpt-5', label: 'GPT-5' },
          { value: 'claude', label: 'Claude' },
          { value: 'grok', label: 'Grok' }
        ]},
      ];
    
    case 'get_usage_report':
      return [
        { name: 'days', type: 'number', label: 'Last X Days', placeholder: '7', required: true },
      ];
    
    default:
      return [];
  }
};

export default function DynamicToolForm({ 
  toolName, 
  config, 
  onExecute, 
  showLoading, 
  hideLoading 
}: DynamicToolFormProps) {
  const { toast } = useToast();
  const [result, setResult] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteData, setPendingDeleteData] = useState<any>(null);
  const fields = getFieldsForTool(toolName);
  
  const form = useForm({
    defaultValues: fields.reduce((acc, field) => {
      acc[field.name] = field.type === 'checkbox' ? false : '';
      return acc;
    }, {} as Record<string, any>),
  });

  const toolMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const formData = { ...data, userId: "user_demo_123" };
      
      // Debug logs removed - user access tools are now working
      
      let endpoint: string;
      let method: string;
      
      switch (toolName) {
        case 'get_agent':
          endpoint = `/api/agents/${data.agentId}?userId=user_demo_123`;
          method = "GET";
          break;
        case 'update_agent':
          endpoint = `/api/agents/${data.agentId}`;
          method = "PUT";
          break;
        case 'delete_agent':
          endpoint = `/api/agents/${data.agentId}?userId=user_demo_123`;
          method = "DELETE";
          break;
        case 'get_usage_report':
          endpoint = `/api/mcp/tools/${toolName}`;
          method = "POST";
          break;
        default:
          endpoint = `/api/mcp/tools/${toolName}`;
          method = "POST";
          break;
      }
      
      const response = await apiRequest(method, endpoint, method === "GET" ? undefined : formData);
      return response.json();
    },
    onSuccess: (data) => {
      // Use actual cost from MCP response if available, fallback to config cost
      const actualCost = data?.cost || config.cost || 0;
      onExecute(actualCost);
      
      // Store result for display in UI
      setResult(data);
      
      // Enhanced logging for debugging
      console.log(`✅ ${config.title} Result:`, JSON.stringify(data, null, 2));
      
      // Handle ATXP flow data from API response
      if (data && data.atxpFlow && data.atxpFlow.steps) {
        console.log('📋 Found ATXP flow data in tool response:', data.atxpFlow);
        
        // Trigger ATXP flow monitor update
        if ((window as any).updateAtxpFlow) {
          (window as any).updateAtxpFlow(data.atxpFlow);
        }
        
        // Also dispatch custom event
        window.dispatchEvent(new CustomEvent('atxp-flow-update', { 
          detail: data.atxpFlow 
        }));
      }
      
      // Debug user access operations are now logged in the mutation function
      
      // Better toast with actual result info - use actual cost
      let description = `Operation successful. Cost: $${actualCost.toFixed(3)}`;
      
      // Add specific result details based on tool type
      if (toolName === 'get_usage_report' && data?.report) {
        const usage = data.report.usage || data.report;
        description += ` | Requests: ${usage.totalRequests || 0}, Tokens: ${usage.totalTokens || 0}`;
      } else if (toolName === 'get_agent' && data?.agent) {
        const agent = data.agent.agent || data.agent;
        description += ` | Agent: ${agent.name || 'Unknown'} (ID: ${agent.id || 'N/A'})`;
      } else if (toolName === 'create_agent' && data?.agent) {
        const agent = data.agent.agent || data.agent;
        description += ` | Created Agent ID: ${agent.id || 'N/A'}`;
      } else if (toolName === 'update_agent' && data?.agent) {
        const agent = data.agent.agent || data.agent;
        description += ` | Updated Agent: ${agent.name || 'Unknown'}`;
      } else if (toolName === 'delete_agent' && data?.success) {
        description += ` | Agent deleted successfully`;
      }
      
      toast({
        title: `${config.title} completed!`,
        description,
      });
      
      // Reset form for most operations
      if (!['get_agent', 'get_usage_report'].includes(toolName)) {
        form.reset();
      }
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/usage'] });
      
      hideLoading();
    },
    onError: (error) => {
      toast({
        title: `${config.title} failed`,
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      hideLoading();
    },
  });

  const onSubmit = async (data: Record<string, any>) => {
    // Show confirmation modal for delete operations
    if (toolName === 'delete_agent') {
      setPendingDeleteData(data);
      setShowDeleteConfirm(true);
      return;
    }
    
    showLoading(`Executing ${config.title.toLowerCase()}...`);
    toolMutation.mutate(data);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    showLoading(`Executing ${config.title.toLowerCase()}...`);
    toolMutation.mutate(pendingDeleteData);
    setPendingDeleteData(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setPendingDeleteData(null);
  };

  const renderField = (field: FormField) => {
    return (
      <FormField
        key={field.name}
        control={form.control}
        name={field.name}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>{field.label} {field.required && '*'}</FormLabel>
            <FormControl>
              {field.type === 'textarea' ? (
                <Textarea 
                  placeholder={field.placeholder}
                  rows={4}
                  className="resize-none"
                  data-testid={`textarea-${field.name}`}
                  {...formField}
                />
              ) : field.type === 'select' ? (
                <Select onValueChange={formField.onChange} value={formField.value}>
                  <SelectTrigger data-testid={`select-${field.name}`}>
                    <SelectValue placeholder={field.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === 'checkbox' ? (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formField.value}
                    onCheckedChange={formField.onChange}
                    data-testid={`checkbox-${field.name}`}
                  />
                  <span className="text-sm">{field.label}</span>
                </div>
              ) : field.type === 'file' ? (
                <Input
                  type="file"
                  accept={field.accept}
                  data-testid={`file-${field.name}`}
                  onChange={(e) => formField.onChange(e.target.files?.[0])}
                />
              ) : (
                <Input 
                  type={field.type}
                  placeholder={field.placeholder}
                  data-testid={`input-${field.name}`}
                  {...formField}
                  onChange={(e) => {
                    const value = field.type === 'number' ? 
                      (e.target.value ? parseInt(e.target.value) : '') : 
                      e.target.value;
                    formField.onChange(value);
                  }}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  if (fields.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 shadow-sm text-center">
        <i className="fas fa-tools text-muted-foreground text-3xl mb-4"></i>
        <h3 className="text-lg font-semibold text-foreground mb-2">Tool Not Implemented</h3>
        <p className="text-sm text-muted-foreground">
          The {config.title} tool is not yet available in this interface.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-sm animate-slide-up">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">{config.title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {config.description}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            {fields.map(renderField)}
          </div>

          {/* Organization info will be shown in results after execution */}

          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
            <Button 
              type="button" 
              variant="ghost"
              onClick={() => form.reset()}
              data-testid={`button-cancel-${toolName}`}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={toolMutation.isPending}
              className={`flex items-center space-x-2 ${
                toolName === 'delete_agent' ? 'bg-destructive hover:bg-destructive/90' : ''
              }`}
              data-testid={`button-execute-${toolName}`}
            >
              <i className={`fas fa-${toolName === 'delete_agent' ? 'trash' : 'play'} w-4`}></i>
              <span>Execute Tool</span>
            </Button>
          </div>
        </form>
      </Form>
      
      {/* Results Display for View Agent and Usage Report */}
      {result && (toolName === 'get_agent' || toolName === 'get_usage_report') && (
        <div className="mt-6 bg-card rounded-lg border border-border p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <i className="fas fa-chart-line mr-2"></i>
            {toolName === 'get_agent' ? 'Agent Details' : 'Usage Report'}
          </h4>
          
          {toolName === 'get_agent' && result?.agent?.agent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Agent ID</p>
                  <p className="text-lg font-mono text-primary">#{result.agent.agent.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-lg text-foreground">{result.agent.agent.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="text-lg text-foreground">{result.agent.agent.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="text-lg text-green-600">
                    {result.agent.agent.isPublic ? 'Public' : 'Private'}
                  </p>
                </div>
              </div>
              
              {result.agent.agent.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-foreground">{result.agent.agent.description}</p>
                </div>
              )}
              
              {result.agent.agent.instructions && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Instructions</p>
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <pre className="text-sm text-foreground whitespace-pre-wrap">{result.agent.agent.instructions}</pre>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-sm text-foreground">
                    {new Date(result.agent.agent.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                  <p className="text-sm text-foreground">
                    {new Date(result.agent.agent.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {toolName === 'get_usage_report' && result?.report?.usage && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {result.report.usage.totalRequests || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {result.report.usage.totalTokens || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Tokens</p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    ${result.report.usage.totalCost || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                </div>
              </div>
              
              {result.report.usage.breakdown && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Usage Breakdown</p>
                  <div className="space-y-2">
                    {Object.entries(result.report.usage.breakdown).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm text-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-medium text-primary">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
            Operation Cost: ${result.cost || 0} | Organization: {result.organizationId === 'org-1756358727237' ? 'ATXP Playground' : result.organizationId || 'N/A'}
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-destructive">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              Confirm Agent Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete Agent ID #{pendingDeleteData?.agentId}?
              <br /><br />
              <strong>This action cannot be undone.</strong> The agent and all its data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              <i className="fas fa-trash mr-2"></i>
              Delete Agent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
