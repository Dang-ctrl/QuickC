import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from './src/screens/OnboardingScreen';
import PlanScreen from './src/screens/PlanScreen';
import ShoppingListScreen from './src/screens/ShoppingListScreen';
import CartFillScreen from './src/cartfill/CartFillScreen';
import { generateWeekPlan } from './src/lib/planGenerator';
import { consolidateShoppingList } from './src/lib/shoppingList';
import { HouseholdProfile, WeekPlan, ShoppingListItem, QuickCommercePlatform } from './src/types';

const PROFILE_STORAGE_KEY = 'thaliplan.householdProfile.v1';

type Step =
  | { name: 'onboarding'; savedProfile?: HouseholdProfile }
  | { name: 'plan'; plan: WeekPlan }
  | { name: 'list'; plan: WeekPlan }
  | { name: 'cartfill'; platform: QuickCommercePlatform; items: ShoppingListItem[] };

export default function App() {
  const [step, setStep] = useState<Step>({ name: 'onboarding' });

  useEffect(() => {
    AsyncStorage.getItem(PROFILE_STORAGE_KEY).then((raw) => {
      if (!raw) return;
      const profile: HouseholdProfile = JSON.parse(raw);
      setStep({ name: 'plan', plan: generateWeekPlan(profile, new Date()) });
    });
  }, []);

  function handleProfileSubmit(profile: HouseholdProfile) {
    AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    const plan = generateWeekPlan(profile, new Date());
    setStep({ name: 'plan', plan });
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      {step.name === 'onboarding' && <OnboardingScreen onSubmit={handleProfileSubmit} />}

      {step.name === 'plan' && (
        <PlanScreen plan={step.plan} onContinue={() => setStep({ name: 'list', plan: step.plan })} />
      )}

      {step.name === 'list' && (
        <ShoppingListScreen
          items={consolidateShoppingList(step.plan.meals)}
          onPickPlatform={(platform, items) => setStep({ name: 'cartfill', platform, items })}
        />
      )}

      {step.name === 'cartfill' && <CartFillScreen platform={step.platform} items={step.items} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
