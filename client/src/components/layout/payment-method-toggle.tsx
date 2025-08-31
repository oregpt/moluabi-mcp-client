import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Wallet } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PaymentMethodToggleProps {
  className?: string;
}

export function PaymentMethodToggle({ className }: PaymentMethodToggleProps) {
  const [paymentMethod, setPaymentMethod] = useState<'apikey' | 'atxp'>('apikey');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load current payment method on mount
  useEffect(() => {
    const loadPaymentMethod = async () => {
      try {
        const response = await fetch('/api/payment-method');
        const data = await response.json();
        setPaymentMethod(data.paymentMethod || 'apikey');
      } catch (error) {
        console.error('Failed to load payment method:', error);
      }
    };

    loadPaymentMethod();
  }, []);

  const handleToggle = async (checked: boolean) => {
    const newMethod = checked ? 'atxp' : 'apikey';
    setIsLoading(true);

    try {
      const response = await apiRequest('/api/payment-method', {
        method: 'POST',
        body: { method: newMethod }
      });

      setPaymentMethod(newMethod);
      toast({
        title: 'Payment Method Updated',
        description: response.message,
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to update payment method:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update payment method',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`} data-testid="payment-method-toggle">
      <div className="flex items-center space-x-2">
        <CreditCard className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="payment-toggle" className="text-sm font-medium">
          API Key
        </Label>
      </div>
      
      <Switch
        id="payment-toggle"
        checked={paymentMethod === 'atxp'}
        onCheckedChange={handleToggle}
        disabled={isLoading}
        data-testid="switch-payment-method"
      />
      
      <div className="flex items-center space-x-2">
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="payment-toggle" className="text-sm font-medium">
          ATXP
        </Label>
      </div>

      <Badge 
        variant={paymentMethod === 'atxp' ? 'default' : 'secondary'}
        className="ml-2"
        data-testid="payment-method-badge"
      >
        {paymentMethod === 'atxp' ? 'Crypto Billing' : 'Account Billing'}
      </Badge>
    </div>
  );
}