import { RECIPES } from '../data/recipes';
import { HouseholdProfile, PlannedMeal, Recipe, WeekPlan, MealSlot } from '../types';

const ACCOMPANIMENT_ONLY_IDS = new Set(['plain-roti-sabji-base', 'plain-rice-base']);

function eligibleRecipes(profile: HouseholdProfile, slot: MealSlot): Recipe[] {
  return RECIPES.filter((r) => {
    if (ACCOMPANIMENT_ONLY_IDS.has(r.id)) return false;
    if (!r.slot.includes(slot)) return false;
    if (!r.diet.includes(profile.diet)) return false;
    if (!r.requiresAppliances.every((a) => profile.appliances.includes(a))) return false;
    if (profile.cuisines.length && !profile.cuisines.includes(r.cuisine)) return false;
    if (r.avoidForConditions?.some((c) => profile.conditions.includes(c))) return false;
    return true;
  });
}

/** Repeat tolerance controls how many days must pass before a dish can recur. */
function cooldownDays(profile: HouseholdProfile): number {
  if (profile.repeatTolerance === 'high') return 1;
  if (profile.repeatTolerance === 'medium') return 2;
  return 4;
}

export function generateWeekPlan(profile: HouseholdProfile, startDate: Date): WeekPlan {
  const meals: PlannedMeal[] = [];
  const lastUsedDay: Record<string, number> = {};
  const cooldown = cooldownDays(profile);

  for (let day = 0; day < 7; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().slice(0, 10);

    for (const slot of profile.mealsToPlan) {
      const candidates = eligibleRecipes(profile, slot).filter(
        (r) => lastUsedDay[r.id] === undefined || day - lastUsedDay[r.id] >= cooldown
      );
      const pool = candidates.length ? candidates : eligibleRecipes(profile, slot);
      if (!pool.length) continue;

      const recipe = pool[(day * 7 + profile.mealsToPlan.indexOf(slot)) % pool.length];
      lastUsedDay[recipe.id] = day;
      meals.push({ date: dateStr, slot, recipe });

      // Attach a plain roti/rice accompaniment for lunch/dinner mains, mirroring
      // how an Indian thali is actually composed rather than one dish per slot.
      if ((slot === 'lunch' || slot === 'dinner') && recipe.id !== 'plain-roti-sabji-base' && recipe.id !== 'plain-rice-base') {
        const accompaniment = RECIPES.find((r) =>
          r.cuisine === 'south-indian' ? r.id === 'plain-rice-base' : r.id === 'plain-roti-sabji-base'
        );
        if (accompaniment) meals.push({ date: dateStr, slot, recipe: accompaniment });
      }
    }
  }

  const costWeights = { low: 60, medium: 120, high: 220 };
  const estimatedCostInr = meals.reduce((sum, m) => sum + costWeights[m.recipe.costTier], 0);

  return { startDate: startDate.toISOString().slice(0, 10), meals, estimatedCostInr };
}
