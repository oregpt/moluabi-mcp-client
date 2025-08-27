import { useState, useEffect } from "react";

interface CostData {
  totalSpent: number;
  sessionSpent: number;
  lastUpdated: Date;
}

export function useCostTracker() {
  const [costs, setCosts] = useState<CostData>(() => {
    // Load from localStorage on initialization
    const saved = localStorage.getItem('mcp-client-costs');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        return {
          ...data,
          sessionSpent: 0, // Always reset session on app start
          lastUpdated: new Date(data.lastUpdated),
        };
      } catch (error) {
        console.error('Failed to parse saved cost data:', error);
      }
    }
    return {
      totalSpent: 0,
      sessionSpent: 0,
      lastUpdated: new Date(),
    };
  });

  // Save to localStorage whenever costs change
  useEffect(() => {
    localStorage.setItem('mcp-client-costs', JSON.stringify(costs));
  }, [costs]);

  const addCost = (amount: number) => {
    setCosts(prev => ({
      totalSpent: prev.totalSpent + amount,
      sessionSpent: prev.sessionSpent + amount,
      lastUpdated: new Date(),
    }));
  };

  const resetSession = () => {
    setCosts(prev => ({
      ...prev,
      sessionSpent: 0,
      lastUpdated: new Date(),
    }));
  };

  const resetAll = () => {
    setCosts({
      totalSpent: 0,
      sessionSpent: 0,
      lastUpdated: new Date(),
    });
  };

  return {
    totalSpent: costs.totalSpent,
    sessionSpent: costs.sessionSpent,
    lastUpdated: costs.lastUpdated,
    addCost,
    resetSession,
    resetAll,
  };
}
