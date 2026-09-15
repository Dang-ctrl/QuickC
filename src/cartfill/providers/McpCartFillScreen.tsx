import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { PLATFORM_CONFIGS } from '../platformConfigs';
import { searchAndAddItem } from './instamartMcpClient';
import { QuickCommercePlatform, ShoppingListItem } from '../../types';

type ItemStatus = 'pending' | 'added' | 'failed';

interface Props {
  platform: QuickCommercePlatform;
  items: ShoppingListItem[];
}

/**
 * Counterpart to WebViewCartFillScreen for platforms with a sanctioned tool
 * API. No embedded browser — items go straight to the platform over the
 * network via searchAndAddItem(), which is smoother for the user and
 * doesn't depend on the site's markup staying stable.
 */
export default function McpCartFillScreen({ platform, items }: Props) {
  const config = PLATFORM_CONFIGS[platform];
  const [statuses, setStatuses] = useState<ItemStatus[]>(items.map(() => 'pending'));
  const [running, setRunning] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  useEffect(() => {
    setStatuses(items.map(() => 'pending'));
  }, [items]);

  async function start() {
    setRunning(true);
    setBlockedReason(null);
    for (let i = 0; i < items.length; i++) {
      try {
        const result = await searchAndAddItem(items[i].name);
        setStatuses((prev) => {
          const next = [...prev];
          next[i] = result.ok ? 'added' : 'failed';
          return next;
        });
      } catch (err) {
        setBlockedReason(err instanceof Error ? err.message : String(err));
        break;
      }
    }
    setRunning(false);
  }

  const addedCount = statuses.filter((s) => s === 'added').length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fill {config.label} cart</Text>
      <Text style={styles.subtitle}>
        {running ? `Adding items — ${addedCount}/${items.length} done` : `${items.length} items ready`}
      </Text>

      {blockedReason && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{blockedReason}</Text>
        </View>
      )}

      <Pressable style={[styles.button, running && styles.buttonDisabled]} onPress={start} disabled={running}>
        {running ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Start filling cart</Text>}
      </Pressable>

      <View style={styles.checklist}>
        {items.map((item, i) => (
          <View key={item.name} style={styles.checklistRow}>
            <Text style={styles.checklistIcon}>{statuses[i] === 'added' ? '✓' : statuses[i] === 'failed' ? '!' : '·'}</Text>
            <Text style={styles.checklistLabel} numberOfLines={1}>
              {item.name} ({item.totalQty}{item.unit})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#555' },
  notice: { backgroundColor: '#F0E1C4', borderRadius: 8, padding: 12, marginTop: 4 },
  noticeText: { fontSize: 13, color: '#8A6A1E' },
  button: { backgroundColor: '#1F5D48', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  checklist: { marginTop: 12 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  checklistIcon: { width: 18, fontWeight: '700' },
  checklistLabel: { flex: 1, fontSize: 13 },
});
