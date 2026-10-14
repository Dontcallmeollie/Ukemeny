import Dexie, { type Table } from 'dexie';
import { Recipe, DayPlan, PantryItem, ShoppingItem, AppSettings, StorageLocation } from '../types';
import { INITIAL_RECIPES, getInitialPantryItems, generateInitialMealPlan, DEFAULT_SETTINGS } from './seed';
import { normalizeName, mergeAmounts, estimateDefaultShelfLifeDays, addDaysToDate } from '../utils/unitConverter';

export class MatAppDatabase extends Dexie {
  recipes!: Table<Recipe, string>;
  plan!: Table<DayPlan, string>;
  pantry!: Table<PantryItem, string>;
  shoppingItems!: Table<ShoppingItem, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('MatAppDB');
    this.version(1).stores({
      recipes: 'id, name, category, createdAt',
      plan: 'id, date, recipeId',
      pantry: 'id, name, category, expiryDate',
      shoppingItems: 'id, name, checked, source',
      settings: 'id'
    });
  }
}

export const db = new MatAppDatabase();

// Initialize and seed database if empty
export async function initDatabase(): Promise<void> {
  const recipeCount = await db.recipes.count();
  if (recipeCount === 0) {
    await db.recipes.bulkAdd(INITIAL_RECIPES);
  }

  const pantryCount = await db.pantry.count();
  if (pantryCount === 0) {
    await db.pantry.bulkAdd(getInitialPantryItems());
  }

  const planCount = await db.plan.count();
  if (planCount === 0) {
    await db.plan.bulkAdd(generateInitialMealPlan(7));
  }

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add(DEFAULT_SETTINGS);
  }
}

// Generate or synchronize the shopping list from active meal plan
// Rules:
// 1. Gather all ingredients for planned days.
// 2. Exclude ingredients marked "manualExcludedIngredients" (huket av som "finnes i huset" av brukeren).
// 3. Merge duplicate ingredients (e.g. 200g + 300g = 500g).
// 4. Preserve existing manual items and already checked state where appropriate.
export async function syncShoppingListFromPlan(): Promise<void> {
  const plans = await db.plan.toArray();
  const recipes = await db.recipes.toArray();
  const existingShoppingItems = await db.shoppingItems.toArray();
  const pantryItems = await db.pantry.toArray();

  const recipeMap = new Map<string, Recipe>();
  recipes.forEach(r => recipeMap.set(r.id, r));

  // Map to accumulate required items from plan: normalizedName -> ShoppingItem draft
  interface AggregatedItem {
    name: string;
    amount: number;
    unit: string;
    planMealNames: string[];
    category: StorageLocation;
  }

  const aggregated = new Map<string, AggregatedItem[]>();

  for (const day of plans) {
    if (!day.recipeId) continue;
    const recipe = recipeMap.get(day.recipeId);
    if (!recipe) continue;

    const scaleFactor = (day.servings || 4) / 4;

    for (const ing of recipe.ingredients) {
      // Check if user manually marked this ingredient as already at home
      const isExcluded = day.manualExcludedIngredients && day.manualExcludedIngredients.includes(ing.id);
      if (isExcluded) continue;

      const normName = normalizeName(ing.name);
      const scaledAmount = Math.round(ing.amount * scaleFactor * 10) / 10;
      const list = aggregated.get(normName) || [];

      // Determine likely storage category
      let category: StorageLocation = 'Kjøleskap';
      const existingInPantry = pantryItems.find(p => normalizeName(p.name) === normName);
      if (existingInPantry) {
        category = existingInPantry.category;
      } else {
        const n = normName;
        if (n.includes('pasta') || n.includes('ris') || n.includes('mel') || n.includes('krydder') || n.includes('olje') || n.includes('boks')) {
          category = 'Tørrvare';
        } else if (n.includes('frossen') || n.includes('is')) {
          category = 'Fryser';
        }
      }

      // Try to merge with an existing entry in the list for this item name
      let merged = false;
      for (let i = 0; i < list.length; i++) {
        const tryMerge = mergeAmounts(list[i].amount, list[i].unit, scaledAmount, ing.unit);
        if (tryMerge) {
          list[i].amount = tryMerge.amount;
          list[i].unit = tryMerge.unit;
          if (!list[i].planMealNames.includes(recipe.name)) {
            list[i].planMealNames.push(recipe.name);
          }
          merged = true;
          break;
        }
      }

      if (!merged) {
        list.push({
          name: ing.name,
          amount: scaledAmount,
          unit: ing.unit,
          planMealNames: [recipe.name],
          category
        });
      }

      aggregated.set(normName, list);
    }
  }

  // Preserve manual shopping items (source === 'manual')
  const manualItems = existingShoppingItems.filter(item => item.source === 'manual');

  // Existing plan items that user might have already checked off in current shopping trip
  const existingCheckedPlanItems = new Map<string, ShoppingItem>();
  existingShoppingItems
    .filter(item => item.source === 'plan' && item.checked)
    .forEach(item => {
      existingCheckedPlanItems.set(`${normalizeName(item.name)}_${item.unit.toLowerCase()}`, item);
    });

  const newItems: ShoppingItem[] = [];

  aggregated.forEach((items, normName) => {
    items.forEach((item, idx) => {
      const key = `${normName}_${item.unit.toLowerCase()}`;
      const wasChecked = existingCheckedPlanItems.get(key);

      newItems.push({
        id: wasChecked ? wasChecked.id : `plan-item-${normName}-${idx}`,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        checked: wasChecked ? wasChecked.checked : false,
        source: 'plan',
        planMealNames: item.planMealNames,
        category: item.category,
        checkedAt: wasChecked?.checkedAt,
        estimatedExpiryDays: estimateDefaultShelfLifeDays(item.name, item.category)
      });
    });
  });

  // Combine new plan items with manual items
  await db.transaction('rw', db.shoppingItems, async () => {
    await db.shoppingItems.clear();
    await db.shoppingItems.bulkAdd([...newItems, ...manualItems]);
  });
}

