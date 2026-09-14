import React, { useMemo } from 'react';
import { View, Text, SectionList, StyleSheet, Pressable } from 'react-native';
import { WeekPlan, PlannedMeal } from '../types';

interface Props {
  plan: WeekPlan;
  onContinue: () => void;
}

export default function PlanScreen({ plan, onContinue }: Props) {
  const sections = useMemo(() => {
    const byDate = new Map<string, PlannedMeal[]>();
    for (const meal of plan.meals) {
      const list = byDate.get(meal.date) ?? [];
      list.push(meal);
      byDate.set(meal.date, list);
    }
    return Array.from(byDate.entries()).map(([date, meals]) => ({ title: date, data: meals }));
  }, [plan]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.h1}>This week's plan</Text>
        <Text style={styles.estimate}>Estimated cost: ₹{plan.estimatedCostInr}</Text>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item, idx) => item.date + item.slot + item.recipe.id + idx}
        renderSectionHeader={({ section }) => <Text style={styles.dateHeader}>{section.title}</Text>}
        renderItem={({ item }) => (
          <View style={styles.mealRow}>
            <Text style={styles.slot}>{item.slot}</Text>
            <Text style={styles.dish}>{item.recipe.name}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
      <Pressable style={styles.continueBtn} onPress={onContinue}>
        <Text style={styles.continueText}>Build shopping list</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 8 },
  h1: { fontSize: 22, fontWeight: '700' },
  estimate: { fontSize: 13, color: '#666', marginTop: 4 },
  dateHeader: { backgroundColor: '#F1F0E5', paddingHorizontal: 20, paddingVertical: 6, fontWeight: '700', fontSize: 13 },
  mealRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 8, gap: 12, alignItems: 'center' },
  slot: { width: 80, fontSize: 12, color: '#B9791F', textTransform: 'uppercase', fontWeight: '700' },
  dish: { fontSize: 15, flex: 1 },
  continueBtn: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#1F5D48', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  continueText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
