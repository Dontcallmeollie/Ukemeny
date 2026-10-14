import React, { useState } from 'react';
import {
  Check,
  Plus,
  Trash2,
  Undo2,
  ChevronDown,
  ChevronUp,
  Store
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { db, toggleShoppingItem, addManualShoppingItem, clearCompletedShoppingItems } from '../db';
import { ShoppingItem, StorageLocation } from '../types';

export const ShoppingView: React.FC = () => {
  const [filterCategory, setFilterCategory] = useState<string>('Alle');
  const [manualName, setManualName] = useState('');
  const [manualAmount, setManualAmount] = useState('1');
  const [manualUnit, setManualUnit] = useState('stk');
  const [manualCategory, setManualCategory] = useState<StorageLocation>('Kjøleskap');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCompletedSection, setShowCompletedSection] = useState(true);
  const [undoToast, setUndoToast] = useState<{ id: string; name: string } | null>(null);

  // Live queries
  const allItems = useLiveQuery(() => db.shoppingItems.toArray(), []) || [];

  const pendingItems = allItems.filter(i => !i.checked);
  const completedItems = allItems.filter(i => i.checked);

  const categories = ['Alle', 'Kjøleskap', 'Fryser', 'Tørrvare'];

  const filteredPending = filterCategory === 'Alle'
    ? pendingItems
    : pendingItems.filter(i => i.category === filterCategory);

  const handleCheckItem = async (item: ShoppingItem) => {
    // Haptic vibration feedback for mobile physical feel
    if (navigator.vibrate) {
      navigator.vibrate(40);
    }

    await toggleShoppingItem(item.id, true);

    // Show undo toast
    setUndoToast({ id: item.id, name: item.name });
    setTimeout(() => setUndoToast(null), 4000);

    // If all items checked, trigger celebratory confetti!
    if (pendingItems.length === 1) {
      triggerConfetti();
    }
  };

  const handleUncheckItem = async (itemId: string) => {
    if (navigator.vibrate) navigator.vibrate(20);
    await toggleShoppingItem(itemId, false);
    setUndoToast(null);
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    const amt = parseFloat(manualAmount.replace(',', '.')) || 1;
    await addManualShoppingItem(manualName.trim(), amt, manualUnit, manualCategory);

    setManualName('');
    setManualAmount('1');
    setShowAddForm(false);
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (e) {
      console.log('Confetti effect triggered');
    }
  };

  return (
    <div className="pb-safe max-w-md mx-auto px-4 pt-3 space-y-4">
      {/* Handlemann Header & Mode info */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-900 via-blue-800 to-indigo-800 text-white flex items-center justify-center shadow-md shadow-blue-900/30">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Handlemann-modus
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enhåndsbetjening i butikken • Synkes til lageret
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Legg til
          </button>
        </div>

        {/* Progress Bar & Counter */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {pendingItems.length === 0 && allItems.length > 0
                ? '🎉 Alt er ferdig handlet!'
                : `${pendingItems.length} varer gjenstår`}
            </span>
            <span className="text-slate-400 text-[11px]">
              {completedItems.length} av {allItems.length} handlet
            </span>
          </div>

          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-500 rounded-full transition-all duration-300"
              style={{
                width: allItems.length > 0
                  ? `${Math.round((completedItems.length / allItems.length) * 100)}%`
                  : '0%'
              }}
            ></div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                filterCategory === cat
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Undo Toast Banner */}
      {undoToast && (
        <div className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl flex items-center justify-between text-xs animate-slide-up">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-blue-400" />
            <span>
              <strong>{undoToast.name}</strong> overført til matvarelageret!
            </span>
          </div>
          <button
            onClick={() => handleUncheckItem(undoToast.id)}
            className="px-2.5 py-1 bg-white/20 dark:bg-slate-200 rounded-lg font-semibold hover:bg-white/30 flex items-center gap-1 text-[11px]"
          >
            <Undo2 className="w-3 h-3" />
            Angre
          </button>
        </div>
      )}

      {/* Manual Add Form (Expandable) */}
      {showAddForm && (
        <form
          onSubmit={handleAddManual}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-blue-600/40 space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Legg til ekstra vare
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Lukk
            </button>
          </div>

          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-6">
              <input
                type="text"
                required
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                placeholder="Varenavn (f.eks. Melk)"
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>
            <div className="col-span-3">
              <input
                type="text"
                value={manualAmount}
                onChange={e => setManualAmount(e.target.value)}
                placeholder="Mengde"
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>
            <div className="col-span-3">
              <select
                value={manualUnit}
                onChange={e => setManualUnit(e.target.value)}
                className="w-full px-2 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
              >
                <option value="stk">stk</option>
                <option value="liter">liter</option>
                <option value="dl">dl</option>
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="boks">boks</option>
                <option value="pk">pk</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 text-[11px]">Plassering:</span>
              <select
                value={manualCategory}
                onChange={e => setManualCategory(e.target.value as StorageLocation)}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-xs"
              >
                <option value="Kjøleskap">Kjøleskap</option>
                <option value="Fryser">Fryser</option>
                <option value="Tørrvare">Tørrvare</option>
                <option value="Annet">Annet</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-semibold shadow-sm"
            >
              Legg til i listen
            </button>
          </div>
        </form>
      )}

      {/* Active Items (Pending) - Large touch targets for one-handed operation */}
      <div className="space-y-2.5">
        {filteredPending.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {allItems.length === 0
                ? 'Handlelisten er tom'
                : 'Ingen uavhentede varer i denne kategorien'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              {allItems.length === 0
                ? 'Gå til Ukesplan for å generere liste basert på middagene dine, eller legg til varer manuelt.'
                : 'Bra jobbet! Alle varer er huket av og overført til lageret.'}
            </p>
          </div>
        ) : (
          filteredPending.map(item => (
            <div
              key={item.id}
              onClick={() => handleCheckItem(item)}
              className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 flex items-center justify-between cursor-pointer active:scale-98 transition-all hover:border-blue-600/50 group"
            >
              <div className="flex items-center gap-3.5 pr-2">
                {/* Extra large tactile check button */}
                <div className="w-8 h-8 rounded-full border-2 border-slate-300 dark:border-slate-600 group-hover:border-blue-600 flex items-center justify-center text-transparent transition-colors shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>

                <div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                    {item.amount} {item.unit} {item.name}
                  </h4>

                  <div className="flex items-center gap-2 mt-1">
                    {item.category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                        {item.category}
                      </span>
                    )}

                    {item.planMealNames && item.planMealNames.length > 0 && (
                      <span className="text-[10px] text-blue-700 dark:text-blue-400 font-medium truncate max-w-[200px]">
                        Trengs til: {item.planMealNames.join(', ')}
                      </span>
                    )}

                    {item.source === 'manual' && (
                      <span className="text-[10px] text-slate-400 italic">Manuelt lagt til</span>
                    )}
                  </div>
                </div>
              </div>

              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 shrink-0">
                Kjøp
              </span>
            </div>
          ))
        )}
      </div>

      {/* Completed Section (Collapsible) */}
      {completedItems.length > 0 && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowCompletedSection(!showCompletedSection)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              <span>Handlet ({completedItems.length})</span>
              {showCompletedSection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={clearCompletedShoppingItems}
              className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Tøm handlet
            </button>
          </div>

          {showCompletedSection && (
            <div className="space-y-1.5">
              {completedItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleUncheckItem(item.id)}
                  className="p-3 bg-slate-50/80 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between opacity-60 hover:opacity-100 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-800 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span className="line-through text-xs font-medium text-slate-600 dark:text-slate-400">
                      {item.amount} {item.unit} {item.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-blue-700 dark:text-blue-400">I lageret</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
