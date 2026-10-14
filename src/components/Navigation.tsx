import React from 'react';
import { CalendarDays, ShoppingCart, Box, BookOpen, Settings } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getExpiryInfo } from '../utils/unitConverter';

export type NavTab = 'planner' | 'shopping' | 'pantry' | 'recipes' | 'settings';

interface NavigationProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onChangeTab }) => {
  // Live count for unchecked shopping items
  const pendingShoppingCount = useLiveQuery(async () => {
    return await db.shoppingItems.filter(i => !i.checked).count();
  }, []) || 0;

  // Live count for expiring pantry items
  const expiringPantryCount = useLiveQuery(async () => {
    const items = await db.pantry.toArray();
    return items.filter(i => {
      if (!i.expiryDate) return false;
      const info = getExpiryInfo(i.expiryDate);
      return info.status === 'expired' || info.status === 'warning';
    }).length;
  }, []) || 0;

  const navItems = [
    {
      id: 'planner' as NavTab,
      label: 'Ukesplan',
      icon: CalendarDays,
      badge: 0
    },
    {
      id: 'shopping' as NavTab,
      label: 'Handlemann',
      icon: ShoppingCart,
      badge: pendingShoppingCount
    },
    {
      id: 'pantry' as NavTab,
      label: 'Lager',
      icon: Box,
      badge: expiringPantryCount,
      badgeColor: 'bg-amber-500'
    },
    {
      id: 'recipes' as NavTab,
      label: 'Oppskrifter',
      icon: BookOpen,
      badge: 0
    },
    {
      id: 'settings' as NavTab,
      label: 'Innstillinger',
      icon: Settings,
      badge: 0
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 safe-area-bottom">
      <div className="max-w-md mx-auto grid grid-cols-5 h-16">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(15);
                onChangeTab(item.id);
              }}
              className={`relative flex flex-col items-center justify-center py-1 transition-all ${
                isActive
                  ? 'text-blue-700 dark:text-blue-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <div
                  className={`p-1 rounded-xl transition-all ${
                    isActive ? 'bg-blue-50 dark:bg-blue-950/70 scale-110' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                {item.badge > 0 && (
                  <span
                    className={`absolute -top-1 -right-2 min-w-[16px] h-4 px-1 ${
                      item.badgeColor || 'bg-blue-800'
                    } text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
