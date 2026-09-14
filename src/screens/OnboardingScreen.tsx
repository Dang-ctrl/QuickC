import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { Appliance, Condition, Cuisine, DietType, HouseholdProfile, MealSlot } from '../types';

const DIETS: DietType[] = ['veg', 'eggetarian', 'non-veg', 'jain', 'vegan'];
const APPLIANCES: Appliance[] = ['gas-2-burner', 'gas-4-burner', 'induction', 'otg', 'microwave', 'mixer-grinder', 'air-fryer', 'pressure-cooker'];
const CUISINES: Cuisine[] = ['north-indian', 'gujarati', 'south-indian', 'punjabi', 'bengali', 'maharashtrian'];
const CONDITIONS: Condition[] = ['diabetes', 'thyroid', 'pcos', 'hypertension', 'pregnancy'];
const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function OnboardingScreen({ onSubmit }: { onSubmit: (profile: HouseholdProfile) => void }) {
  const [diet, setDiet] = useState<DietType>('veg');
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [appliances, setAppliances] = useState<Appliance[]>(['gas-2-burner', 'pressure-cooker']);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [mealsToPlan, setMealsToPlan] = useState<MealSlot[]>(['lunch', 'dinner']);
  const [peopleCount, setPeopleCount] = useState('4');
  const [weeklyBudgetInr, setWeeklyBudgetInr] = useState('2500');
  const [repeatTolerance, setRepeatTolerance] = useState<'low' | 'medium' | 'high'>('medium');
  const [cookRepertoire, setCookRepertoire] = useState<HouseholdProfile['cookRepertoire']>('household-member');

  function submit() {
    onSubmit({
      diet,
      conditions,
      allergies: [],
      appliances,
      cookRepertoire,
      peopleCount: Number(peopleCount) || 1,
      mealsToPlan,
      weeklyBudgetInr: Number(weeklyBudgetInr) || 0,
      cuisines,
      repeatTolerance,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Tell us about your kitchen</Text>

      <Text style={styles.h2}>Diet</Text>
      <View style={styles.row}>
        {DIETS.map((d) => (
          <Chip key={d} label={d} selected={diet === d} onPress={() => setDiet(d)} />
        ))}
      </View>

      <Text style={styles.h2}>Health conditions in the household</Text>
      <View style={styles.row}>
        {CONDITIONS.map((c) => (
          <Chip key={c} label={c} selected={conditions.includes(c)} onPress={() => setConditions(toggle(conditions, c))} />
        ))}
      </View>

      <Text style={styles.h2}>Appliances at home</Text>
      <View style={styles.row}>
        {APPLIANCES.map((a) => (
          <Chip key={a} label={a} selected={appliances.includes(a)} onPress={() => setAppliances(toggle(appliances, a))} />
        ))}
      </View>

      <Text style={styles.h2}>Cuisine preference (leave empty for any)</Text>
      <View style={styles.row}>
        {CUISINES.map((c) => (
          <Chip key={c} label={c} selected={cuisines.includes(c)} onPress={() => setCuisines(toggle(cuisines, c))} />
        ))}
      </View>

      <Text style={styles.h2}>Meals to plan</Text>
      <View style={styles.row}>
        {SLOTS.map((s) => (
          <Chip key={s} label={s} selected={mealsToPlan.includes(s)} onPress={() => setMealsToPlan(toggle(mealsToPlan, s))} />
        ))}
      </View>

      <Text style={styles.h2}>Who cooks</Text>
      <View style={styles.row}>
        {(['household-member', 'help-basic', 'help-experienced'] as const).map((c) => (
          <Chip key={c} label={c} selected={cookRepertoire === c} onPress={() => setCookRepertoire(c)} />
        ))}
      </View>

      <Text style={styles.h2}>How much repeat is okay</Text>
      <View style={styles.row}>
        {(['low', 'medium', 'high'] as const).map((r) => (
          <Chip key={r} label={r} selected={repeatTolerance === r} onPress={() => setRepeatTolerance(r)} />
        ))}
      </View>

      <Text style={styles.h2}>People in household</Text>
      <TextInput style={styles.input} keyboardType="number-pad" value={peopleCount} onChangeText={setPeopleCount} />

      <Text style={styles.h2}>Weekly grocery budget (₹)</Text>
      <TextInput style={styles.input} keyboardType="number-pad" value={weeklyBudgetInr} onChangeText={setWeeklyBudgetInr} />

      <Pressable style={styles.submit} onPress={submit}>
        <Text style={styles.submitText}>Generate my week's plan</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 4, paddingBottom: 60 },
  h1: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  h2: { fontSize: 14, fontWeight: '600', marginTop: 18, marginBottom: 8, color: '#333' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#ccc' },
  chipSelected: { backgroundColor: '#1F5D48', borderColor: '#1F5D48' },
  chipText: { fontSize: 13, color: '#333' },
  chipTextSelected: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 15 },
  submit: { backgroundColor: '#B9791F', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 28 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
