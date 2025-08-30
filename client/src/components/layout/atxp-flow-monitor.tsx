import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Activity, Clock, Check, AlertTriangle, X, Trash2 } from 'lucide-react';

interface AtxpFlowStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'success' | 'warning' | 'error';
  timestamp: Date;
  details?: string;
  cost?: number;
  duration?: number;
}

interface AtxpFlowMonitorProps {
  isVisible?: boolean;
}

export function AtxpFlowMonitor({ isVisible = true }: AtxpFlowMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [steps, setSteps] = useState<AtxpFlowStep[]>([]);
  const [currentOperation, setCurrentOperation] = useState<string | null>(null);

  // Listen for WebSocket events
  useEffect(() => {
    const handleAtxpEvent = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'atxp-flow') {
          const step: AtxpFlowStep = {
            id: data.stepId || `step-${Date.now()}`,
            label: data.label,
            status: data.status,
            timestamp: new Date(),
            details: data.details,
            cost: data.cost,
            duration: data.duration
          };
          
          setSteps(prev => {
            // Update existing step or add new one
            const existingIndex = prev.findIndex(s => s.id === step.id);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = step;
              return updated;
            }
            return [...prev, step];
          });

          // Auto-expand during operations
          if (data.status === 'in-progress') {
            setIsExpanded(true);
            setCurrentOperation(data.operation || null);
          }
          
          // Auto-minimize after completion (with delay)
          if (data.status === 'success' || data.status === 'error') {
            setCurrentOperation(null);
            setTimeout(() => setIsExpanded(false), 3000);
          }
        }
      } catch (error) {
        console.error('Failed to parse ATXP flow event:', error);
      }
    };

    // Connect to existing WebSocket
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.addEventListener('message', handleAtxpEvent);
    
    return () => {
      socket.removeEventListener('message', handleAtxpEvent);
      socket.close();
    };
  }, []);

  const getStepIcon = (status: AtxpFlowStep['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-3 h-3 text-muted-foreground" />;
      case 'in-progress': return <Activity className="w-3 h-3 text-blue-500 animate-spin" />;
      case 'success': return <Check className="w-3 h-3 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-3 h-3 text-orange-500" />;
      case 'error': return <X className="w-3 h-3 text-red-500" />;
    }
  };

  const getStepColor = (status: AtxpFlowStep['status']) => {
    switch (status) {
      case 'pending': return 'border-gray-300 bg-gray-50';
      case 'in-progress': return 'border-blue-400 bg-blue-50';
      case 'success': return 'border-green-400 bg-green-50';
      case 'warning': return 'border-orange-400 bg-orange-50';
      case 'error': return 'border-red-400 bg-red-50';
    }
  };

  const clearLogs = () => {
    setSteps([]);
    setCurrentOperation(null);
  };

  if (!isVisible) return null;

  const hasActiveOperation = currentOperation || steps.some(s => s.status === 'in-progress');
  const recentSteps = steps.slice(-10); // Show last 10 steps

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border transition-all duration-300 ease-in-out ${
      isExpanded ? 'h-80' : 'h-12'
    }`}>
      {/* Header Bar - Always Visible */}
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="atxp-flow-toggle"
      >
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Activity className={`w-4 h-4 ${hasActiveOperation ? 'text-blue-500 animate-pulse' : 'text-muted-foreground'}`} />
            <span className="text-sm font-medium text-foreground">ATXP Flow Monitor</span>
          </div>
          
          {currentOperation && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">{currentOperation}</span>
            </div>
          )}
          
          {!currentOperation && steps.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {steps.length} operation{steps.length !== 1 ? 's' : ''} logged
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {steps.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearLogs();
              }}
              className="p-1 hover:bg-secondary rounded-md transition-colors"
              data-testid="clear-atxp-logs"
              title="Clear logs"
            >
              <Trash2 className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 h-64 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            {recentSteps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No ATXP operations yet</p>
                <p className="text-xs">Execute any MCP tool to see the payment flow</p>
              </div>
            ) : (
              recentSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg border transition-all duration-200 ${getStepColor(step.status)}`}
                  data-testid={`atxp-step-${step.id}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getStepIcon(step.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">
                        {step.label}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        {step.cost !== undefined && (
                          <span className="font-mono">${step.cost.toFixed(3)}</span>
                        )}
                        {step.duration !== undefined && (
                          <span>{step.duration}ms</span>
                        )}
                        <span>{step.timestamp.toLocaleTimeString()}</span>
                      </div>
                    </div>
                    
                    {step.details && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {step.details}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}