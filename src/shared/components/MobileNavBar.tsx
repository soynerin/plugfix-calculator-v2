import { Calculator, ScrollText, Tag, Smartphone, Settings, Wrench, Package } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useAuth } from '@/features/auth';

interface MobileNavBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileNavBar({ activeTab, onTabChange }: MobileNavBarProps) {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const allNavItems = [
    { id: 'calculator', icon: Calculator, label: 'Calc',      adminOnly: false },
    { id: 'history',    icon: ScrollText, label: 'Historial', adminOnly: false },
    { id: 'brands',     icon: Tag,        label: 'Marcas',    adminOnly: true  },
    { id: 'models',     icon: Smartphone, label: 'Modelos',   adminOnly: true  },
    { id: 'services',   icon: Wrench,     label: 'Servicios', adminOnly: false },
    { id: 'parts',      icon: Package,    label: 'Repuestos', adminOnly: false },
    { id: 'config',     icon: Settings,   label: 'Config',    adminOnly: false },
  ];

  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);
  const colCount = navItems.length;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-card border-t border-gray-200 dark:border-gray-800 shadow-lg">
      <div className={`grid h-16`} style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-colors',
                isActive
                  ? 'text-primary-500 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400',
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'scale-110')} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
