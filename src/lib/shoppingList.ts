import { PlannedMeal, ShoppingListItem, Unit } from '../types';

const STAPLE_KEYWORDS = [
  'atta', 'rice', 'dal', 'oil', 'ghee', 'besan', 'sooji', 'rava', 'poha', 'sambar powder',
  'turmeric', 'cumin', 'coriander powder', 'mustard seeds', 'tamarind', 'peanuts', 'rajma',
];

function isStaple(name: string): boolean {
  const lower = name.toLowerCase();
  return STAPLE_KEYWORDS.some((k) => lower.includes(k));
}

// Rough conversion so quantities of the same ingredient in different units can be summed.
const TO_BASE: Partial<Record<Unit, { base: Unit; factor: number }>> = {
  kg: { base: 'g', factor: 1000 },
  l: { base: 'ml', factor: 1000 },
  tbsp: { base: 'g', factor: 15 },
  tsp: { base: 'g', factor: 5 },
};

function toBaseUnit(qty: number, unit: Unit): { qty: number; unit: Unit } {
  const conv = TO_BASE[unit];
  return conv ? { qty: qty * conv.factor, unit: conv.base } : { qty, unit };
}

/**
 * Merge every ingredient across a week's meals into one list, converted to
 * purchasable quantities. Quantities remain in the recipe's base unit
 * (grams/ml/pieces) — rounding to actual pack sizes (e.g. "1kg atta") is a
 * display-layer concern once real product catalogs are wired in per platform.
 */
export function consolidateShoppingList(meals: PlannedMeal[]): ShoppingListItem[] {
  const totals = new Map<string, { qty: number; unit: Unit }>();

  for (const meal of meals) {
    for (const ing of meal.recipe.ingredients) {
      const { qty, unit } = toBaseUnit(ing.qty, ing.unit);
      const key = `${ing.name}__${unit}`;
      const existing = totals.get(key);
      totals.set(key, { qty: (existing?.qty ?? 0) + qty, unit });
    }
  }

  const items: ShoppingListItem[] = [];
  for (const [key, { qty, unit }] of totals) {
    const name = key.split('__')[0];
    items.push({ name, totalQty: Math.round(qty * 10) / 10, unit, category: isStaple(name) ? 'staple' : 'perishable' });
  }

  return items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

export function applyPantryCheckoff(items: ShoppingListItem[], haveAtHome: Set<string>): ShoppingListItem[] {
  return items
    .map((item) => ({ ...item, haveAtHome: haveAtHome.has(item.name) }))
    .filter((item) => !item.haveAtHome);
}
