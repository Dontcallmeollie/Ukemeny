import React from 'react';
import { UtensilsCrossed, Bell, WifiOff, LayoutGrid } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getExpiryInfo } from '../utils/unitConverter';

interface HeaderProps {
  onOpenWidgetMode: () => void;
  onOpenNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenWidgetMode, onOpenNotifications }) => {
  // Live query expiring items
  const expiringCount = useLiveQuery(async () => {
    const items = await db.pantry.toArray();
    return items.filter(i => {
      if (!i.expiryDate) return false;
      const info = getExpiryInfo(i.expiryDate);
      return info.status === 'expired' || info.status === 'warning';
    }).length;
  }, []) || 0;

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-900 via-blue-800 to-indigo-800 flex items-center justify-center text-white shadow-md shadow-blue-900/30">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-tight text-slate-900 dark:text-white">
              MatApp
            </h1>
            <div className="flex items-center space-x-1.5 text-[11px] font-medium text-blue-700 dark:text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
              <span className="flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                100% Offline
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Quick widget view button */}
          <button
            onClick={onOpenWidgetMode}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors active:scale-95"
            title="Android Hurtig-Widget"
            aria-label="Android Hurtig-Widget"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>

          {/* Expiry alerts button */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors active:scale-95"
            title="Holdbarhetsvarsler"
            aria-label="Holdbarhetsvarsler"
          >
            <Bell className="w-5 h-5" />
            {expiringCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-bounce">
                {expiringCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
