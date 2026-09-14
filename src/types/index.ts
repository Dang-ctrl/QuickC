export type DietType = 'veg' | 'eggetarian' | 'non-veg' | 'jain' | 'vegan';

export type Condition = 'diabetes' | 'thyroid' | 'pcos' | 'hypertension' | 'pregnancy' | 'none';

export type Appliance = 'gas-2-burner' | 'gas-4-burner' | 'induction' | 'otg' | 'microwave' | 'mixer-grinder' | 'air-fryer' | 'pressure-cooker';

export type Cuisine = 'north-indian' | 'gujarati' | 'south-indian' | 'punjabi' | 'bengali' | 'maharashtrian';

export type MealSlot = 'breakfast' | 'lunch' | 'dinner';

export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'pc' | 'pack' | 'bunch' | 'tsp' | 'tbsp';

export interface Ingredient {
  name: string;
  qty: number;
  unit: Unit;
  /** rough purchasable pack size, used when consolidating into a shopping list */
  packSize?: number;
  packUnit?: Unit;
}

export interface Recipe {
  id: string;
  name: string;
  cuisine: Cuisine;
  diet: DietType[];
  slot: MealSlot[];
  requiresAppliances: Appliance[];
  ingredients: Ingredient[];
  avoidForConditions?: Condition[];
  isFasting?: boolean;
  costTier: 'low' | 'medium' | 'high';
}

export interface HouseholdProfile {
  diet: DietType;
  conditions: Condition[];
  allergies: string[];
  appliances: Appliance[];
  cookRepertoire: 'household-member' | 'help-basic' | 'help-experienced';
  peopleCount: number;
  mealsToPlan: MealSlot[];
  weeklyBudgetInr: number;
  cuisines: Cuisine[];
  repeatTolerance: 'low' | 'medium' | 'high';
}

export interface PlannedMeal {
  date: string;
  slot: MealSlot;
  recipe: Recipe;
}

export interface WeekPlan {
  startDate: string;
  meals: PlannedMeal[];
  estimatedCostInr: number;
}

export interface ShoppingListItem {
  name: string;
  totalQty: number;
  unit: Unit;
  category: 'staple' | 'perishable';
  haveAtHome?: boolean;
}

export type QuickCommercePlatform = 'blinkit' | 'zepto' | 'instamart';
