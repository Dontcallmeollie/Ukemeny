import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Clock,
  Trash2,
  Edit2,
  ChefHat,
  CheckCircle2,
  AlertCircle,
  X,
  PlusCircle,
  CalendarPlus
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, evaluateRecipeAgainstPantry, syncShoppingListFromPlan } from '../db';
import { Recipe, RecipeCategory, Ingredient } from '../types';

interface RecipesViewProps {
  onGoToPlanner: () => void;
}

export const RecipesView: React.FC<RecipesViewProps> = ({ onGoToPlanner }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Alle');
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Edit/create form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<RecipeCategory>('Kjøtt');
  const [formPrepTime, setFormPrepTime] = useState<number>(30);
  const [formDescription, setFormDescription] = useState('');
  const [formIngredients, setFormIngredients] = useState<Ingredient[]>([]);
  const [formInstructionsText, setFormInstructionsText] = useState('');

  // Live queries
  const recipes = useLiveQuery(() => db.recipes.toArray(), []) || [];
  const pantryItems = useLiveQuery(() => db.pantry.toArray(), []) || [];
  const plans = useLiveQuery(() => db.plan.toArray(), []) || [];

  const categories = ['Alle', 'Kjøtt', 'Kylling', 'Fisk', 'Vegetar', 'Pasta', 'Suppe', 'Rask'];

  const filteredRecipes = recipes.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ingredients.some(ing => ing.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchSearch) return false;

    if (selectedCategory === 'Alle') return true;
    return r.category === selectedCategory;
  });

  const openCreateModal = () => {
    setFormName('');
    setFormCategory('Kjøtt');
    setFormPrepTime(25);
    setFormDescription('');
    setFormIngredients([
      { id: `ing-${Date.now()}-1`, name: '', amount: 400, unit: 'g' },
      { id: `ing-${Date.now()}-2`, name: '', amount: 1, unit: 'stk' }
    ]);
    setFormInstructionsText('');
    setIsCreatingNew(true);
    setEditingRecipe(null);
  };

  const openEditModal = (recipe: Recipe) => {
    setFormName(recipe.name);
    setFormCategory(recipe.category);
    setFormPrepTime(recipe.prepTimeMinutes || 30);
    setFormDescription(recipe.description || '');
    setFormIngredients([...recipe.ingredients]);
    setFormInstructionsText((recipe.instructions || []).join('\n'));
    setEditingRecipe(recipe);
    setIsCreatingNew(false);
    setViewingRecipe(null);
  };

  const handleAddIngredientRow = () => {
    setFormIngredients([
      ...formIngredients,
      { id: `ing-${Date.now()}-${formIngredients.length + 1}`, name: '', amount: 1, unit: 'stk' }
    ]);
  };

  const handleRemoveIngredientRow = (index: number) => {
    setFormIngredients(formIngredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: any) => {
    const updated = [...formIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setFormIngredients(updated);
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const validIngredients = formIngredients.filter(i => i.name.trim() !== '');
    if (validIngredients.length === 0) {
      alert('Vennligst legg til minst én ingrediens.');
      return;
    }

    const instructions = formInstructionsText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const now = Date.now();

    if (isCreatingNew) {
      const newRecipe: Recipe = {
        id: `recipe-${now}-${Math.random().toString(36).substr(2, 4)}`,
        name: formName.trim(),
        category: formCategory,
        prepTimeMinutes: formPrepTime,
        description: formDescription.trim(),
        ingredients: validIngredients,
        instructions,
        createdAt: now,
        updatedAt: now
      };
      await db.recipes.add(newRecipe);
    } else if (editingRecipe) {
      await db.recipes.update(editingRecipe.id, {
        name: formName.trim(),
        category: formCategory,
        prepTimeMinutes: formPrepTime,
        description: formDescription.trim(),
        ingredients: validIngredients,
        instructions,
        updatedAt: now
      });
    }

    setIsCreatingNew(false);
    setEditingRecipe(null);
  };

  const handleDeleteRecipe = async (recipe: Recipe) => {
    if (confirm(`Vil du slette oppskriften «${recipe.name}»?`)) {
      await db.recipes.delete(recipe.id);
      setViewingRecipe(null);
    }
  };

  const handleAddToPlanFirstOpenDay = async (recipe: Recipe) => {
    const targetDay = plans.find(p => !p.recipeId) || plans[0];
    if (targetDay) {
      await db.plan.update(targetDay.id, { recipeId: recipe.id, customDishName: undefined });
      await syncShoppingListFromPlan();
      setViewingRecipe(null);
      alert(`«${recipe.name}» er lagt til for ${targetDay.dayName}!`);
      onGoToPlanner();
    }
  };

  return (
    <div className="pb-safe max-w-md mx-auto px-4 pt-3 space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-900 via-blue-800 to-indigo-800 text-white flex items-center justify-center shadow-md shadow-blue-900/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Oppskriftsarkiv
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {recipes.length} middagsretter lagret lokalt
              </p>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="px-3 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Ny rett
          </button>
        </div>

        {/* Search */}
        <div className="relative pt-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Søk etter rett eller ingrediens..."
            className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs focus:ring-2 focus:ring-blue-600 outline-none"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Recipes Cards Grid */}
      <div className="space-y-3">
        {filteredRecipes.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <ChefHat className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Ingen oppskrifter funnet</h3>
            <p className="text-xs text-slate-500">
              Prøv et annet søkeord eller opprett din egen rett med «Ny rett».
            </p>
          </div>
        ) : (
          filteredRecipes.map(recipe => {
            const evalInfo = evaluateRecipeAgainstPantry(recipe, pantryItems);

            return (
              <div
                key={recipe.id}
                onClick={() => setViewingRecipe(recipe)}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/40 cursor-pointer transition-all active:scale-99 space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                      {recipe.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium text-[10px]">
                        {recipe.category}
                      </span>
                      {recipe.prepTimeMinutes && (
                        <span className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3" />
                          {recipe.prepTimeMinutes} min
                        </span>
                      )}
                      <span className="text-[11px]">• {recipe.ingredients.length} ingredienser</span>
                    </div>
                  </div>

                  {/* Pantry match status badge */}
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                      evalInfo.isReady
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {evalInfo.isReady ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        Klar på lager
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        {evalInfo.availableCount}/{evalInfo.totalCount} i huset
                      </>
                    )}
                  </span>
                </div>

                {recipe.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {recipe.description}
                  </p>
                )}

                {/* Preview first 3 ingredients */}
                <div className="flex flex-wrap gap-1 text-[10px] text-slate-500">
                  {recipe.ingredients.slice(0, 4).map(ing => (
                    <span key={ing.id} className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {ing.name}
                    </span>
                  ))}
                  {recipe.ingredients.length > 4 && (
                    <span className="text-slate-400 px-1 py-0.5">+{recipe.ingredients.length - 4} til</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View Recipe Detail Modal */}
      {viewingRecipe && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded-full font-semibold">
                  {viewingRecipe.category}
                </span>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mt-1">
                  {viewingRecipe.name}
                </h3>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(viewingRecipe)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Rediger"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewingRecipe(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {viewingRecipe.description && (
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed italic">
                  "{viewingRecipe.description}"
                </p>
              )}

              {/* Ingredients List with Pantry Availability Status */}
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2 flex items-center justify-between">
                  <span>Ingredienser ({viewingRecipe.ingredients.length})</span>
                  <span className="text-[11px] font-normal text-slate-500">4 porsjoner</span>
                </h4>

                <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800">
                  {viewingRecipe.ingredients.map(ing => {
                    const norm = ing.name.toLowerCase();
                    const pantryMatch = pantryItems.find(p => p.name.toLowerCase() === norm);

                    return (
                      <div
                        key={ing.id}
                        className="flex items-center justify-between py-1 border-b border-slate-200/40 dark:border-slate-700/40 last:border-0"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {ing.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-700 dark:text-blue-400">
                            {ing.amount} {ing.unit}
                          </span>
                          {pantryMatch ? (
                            <span className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">✓ I lager</span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Mangler</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Instructions */}
              {viewingRecipe.instructions && viewingRecipe.instructions.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
                    Fremgangsmåte
                  </h4>
                  <ol className="space-y-2 list-decimal list-inside text-slate-700 dark:text-slate-300 leading-relaxed">
                    {viewingRecipe.instructions.map((step, idx) => (
                      <li key={idx} className="pl-1">
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <button
                onClick={() => handleDeleteRecipe(viewingRecipe)}
                className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                title="Slett oppskrift"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              <button
                onClick={() => handleAddToPlanFirstOpenDay(viewingRecipe)}
                className="flex-1 py-3 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs"
              >
                <CalendarPlus className="w-4 h-4" />
                Legg til i ukesplanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Recipe Modal */}
      {(isCreatingNew || editingRecipe) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleSaveRecipe}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-slide-up"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {isCreatingNew ? 'Opprett ny middagsrett' : 'Rediger middagsrett'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNew(false);
                  setEditingRecipe(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Navn på retten:
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="F.eks. Hjemmelaget Lasagne"
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Kategori:
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as RecipeCategory)}
                    className="w-full px-2 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none"
                  >
                    <option value="Kjøtt">Kjøtt</option>
                    <option value="Kylling">Kylling</option>
                    <option value="Fisk">Fisk</option>
                    <option value="Vegetar">Vegetar</option>
                    <option value="Pasta">Pasta</option>
                    <option value="Suppe">Suppe</option>
                    <option value="Rask">Rask</option>
                    <option value="Annet">Annet</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Tilberedningstid (min):
                  </label>
                  <input
                    type="number"
                    value={formPrepTime}
                    onChange={e => setFormPrepTime(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Kort beskrivelse:
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="F.eks. Rask og barnevennlig hverdagsmiddag"
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none"
                />
              </div>

              {/* Dynamic Ingredients Builder */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Ingredienser:
                  </label>
                  <button
                    type="button"
                    onClick={handleAddIngredientRow}
                    className="text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Legg til ingrediens
                  </button>
                </div>

                <div className="space-y-2">
                  {formIngredients.map((ing, idx) => (
                    <div key={ing.id} className="grid grid-cols-12 gap-1.5 items-center">
                      <div className="col-span-6">
                        <input
                          type="text"
                          required
                          placeholder="Navn (f.eks. Kjøttdeig)"
                          value={ing.name}
                          onChange={e => handleIngredientChange(idx, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg outline-none"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="any"
                          required
                          placeholder="Mengde"
                          value={ing.amount}
                          onChange={e => handleIngredientChange(idx, 'amount', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <select
                          value={ing.unit}
                          onChange={e => handleIngredientChange(idx, 'unit', e.target.value)}
                          className="w-full px-1 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg outline-none text-[11px]"
                        >
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="stk">stk</option>
                          <option value="dl">dl</option>
                          <option value="l">l</option>
                          <option value="boks">boks</option>
                          <option value="pk">pk</option>
                          <option value="ss">ss</option>
                          <option value="ts">ts</option>
                        </select>
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredientRow(idx)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions text */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Fremgangsmåte (én instruks per linje):
                </label>
                <textarea
                  rows={4}
                  value={formInstructionsText}
                  onChange={e => setFormInstructionsText(e.target.value)}
                  placeholder="1. Stek kjøttdeigen...&#10;2. Kok pasta...&#10;3. Server med ost..."
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNew(false);
                  setEditingRecipe(null);
                }}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
              >
                Avbryt
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-blue-800 hover:bg-blue-900 text-white font-semibold rounded-xl shadow-md"
              >
                Lagre oppskrift
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
