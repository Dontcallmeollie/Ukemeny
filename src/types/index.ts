export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  notes?: string;
}

export type RecipeCategory = 'Kjøtt' | 'Kylling' | 'Fisk' | 'Vegetar' | 'Pasta' | 'Suppe' | 'Rask' | 'Annet';

export interface Recipe {
  id: string;
  name: string;
  category: RecipeCategory;
  description?: string;
  prepTimeMinutes?: number;
  ingredients: Ingredient[];
  instructions?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface DayPlan {
  id: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  dayName: string; // e.g. "Mandag"
  recipeId?: string;
  customDishName?: string;
  servings: number;
  manualExcludedIngredients: string[]; // Ingredient IDs or normalized names the user ticked as "Finnes i huset"
  isCompleted?: boolean;
}

export type StorageLocation = 'Kjøleskap' | 'Fryser' | 'Tørrvare' | 'Annet';

export interface PantryItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  category: StorageLocation;
  expiryDate?: string; // YYYY-MM-DD
  addedAt: number;
  updatedAt: number;
  notes?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  checked: boolean;
  source: 'plan' | 'manual';
  planMealNames?: string[];
  category?: StorageLocation;
  checkedAt?: number;
  estimatedExpiryDays?: number;
}

export interface AppSettings {
  id: string;
  theme: 'light' | 'dark' | 'system';
  planDaysCount: number; // e.g. 7, 3, 14
  notificationsEnabled: boolean;
  notificationHour: number; // e.g. 9 for 09:00
  lastNotificationCheckDate?: string;
  autoTransferToPantry: boolean; // default true
}

export type ExpiryStatus = 'expired' | 'warning' | 'ok' | 'none';

export interface ExpiryInfo {
  status: ExpiryStatus;
  daysRemaining: number | null;
  label: string;
  colorClass: string;
  badgeBg: string;
}
