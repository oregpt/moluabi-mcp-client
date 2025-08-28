import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
        { name: 'days', type: 'number', label: 'Days to Report', placeholder: '7', required: true },
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
      onExecute(config.cost);
      toast({
        title: `${config.title} completed!`,
        description: `Operation successful. Cost: $${config.cost.toFixed(2)}`,
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
    showLoading(`Executing ${config.title.toLowerCase()}...`);
    toolMutation.mutate(data);
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
    </div>
  );
}
