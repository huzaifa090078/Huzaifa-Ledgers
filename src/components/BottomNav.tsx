import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  Users,
  Building2,
  BarChart3,
  Settings,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'collection' | 'parties' | 'company' | 'analytics' | 'settings';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  partiesBadgeCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  partiesBadgeCount,
}) => {
  const tabs = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'collection' as NavTab,
      label: 'Collection',
      icon: Wallet,
    },
    {
      id: 'parties' as NavTab,
      label: 'Parties',
      icon: Users,
      badge: partiesBadgeCount,
    },
    {
      id: 'company' as NavTab,
      label: 'Company',
      icon: Building2,
    },
    {
      id: 'analytics' as NavTab,
      label: 'Analytics',
      icon: BarChart3,
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg pb-safe"
      style={{
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="max-w-md mx-auto grid grid-cols-6 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center relative py-1 transition-colors ${
                isActive
                  ? 'text-sky-600 font-medium'
                  : 'text-slate-500 hover:text-slate-700 active:text-slate-900'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.25]' : 'stroke-[1.75]'}`} />
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-slate-900 text-white text-[9px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 leading-none">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-sky-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
