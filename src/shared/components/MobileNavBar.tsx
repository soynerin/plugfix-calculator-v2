import { Calculator, ScrollText, Tag, Smartphone, Settings } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface MobileNavBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileNavBar({ activeTab, onTabChange }: MobileNavBarProps) {
  const navItems = [
    { id: 'calculator', icon: Calculator, label: 'Calc' },
    { id: 'history', icon: ScrollText, label: 'Historial' },
    { id: 'brands', icon: Tag, label: 'Marcas' },
    { id: 'models', icon: Smartphone, label: 'Modelos' },
    { id: 'config', icon: Settings, label: 'Config' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-card border-t border-gray-200 dark:border-gray-800 shadow-lg">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors",
                isActive 
                  ? "text-indigo-600 dark:text-indigo-400" 
                  : "text-gray-500 dark:text-gray-400"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "scale-110")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
