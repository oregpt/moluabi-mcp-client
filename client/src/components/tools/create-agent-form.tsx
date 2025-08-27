import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const createAgentSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  description: z.string().optional(),
  instructions: z.string().min(1, "Instructions are required"),
  type: z.enum(["file-based", "team", "hybrid", "chat-based"], {
    required_error: "Please select an agent type",
  }),
  isPublic: z.boolean().default(false),
  isShareable: z.boolean().default(true),
});

type CreateAgentForm = z.infer<typeof createAgentSchema>;

interface CreateAgentFormProps {
  onExecute: (cost: number) => void;
  showLoading: (message: string) => void;
  hideLoading: () => void;
}

export default function CreateAgentForm({ onExecute, showLoading, hideLoading }: CreateAgentFormProps) {
  const { toast } = useToast();
  
  const form = useForm<CreateAgentForm>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      name: "",
      description: "",
      instructions: "",
      type: undefined,
      isPublic: false,
      isShareable: true,
    },
  });

  const createAgentMutation = useMutation({
    mutationFn: async (data: CreateAgentForm) => {
      const response = await apiRequest("POST", "/api/agents", {
        ...data,
        userId: "user_demo_123", // In production, get from auth context
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Use actual cost if available, fallback to 0.05
      const actualCost = data.cost || 0.05;
      onExecute(actualCost);
      toast({
        title: "Agent created successfully!",
        description: `${data.name} is ready to use. Cost: $${actualCost}`,
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      hideLoading();
    },
    onError: (error) => {
      toast({
        title: "Failed to create agent",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      hideLoading();
    },
  });

  const onSubmit = async (data: CreateAgentForm) => {
    showLoading("Creating agent...");
    createAgentMutation.mutate(data);
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-sm animate-slide-up">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Create New Agent</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Build a new AI assistant with custom instructions and capabilities.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Customer Support Bot"
                      data-testid="input-agent-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-agent-type">
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="chat-based">Chat-based</SelectItem>
                      <SelectItem value="file-based">File-based</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Brief description of the agent's purpose"
                    data-testid="input-agent-description"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="instructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instructions *</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Detailed instructions for how the agent should behave..."
                    rows={6}
                    className="resize-none"
                    data-testid="textarea-agent-instructions"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Provide clear, specific instructions for your agent's behavior and capabilities.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-is-public"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Make this agent public
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Public agents can be discovered and used by other users.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isShareable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-is-shareable"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Allow sharing
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Shareable agents can be shared with specific users.
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
            <Button 
              type="button" 
              variant="ghost"
              onClick={() => form.reset()}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createAgentMutation.isPending}
              className="flex items-center space-x-2"
              data-testid="button-create-agent"
            >
              <i className="fas fa-plus w-4"></i>
              <span>Create Agent</span>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