// Check off shopping item -> Cross-sync to Pantry!
export async function toggleShoppingItem(itemId: string, forceState?: boolean): Promise<{ wasTransferredToPantry: boolean; pantryItemName?: string }> {
  const item = await db.shoppingItems.get(itemId);
  if (!item) return { wasTransferredToPantry: false };

  const newChecked = forceState !== undefined ? forceState : !item.checked;
  const now = Date.now();

  await db.shoppingItems.update(itemId, {
    checked: newChecked,
    checkedAt: newChecked ? now : undefined
  });

  // When checked as bought: automatically transfer to Pantry
  if (newChecked) {
    const settings = await db.settings.get('global-settings');
    const autoTransfer = settings?.autoTransferToPantry ?? true;

    if (autoTransfer) {
      const normName = normalizeName(item.name);
      const existingInPantry = await db.pantry
        .filter(p => normalizeName(p.name) === normName)
        .first();

      const daysToExpiry = item.estimatedExpiryDays || estimateDefaultShelfLifeDays(item.name, item.category);
      const expiryDate = addDaysToDate(new Date(), daysToExpiry);

      if (existingInPantry) {
        // Try merge amounts if compatible, otherwise increment
        const merged = mergeAmounts(existingInPantry.amount, existingInPantry.unit, item.amount, item.unit);
        if (merged) {
          await db.pantry.update(existingInPantry.id, {
            amount: merged.amount,
            unit: merged.unit,
            expiryDate: existingInPantry.expiryDate || expiryDate,
            updatedAt: now
          });
        } else {
          // Add as another pantry batch entry
          await db.pantry.add({
            id: `pantry-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: item.name,
            amount: item.amount,
            unit: item.unit,
            category: item.category || 'Kjøleskap',
            expiryDate,
            addedAt: now,
            updatedAt: now,
            notes: 'Kjøpt fra handleliste'
          });
        }
      } else {
        await db.pantry.add({
          id: `pantry-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: item.name,
          amount: item.amount,
          unit: item.unit,
          category: item.category || 'Kjøleskap',
          expiryDate,
          addedAt: now,
          updatedAt: now,
          notes: 'Kjøpt fra handleliste'
        });
      }

      return { wasTransferredToPantry: true, pantryItemName: item.name };
    }
  }

  return { wasTransferredToPantry: false };
}

// Add manual item to shopping list
export async function addManualShoppingItem(
  name: string,
  amount: number = 1,
  unit: string = 'stk',
  category: StorageLocation = 'Kjøleskap'
): Promise<void> {
  const normName = normalizeName(name);
  const existing = await db.shoppingItems
    .filter(i => normalizeName(i.name) === normName && i.unit.toLowerCase() === unit.toLowerCase() && !i.checked)
    .first();

  if (existing) {
    await db.shoppingItems.update(existing.id, {
      amount: existing.amount + amount
    });
  } else {
    await db.shoppingItems.add({
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      amount,
      unit: unit.trim(),
      checked: false,
      source: 'manual',
      category,
      estimatedExpiryDays: estimateDefaultShelfLifeDays(name, category)
    });
  }
}

// Clear checked items from shopping list
export async function clearCompletedShoppingItems(): Promise<void> {
  const completed = await db.shoppingItems.filter(i => i.checked).toArray();
  const ids = completed.map(i => i.id);
  await db.shoppingItems.bulkDelete(ids);
}

// Inventory check: Check which ingredients for a given recipe are available in Pantry
export interface RecipePantryStatus {
  totalCount: number;
  availableCount: number;
  missingCount: number;
  percentage: number;
  isReady: boolean;
  ingredientStatus: {
    ingredient: { id: string; name: string; amount: number; unit: string };
    inPantry: boolean;
    pantryAmount?: number;
    pantryUnit?: string;
    hasEnough: boolean;
  }[];
}

export function evaluateRecipeAgainstPantry(recipe: Recipe, pantryItems: PantryItem[], servingsRatio: number = 1): RecipePantryStatus {
  let availableCount = 0;
  const ingredientStatus = recipe.ingredients.map(ing => {
    const norm = normalizeName(ing.name);
    const neededAmount = ing.amount * servingsRatio;
    
    // Find matching items in pantry
    const matching = pantryItems.filter(p => normalizeName(p.name) === norm || norm.includes(normalizeName(p.name)) || normalizeName(p.name).includes(norm));

    if (matching.length === 0) {
      return {
        ingredient: ing,
        inPantry: false,
        hasEnough: false
      };
    }

    // Try unit comparison or sum
    let totalPantryAmount = 0;
    let pantryUnit = matching[0].unit;
    matching.forEach(m => {
      totalPantryAmount += m.amount;
    });

    const hasEnough = totalPantryAmount >= neededAmount;
    if (hasEnough || totalPantryAmount > 0) {
      availableCount++;
    }

    return {
      ingredient: ing,
      inPantry: true,
      pantryAmount: totalPantryAmount,
      pantryUnit,
      hasEnough
    };
  });

  const totalCount = recipe.ingredients.length;
  const percentage = totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 100;

  return {
    totalCount,
    availableCount,
    missingCount: totalCount - availableCount,
    percentage,
    isReady: availableCount === totalCount,
    ingredientStatus
  };
}

// Database Export/Import (Backup and Restore)
export async function exportDatabaseToJSON(): Promise<string> {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    recipes: await db.recipes.toArray(),
    plan: await db.plan.toArray(),
    pantry: await db.pantry.toArray(),
    shoppingItems: await db.shoppingItems.toArray(),
    settings: await db.settings.toArray()
  };
  return JSON.stringify(data, null, 2);
}

