import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ToastNotifications() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            toast p-4 rounded-lg shadow-lg flex items-center space-x-3 
            transform transition-all duration-300 min-w-80 max-w-md
            ${toast.variant === 'destructive' 
              ? 'bg-destructive text-destructive-foreground' 
              : 'bg-accent text-accent-foreground'
            }
            animate-slide-up
          `}
          data-testid={`toast-${toast.id}`}
        >
          <i className={`fas fa-${
            toast.variant === 'destructive' ? 'exclamation-triangle' : 'check-circle'
          }`}></i>
          <div className="flex-1">
            <p className="font-medium">{toast.title}</p>
            {toast.description && (
              <p className="text-sm opacity-90">{toast.description}</p>
            )}
          </div>
          <button 
            className="text-current hover:bg-black/10 rounded p-1"
            onClick={() => toast.dismiss?.()}
            data-testid={`toast-close-${toast.id}`}
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>
      ))}
    </div>
  );
}
