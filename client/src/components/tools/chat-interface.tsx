import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Agent } from "@shared/schema";

interface Message {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  cost?: number;
  tokensUsed?: number;
}

interface ChatInterfaceProps {
  onExecute: (cost: number) => void;
  showLoading: (message: string) => void;
  hideLoading: () => void;
}

export default function ChatInterface({ onExecute, showLoading, hideLoading }: ChatInterfaceProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      type: 'system',
      content: 'Select an agent above to start chatting. Each message costs $0.05.',
      timestamp: new Date(),
    }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/agents?userId=user_demo_123");
      return response.json();
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { agentId: string; message: string }) => {
      const response = await apiRequest("POST", `/api/mcp/tools/prompt_agent`, {
        userId: "user_demo_123",
        agentId: parseInt(messageData.agentId),
        message: messageData.message,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      onExecute(0.05);
      
      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: variables.message,
        timestamp: new Date(),
      };
      
      // Add agent response
      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        type: 'agent',
        content: data.response?.content?.[0]?.text || "I received your message but couldn't generate a proper response.",
        timestamp: new Date(),
        cost: data.cost,
        tokensUsed: data.tokensUsed,
      };
      
      setMessages(prev => [...prev.slice(0, -1), userMessage, agentMessage]);
      setMessage("");
      hideLoading();
      
      toast({
        title: "Message sent successfully!",
        description: `Cost: $${data.cost.toFixed(2)}${data.tokensUsed ? ` • ${data.tokensUsed} tokens` : ''}`,
      });
    },
    onError: (error) => {
      hideLoading();
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedAgentId) {
      toast({
        title: "Invalid input",
        description: "Please select an agent and enter a message.",
        variant: "destructive",
      });
      return;
    }

    showLoading("Sending message to agent...");
    
    // Add loading message
    setMessages(prev => [...prev, {
      id: `loading-${Date.now()}`,
      type: 'system',
      content: 'Agent is thinking...',
      timestamp: new Date(),
    }]);

    sendMessageMutation.mutate({
      agentId: selectedAgentId,
      message: message.trim(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectedAgent = agents.find(agent => agent.id.toString() === selectedAgentId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getMessageIcon = (type: Message['type']) => {
    switch (type) {
      case 'user': return 'fas fa-user text-primary';
      case 'agent': return 'fas fa-robot text-accent';
      case 'system': return 'fas fa-info text-muted-foreground';
      default: return 'fas fa-circle';
    }
  };

  const getMessageBg = (type: Message['type']) => {
    switch (type) {
      case 'user': return 'bg-primary/5';
      case 'agent': return 'bg-accent/5';
      case 'system': return 'bg-muted';
      default: return 'bg-card';
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm h-[calc(100vh-200px)] flex flex-col animate-slide-up">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Chat with Agent</h3>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <i className="fas fa-dollar-sign text-accent"></i>
            <span>Per message: $0.05</span>
          </div>
        </div>
        
        {/* Agent Selection */}
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger data-testid="select-chat-agent">
                <SelectValue placeholder="Select an agent..." />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id.toString()}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            <i className="fas fa-robot mr-1"></i>
            <span>{selectedAgent ? selectedAgent.name : 'Ready to chat'}</span>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar" data-testid="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
              <i className={`${getMessageIcon(msg.type)} text-sm`}></i>
            </div>
            <div className="flex-1">
              <div className={`${getMessageBg(msg.type)} p-3 rounded-lg`}>
                <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
                {msg.cost && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <i className="fas fa-clock mr-1"></i>
                    {msg.tokensUsed && `Tokens used: ${msg.tokensUsed} • `}
                    Cost: ${msg.cost.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-6 border-t border-border">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <Textarea 
              placeholder="Type your message... (Ctrl+Enter to send)"
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="resize-none"
              data-testid="textarea-chat-message"
            />
          </div>
          <Button 
            onClick={handleSendMessage}
            disabled={!message.trim() || !selectedAgentId || sendMessageMutation.isPending}
            className="flex items-center space-x-2"
            data-testid="button-send-message"
          >
            <i className="fas fa-paper-plane"></i>
            <span>Send ($0.05)</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
