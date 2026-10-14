import React, { useState } from 'react';
import {
  Calendar,
  ChefHat,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, syncShoppingListFromPlan, evaluateRecipeAgainstPantry } from '../db';
import { DayPlan, Recipe } from '../types';
import { generateInitialMealPlan } from '../db/seed';

interface MealPlannerViewProps {
  onGoToShopping: () => void;
}

export const MealPlannerView: React.FC<MealPlannerViewProps> = ({ onGoToShopping }) => {
  const [selectedDayForModal, setSelectedDayForModal] = useState<DayPlan | null>(null);
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');
  const [customDishInput, setCustomDishInput] = useState('');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Live queries
  const plans = useLiveQuery(() => db.plan.toArray(), []) || [];
  const recipes = useLiveQuery(() => db.recipes.toArray(), []) || [];
  const pantryItems = useLiveQuery(() => db.pantry.toArray(), []) || [];

  const recipeMap = new Map<string, Recipe>();
  recipes.forEach(r => recipeMap.set(r.id, r));

  const toggleDayExpansion = (dayId: string) => {
    setExpandedDays(prev => ({ ...prev, [dayId]: !prev[dayId] }));
  };

  // Change duration of plan (3, 7, 14 days)
  const handleSetPlanDays = async (daysCount: number) => {
    const newPlan = generateInitialMealPlan(daysCount);
    await db.transaction('rw', db.plan, async () => {
      await db.plan.clear();
      await db.plan.bulkAdd(newPlan);
    });
    await syncShoppingListFromPlan();
    showToast(`Ukesmeny satt til ${daysCount} dager og handleliste oppdatert!`);
  };

  // Select recipe for a specific day
  const handleSelectRecipeForDay = async (dayId: string, recipeId?: string, customName?: string) => {
    await db.plan.update(dayId, {
      recipeId: recipeId || undefined,
      customDishName: customName || undefined,
      manualExcludedIngredients: [] // reset manual exclusions on dish change
    });
    await syncShoppingListFromPlan();
    setSelectedDayForModal(null);
    setRecipeSearchQuery('');
    setCustomDishInput('');
    showToast('Middag oppdatert & handleliste synkronisert!');
  };

  // Adjust servings
  const handleAdjustServings = async (dayId: string, delta: number, currentServings: number) => {
    const next = Math.max(1, Math.min(12, currentServings + delta));
    await db.plan.update(dayId, { servings: next });
    await syncShoppingListFromPlan();
  };

  // Toggle ingredient "Finnes i huset" exclusion
  const handleToggleIngredientExcluded = async (day: DayPlan, ingredientId: string) => {
    const currentList = day.manualExcludedIngredients || [];
    let updatedList: string[];

    if (currentList.includes(ingredientId)) {
      updatedList = currentList.filter(id => id !== ingredientId);
    } else {
      updatedList = [...currentList, ingredientId];
    }

    await db.plan.update(day.id, { manualExcludedIngredients: updatedList });
    await syncShoppingListFromPlan();
  };

  const showToast = (msg: string) => {
    setSyncToast(msg);
    setTimeout(() => setSyncToast(null), 3000);
  };

  const filteredRecipes = recipes.filter(r =>
    r.name.toLowerCase().includes(recipeSearchQuery.toLowerCase()) ||
    r.category.toLowerCase().includes(recipeSearchQuery.toLowerCase())
  );

  return (
    <div className="pb-safe max-w-md mx-auto px-4 pt-3 space-y-4">
      {/* View Header with Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              Middagsmeny
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Planlegg middager og sjekk råvarer mot lageret
            </p>
          </div>

          <button
            onClick={async () => {
              await syncShoppingListFromPlan();
              showToast('Handleliste oppdatert fra menyen!');
            }}
            className="p-2 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition-colors"
            title="Oppdater handleliste"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Days Count Selector */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Antall dager:</span>
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {[3, 7, 14].map(days => (
              <button
                key={days}
                onClick={() => handleSetPlanDays(days)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  plans.length === days
                    ? 'bg-blue-800 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {days} dager
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sync Toast Feedback */}
      {syncToast && (
        <div className="bg-blue-800 text-white text-xs px-3 py-2 rounded-xl text-center shadow-lg animate-fade-in flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>{syncToast}</span>
        </div>
      )}

      {/* Days List */}
      <div className="space-y-3">
        {plans.map((day, index) => {
          const recipe = day.recipeId ? recipeMap.get(day.recipeId) : null;
          const isExpanded = !!expandedDays[day.id];
          const servings = day.servings || 4;

          // Evaluate recipe vs pantry
          const pantryEval = recipe ? evaluateRecipeAgainstPantry(recipe, pantryItems, servings / 4) : null;

          return (
            <div
              key={day.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:border-blue-500/40"
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">
                    {day.dayName}
                  </span>
                  <span className="text-[11px] text-slate-400">({day.date.split('-').slice(1).reverse().join('/')})</span>
                </div>

                {/* Servings control */}
                {recipe && (
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-xs">
                    <span className="text-slate-500 text-[11px]">Porsjoner:</span>
                    <button
                      onClick={() => handleAdjustServings(day.id, -1, servings)}
                      className="w-4 h-4 rounded text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="font-bold text-blue-700 dark:text-blue-400">{servings}</span>
                    <button
                      onClick={() => handleAdjustServings(day.id, 1, servings)}
                      className="w-4 h-4 rounded text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              {/* Meal card or empty state */}
              {recipe ? (
                <div className="space-y-3">
                  <div
                    onClick={() => setSelectedDayForModal(day)}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <ChefHat className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                          {recipe.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="px-1.5 py-0.5 bg-slate-200/60 dark:bg-slate-700/60 rounded text-[10px]">
                            {recipe.category}
                          </span>
                          {recipe.prepTimeMinutes && <span>⏱️ {recipe.prepTimeMinutes} min</span>}
                        </div>
                      </div>
                    </div>

                    <button className="text-xs text-blue-700 dark:text-blue-400 font-medium hover:underline shrink-0">
                      Endre
                    </button>
                  </div>

                  {/* Pantry inventory status badge */}
                  {pantryEval && (
                    <div className="flex items-center justify-between text-xs px-1">
                      <div className="flex items-center gap-1.5">
                        {pantryEval.isReady ? (
                          <div className="flex items-center gap-1 text-blue-700 dark:text-blue-400 font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Alt finnes i huset!</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                            <AlertCircle className="w-4 h-4" />
                            <span>
                              {pantryEval.availableCount} av {pantryEval.totalCount} ingredienser i huset
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => toggleDayExpansion(day.id)}
                        className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-0.5"
                      >
                        {isExpanded ? (
                          <>Skjul ingredienser <ChevronUp className="w-3.5 h-3.5" /></>
                        ) : (
                          <>Sjekk ingredienser <ChevronDown className="w-3.5 h-3.5" /></>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Expandable Ingredient Checklist */}
                  {isExpanded && recipe && (
                    <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Huk av dersom du allerede har varen i huset (fjernes fra handlelisten):
                      </p>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {recipe.ingredients.map(ing => {
                          const isExcluded = (day.manualExcludedIngredients || []).includes(ing.id);
                          const scale = servings / 4;
                          const scaledAmount = Math.round(ing.amount * scale * 10) / 10;

                          // Check if pantry already had it
                          const pantryMatch = pantryItems.find(
                            p => p.name.toLowerCase() === ing.name.toLowerCase()
                          );

                          return (
                            <label
                              key={ing.id}
                              className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                                isExcluded
                                  ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border border-blue-200/50 dark:border-blue-800/40'
                                  : 'bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isExcluded}
                                  onChange={() => handleToggleIngredientExcluded(day, ing.id)}
                                  className="w-4 h-4 rounded text-blue-700 focus:ring-blue-600 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                                />
                                <span className={isExcluded ? 'line-through opacity-75' : 'font-medium'}>
                                  {scaledAmount} {ing.unit} {ing.name}
                                </span>
                              </div>

                              <div className="text-[10px] text-right">
                                {isExcluded ? (
                                  <span className="text-blue-700 dark:text-blue-400 font-medium">Finnes i huset</span>
                                ) : pantryMatch ? (
                                  <span className="text-slate-400">Lager: {pantryMatch.amount} {pantryMatch.unit}</span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400 font-medium">Mangler</span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : day.customDishName ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {day.customDishName}
                    </h4>
                    <span className="text-[10px] text-slate-400">Egendefinert rett</span>
                  </div>
                  <button
                    onClick={() => setSelectedDayForModal(day)}
                    className="text-xs text-blue-700 font-medium"
                  >
                    Endre
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedDayForModal(day)}
                  className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 flex items-center justify-center gap-2 transition-colors active:scale-99"
                >
                  <Plus className="w-4 h-4" />
                  Velg middag fra oppskriftsarkivet
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Shortcut to Shopping List */}
      <div className="pt-2">
        <button
          onClick={onGoToShopping}
          className="w-full py-3.5 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition-all active:scale-98"
        >
          <ShoppingBag className="w-5 h-5" />
          Gå til Handlelisten (Handlemann)
        </button>
      </div>

      {/* Select Recipe Modal */}
      {selectedDayForModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Velg middag for {selectedDayForModal.dayName}
                </h3>
                <p className="text-xs text-slate-500">Velg fra oppskriftsarkivet eller skriv inn selv</p>
              </div>
              <button
                onClick={() => setSelectedDayForModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Box */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={recipeSearchQuery}
                  onChange={e => setRecipeSearchQuery(e.target.value)}
                  placeholder="Søk i oppskrifter..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Recipe List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredRecipes.map(r => {
                const evalInfo = evaluateRecipeAgainstPantry(r, pantryItems);
                return (
                  <div
                    key={r.id}
                    onClick={() => handleSelectRecipeForDay(selectedDayForModal.id, r.id)}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200/60 dark:border-slate-800 rounded-2xl cursor-pointer transition-all active:scale-98"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{r.name}</h4>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px]">
                            {r.category}
                          </span>
                          {r.prepTimeMinutes && <span>⏱️ {r.prepTimeMinutes} min</span>}
                          <span>• {r.ingredients.length} ingredienser</span>
                        </div>
                      </div>

                      {/* Pantry readiness pill */}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          evalInfo.isReady
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {evalInfo.isReady ? 'Klar på lager' : `${evalInfo.percentage}% i lager`}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Custom Dish Option */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Eller skriv inn en annen rett:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customDishInput}
                    onChange={e => setCustomDishInput(e.target.value)}
                    placeholder="F.eks. Rester fra i går, Grandiosa..."
                    className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    disabled={!customDishInput.trim()}
                    onClick={() => handleSelectRecipeForDay(selectedDayForModal.id, undefined, customDishInput.trim())}
                    className="px-4 py-2 bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold hover:bg-blue-900 transition-colors"
                  >
                    Bruk
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
