import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { InstallPrompt } from './components/InstallPrompt';
import { WidgetMode } from './components/WidgetMode';
import { MealPlannerView } from './views/MealPlannerView';
import { ShoppingView } from './views/ShoppingView';
import { PantryView } from './views/PantryView';
import { RecipesView } from './views/RecipesView';
import { SettingsView } from './views/SettingsView';
import { initDatabase, db } from './db';
import { checkAndSendExpiryNotification } from './utils/notifications';
import { Bell, X, ArrowRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getExpiryInfo, formatNorwegianDate } from './utils/unitConverter';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('planner');
  const [isWidgetModeOpen, setIsWidgetModeOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [isDbReady, setIsDbReady] = useState(false);

  // Initialize DB and parse URL shortcuts
  useEffect(() => {
    async function setup() {
      await initDatabase();
      setIsDbReady(true);

      // Check URL search parameters (support PWA app shortcuts)
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as NavTab | null;
      if (tabParam && ['planner', 'shopping', 'pantry', 'recipes', 'settings'].includes(tabParam)) {
        setActiveTab(tabParam);
      }

      // Load theme setting
      const settings = await db.settings.get('global-settings');
      if (settings?.theme) {
        setTheme(settings.theme);
        applyTheme(settings.theme);
      } else {
        applyTheme('system');
      }

      // Check expiring items on startup
      setTimeout(() => {
        checkAndSendExpiryNotification(false);
      }, 2000);
    }

    setup();
  }, []);

  const applyTheme = (targetTheme: 'light' | 'dark' | 'system') => {
    const isDark = targetTheme === 'dark' ||
      (targetTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    applyTheme(newTheme);
    const settings = await db.settings.get('global-settings');
    if (settings) {
      await db.settings.update(settings.id, { theme: newTheme });
    }
  };

  // Live expiring items for notification modal
  const expiringPantryItems = useLiveQuery(async () => {
    const items = await db.pantry.toArray();
    return items.filter(i => {
      if (!i.expiryDate) return false;
      const info = getExpiryInfo(i.expiryDate);
      return info.status === 'expired' || info.status === 'warning';
    });
  }, []) || [];

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-800 flex items-center justify-center text-white animate-bounce shadow-lg shadow-blue-800/30">
          <span className="font-bold text-xl">M</span>
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Laster lokalt matvarelager...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Header */}
      <Header
        onOpenWidgetMode={() => setIsWidgetModeOpen(true)}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
      />

      {/* PWA Install Banner */}
      <InstallPrompt />

      {/* Main View Area */}
      <main className="flex-1 max-w-md mx-auto w-full">
        {activeTab === 'planner' && (
          <MealPlannerView onGoToShopping={() => setActiveTab('shopping')} />
        )}
        {activeTab === 'shopping' && <ShoppingView />}
        {activeTab === 'pantry' && <PantryView />}
        {activeTab === 'recipes' && (
          <RecipesView onGoToPlanner={() => setActiveTab('planner')} />
        )}
        {activeTab === 'settings' && (
          <SettingsView currentTheme={theme} onThemeChange={handleThemeChange} />
        )}
      </main>

      {/* Bottom Navigation */}
      <Navigation activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* Android Widget Mode Simulation Overlay */}
      {isWidgetModeOpen && (
        <WidgetMode
          onClose={() => setIsWidgetModeOpen(false)}
          onNavigateToTab={(tab) => {
            setIsWidgetModeOpen(false);
            setActiveTab(tab);
          }}
        />
      )}

      {/* Expiry Notifications Modal */}
      {isNotificationsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Holdbarhetsvarsler
                </h3>
              </div>
              <button
                onClick={() => setIsNotificationsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {expiringPantryItems.length === 0 ? (
              <div className="py-6 text-center space-y-1">
                <p className="font-bold text-sm text-blue-700 dark:text-blue-400">
                  🎉 Ingen varer i faresonen!
                </p>
                <p className="text-xs text-slate-500">
                  Alle råvarer i matvarelageret har god holdbarhet fremover.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Følgende {expiringPantryItems.length} varer bør brukes snarest:
                </p>

                {expiringPantryItems.map(item => {
                  const info = getExpiryInfo(item.expiryDate);
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {item.name} ({item.amount} {item.unit})
                        </p>
                        <p className={`text-[10px] ${info.colorClass}`}>
                          {item.expiryDate ? formatNorwegianDate(item.expiryDate) : ''} • {info.label}
                        </p>
                      </div>

                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 rounded font-semibold">
                        {item.category}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => {
                setIsNotificationsModalOpen(false);
                setActiveTab('pantry');
              }}
              className="w-full py-2.5 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
            >
              Åpne Matvarelager
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;
