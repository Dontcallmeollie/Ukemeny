import React from 'react';
import { X, Check, ShoppingBag, Utensils, AlertTriangle, ArrowRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, toggleShoppingItem } from '../db';
import { getExpiryInfo, formatDateToISO } from '../utils/unitConverter';

interface WidgetModeProps {
  onClose: () => void;
  onNavigateToTab: (tab: 'planner' | 'shopping' | 'pantry') => void;
}

export const WidgetMode: React.FC<WidgetModeProps> = ({ onClose, onNavigateToTab }) => {
  const todayStr = formatDateToISO(new Date());

  // Today's dinner
  const todayPlan = useLiveQuery(async () => {
    const plan = await db.plan.get(todayStr);
    if (!plan || !plan.recipeId) return null;
    const recipe = await db.recipes.get(plan.recipeId);
    return { plan, recipe };
  }, [todayStr]);

  // Next shopping items
  const shoppingItems = useLiveQuery(async () => {
    return await db.shoppingItems
      .filter(i => !i.checked)
      .limit(6)
      .toArray();
  }, []) || [];

  // Expiring items count
  const expiringPantryItems = useLiveQuery(async () => {
    const items = await db.pantry.toArray();
    return items.filter(i => {
      if (!i.expiryDate) return false;
      const info = getExpiryInfo(i.expiryDate);
      return info.status === 'expired' || info.status === 'warning';
    });
  }, []) || [];

  const handleQuickCheck = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.vibrate) navigator.vibrate(30);
    await toggleShoppingItem(id, true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col justify-center items-center p-4">
      {/* Widget Container simulating Android Home Screen Widget */}
      <div className="w-full max-w-sm bg-slate-900/90 text-white rounded-3xl p-5 shadow-2xl border border-slate-700/60 relative overflow-hidden">
        {/* Subtle glow header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-800"></div>

        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Android Hurtig-Widget
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            aria-label="Lukk"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Today's Dinner Widget Section */}
        <div className="mt-3.5 bg-slate-800/70 rounded-2xl p-3 border border-slate-700/50">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5 font-medium text-blue-400">
              <Utensils className="w-3.5 h-3.5" />
              Dagens Middag
            </span>
            <button
              onClick={() => {
                onClose();
                onNavigateToTab('planner');
              }}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-0.5"
            >
              Ukesplan <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {todayPlan?.recipe ? (
            <div>
              <p className="font-bold text-sm text-white">{todayPlan.recipe.name}</p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {todayPlan.recipe.prepTimeMinutes ? `⏱️ ca. ${todayPlan.recipe.prepTimeMinutes} min` : ''} • {todayPlan.recipe.ingredients.length} ingredienser
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Ingen middag valgt for i dag.</p>
          )}
        </div>

        {/* Quick Shopping Checkoff */}
        <div className="mt-3.5 bg-slate-800/70 rounded-2xl p-3 border border-slate-700/50">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="flex items-center gap-1.5 font-medium text-blue-400">
              <ShoppingBag className="w-3.5 h-3.5" />
              Handleliste ({shoppingItems.length} gjenstår)
            </span>
            <button
              onClick={() => {
                onClose();
                onNavigateToTab('shopping');
              }}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-0.5"
            >
              Åpne <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {shoppingItems.length === 0 ? (
            <div className="py-2 text-center text-xs text-blue-400 font-medium">
              🎉 Handlelisten er tom! Alt er handlet.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {shoppingItems.map(item => (
                <div
                  key={item.id}
                  onClick={(e) => handleQuickCheck(item.id, e)}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-700/40 hover:bg-slate-700/80 active:scale-98 cursor-pointer transition-all border border-slate-700/30"
                >
                  <span className="text-xs font-medium text-slate-100 truncate pr-2">
                    {item.amount} {item.unit} {item.name}
                  </span>
                  <button
                    className="w-5 h-5 rounded-full border border-blue-400 flex items-center justify-center text-transparent hover:text-white hover:bg-blue-600 transition-colors shrink-0"
                    title="Kryss av som kjøpt"
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expiry Alert Summary */}
        {expiringPantryItems.length > 0 && (
          <div
            onClick={() => {
              onClose();
              onNavigateToTab('pantry');
            }}
            className="mt-3.5 bg-amber-950/40 border border-amber-800/60 rounded-2xl p-2.5 flex items-center justify-between cursor-pointer hover:bg-amber-950/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs text-amber-200">
                <strong>{expiringPantryItems.length}</strong> varer går ut på dato snart!
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
          </div>
        )}

        {/* Tip for Android Home Screen Widget */}
        <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 text-center space-y-1">
          <p className="font-semibold text-slate-300">💡 Android Tips:</p>
          <p>
            Hold inne app-ikonet på hjemskjermen for å få <strong>App Snarveier (Quick Actions)</strong> direkte til Handleliste eller Ukesmeny!
          </p>
        </div>
      </div>
    </div>
  );
};
