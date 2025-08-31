import { PaymentMethodToggle } from './payment-method-toggle';

interface HeaderProps {
  title: string;
  description: string;
  cost: number | undefined;
  onMenuToggle: () => void;
}

export default function Header({ title, description, cost, onMenuToggle }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onMenuToggle}
            className="block lg:hidden p-2 hover:bg-secondary rounded-md border border-border"
            data-testid="menu-toggle"
          >
            <i className="fas fa-bars text-foreground text-lg"></i>
          </button>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <PaymentMethodToggle className="hidden md:flex" />
          <div className="cost-badge px-3 py-1 rounded-full text-xs font-medium text-white">
            Next Action: ${(cost || 0).toFixed(2)}
          </div>
          <button className="p-2 hover:bg-secondary rounded-md" data-testid="notifications">
            <i className="fas fa-bell text-muted-foreground"></i>
          </button>
        </div>
      </div>
    </header>
  );
}
