import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { ShoppingListItem, QuickCommercePlatform } from '../types';

interface Props {
  items: ShoppingListItem[];
  onPickPlatform: (platform: QuickCommercePlatform, finalItems: ShoppingListItem[]) => void;
}

const PLATFORMS: { id: QuickCommercePlatform; label: string }[] = [
  { id: 'blinkit', label: 'Blinkit' },
  { id: 'zepto', label: 'Zepto' },
  { id: 'instamart', label: 'Instamart' },
];

export default function ShoppingListScreen({ items, onPickPlatform }: Props) {
  const [haveAtHome, setHaveAtHome] = useState<Set<string>>(new Set());

  function toggleHave(name: string) {
    setHaveAtHome((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  const remaining = items.filter((i) => !haveAtHome.has(i.name));
  const staples = remaining.filter((i) => i.category === 'staple');
  const perishables = remaining.filter((i) => i.category === 'perishable');

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Shopping list</Text>
      <Text style={styles.hint}>Tick anything you already have at home to drop it from the list.</Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.name}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListHeaderComponent={<Text style={styles.sectionLabel}>All items</Text>}
        renderItem={({ item }) => {
          const checked = haveAtHome.has(item.name);
          return (
            <Pressable style={styles.row} onPress={() => toggleHave(item.name)}>
              <View style={[styles.checkbox, checked && styles.checkboxChecked]} />
              <Text style={[styles.itemName, checked && styles.itemNameChecked]}>{item.name}</Text>
              <Text style={styles.qty}>
                {item.totalQty}{item.unit}
              </Text>
              <Text style={styles.category}>{item.category}</Text>
            </Pressable>
          );
        }}
      />

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>
          {remaining.length} items to order · {staples.length} staple · {perishables.length} perishable
        </Text>
        <View style={styles.platformRow}>
          {PLATFORMS.map((p) => (
            <Pressable key={p.id} style={styles.platformBtn} onPress={() => onPickPlatform(p.id, remaining)}>
              <Text style={styles.platformBtnText}>Fill on {p.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingBottom: 0 },
  h1: { fontSize: 22, fontWeight: '700' },
  hint: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#B9791F', textTransform: 'uppercase', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#999' },
  checkboxChecked: { backgroundColor: '#1F5D48', borderColor: '#1F5D48' },
  itemName: { flex: 1, fontSize: 14 },
  itemNameChecked: { textDecorationLine: 'line-through', color: '#999' },
  qty: { fontSize: 12, color: '#666', width: 60, textAlign: 'right' },
  category: { fontSize: 10, color: '#999', width: 70, textAlign: 'right', textTransform: 'uppercase' },
  footer: { borderTopWidth: 1, borderTopColor: '#eee', paddingVertical: 14, gap: 10 },
  footerLabel: { fontSize: 12, color: '#555' },
  platformRow: { flexDirection: 'row', gap: 8 },
  platformBtn: { flex: 1, backgroundColor: '#1F5D48', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  platformBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
