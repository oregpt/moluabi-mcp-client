interface LoadingOverlayProps {
  isVisible: boolean;
  message: string;
  cost: number;
}

export default function LoadingOverlay({ isVisible, message, cost }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center animate-fade-in">
      <div className="bg-card rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Processing Request</h3>
          <p className="text-sm text-muted-foreground mb-4">{message}</p>
          <div className="w-full bg-muted rounded-full h-2 mb-3">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-1000 animate-pulse" 
              style={{ width: '70%' }}
            ></div>
          </div>
          <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
            <i className="fas fa-dollar-sign text-accent"></i>
            <span>Estimated cost: ${cost.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