export async function importDatabaseFromJSON(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.recipes || !data.pantry) {
      throw new Error('Ugyldig sikkerhetskopi-format');
    }

    await db.transaction('rw', [db.recipes, db.plan, db.pantry, db.shoppingItems, db.settings], async () => {
      await db.recipes.clear();
      await db.plan.clear();
      await db.pantry.clear();
      await db.shoppingItems.clear();
      await db.settings.clear();

      if (data.recipes?.length) await db.recipes.bulkAdd(data.recipes);
      if (data.plan?.length) await db.plan.bulkAdd(data.plan);
      if (data.pantry?.length) await db.pantry.bulkAdd(data.pantry);
      if (data.shoppingItems?.length) await db.shoppingItems.bulkAdd(data.shoppingItems);
      if (data.settings?.length) await db.settings.bulkAdd(data.settings);
    });

    return true;
  } catch (err) {
    console.error('Feil ved import:', err);
    return false;
  }
}

// Reset database to initial seed data
export async function resetDatabaseToDefault(): Promise<void> {
  await db.transaction('rw', [db.recipes, db.plan, db.pantry, db.shoppingItems, db.settings], async () => {
    await db.recipes.clear();
    await db.plan.clear();
    await db.pantry.clear();
    await db.shoppingItems.clear();
    await db.settings.clear();

    await db.recipes.bulkAdd(INITIAL_RECIPES);
    await db.pantry.bulkAdd(getInitialPantryItems());
    await db.plan.bulkAdd(generateInitialMealPlan(7));
    await db.settings.add(DEFAULT_SETTINGS);
  });
  await syncShoppingListFromPlan();
}
