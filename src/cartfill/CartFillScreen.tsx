import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { PLATFORM_CONFIGS } from './platformConfigs';
import { buildInjectionScript } from './injection';
import { QuickCommercePlatform, ShoppingListItem } from '../types';

type ItemStatus = 'pending' | 'added' | 'failed';

interface Props {
  platform: QuickCommercePlatform;
  items: ShoppingListItem[];
}

export default function CartFillScreen({ platform, items }: Props) {
  const config = PLATFORM_CONFIGS[platform];
  const webviewRef = useRef<WebView>(null);
  const [statuses, setStatuses] = useState<ItemStatus[]>(items.map(() => 'pending'));
  const [running, setRunning] = useState(false);
  const [failReasons, setFailReasons] = useState<Record<number, string>>({});

  function start() {
    setRunning(true);
    setStatuses(items.map(() => 'pending'));
    const script = buildInjectionScript(
      items.map((i) => ({ name: i.name })),
      config
    );
    webviewRef.current?.injectJavaScript(script);
  }

  function onMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'item-result') {
        setStatuses((prev) => {
          const next = [...prev];
          next[msg.index] = msg.ok ? 'added' : 'failed';
          return next;
        });
        if (!msg.ok) setFailReasons((prev) => ({ ...prev, [msg.index]: msg.reason }));
      } else if (msg.type === 'done') {
        setRunning(false);
      }
    } catch {
      // non-JSON messages from the page are ignored
    }
  }

  const addedCount = statuses.filter((s) => s === 'added').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fill {config.label} cart</Text>
        <Text style={styles.subtitle}>
          {running ? `Adding items — ${addedCount}/${items.length} done` : `${items.length} items ready`}
        </Text>
        <Pressable style={[styles.button, running && styles.buttonDisabled]} onPress={start} disabled={running}>
          {running ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Start filling cart</Text>}
        </Pressable>
        <Text style={styles.disclaimer}>
          This drives {config.label}'s own website in the panel below, on your logged-in session. Nothing is sent to
          our servers. Review your cart before checking out — a few items may need manual confirmation if the site
          layout doesn't match.
        </Text>
      </View>

      <View style={styles.checklist}>
        {items.map((item, i) => (
          <View key={item.name} style={styles.checklistRow}>
            <Text style={styles.checklistIcon}>{statuses[i] === 'added' ? '✓' : statuses[i] === 'failed' ? '!' : '·'}</Text>
            <Text style={styles.checklistLabel} numberOfLines={1}>
              {item.name} ({item.totalQty}{item.unit})
            </Text>
            {statuses[i] === 'failed' && <Text style={styles.checklistReason}>needs manual add</Text>}
          </View>
        ))}
      </View>

      <WebView
        ref={webviewRef}
        source={{ uri: config.url }}
        style={styles.webview}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#555' },
  button: { backgroundColor: '#1F5D48', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  disclaimer: { fontSize: 12, color: '#888', marginTop: 6 },
  checklist: { maxHeight: 160, paddingHorizontal: 16 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  checklistIcon: { width: 18, fontWeight: '700' },
  checklistLabel: { flex: 1, fontSize: 13 },
  checklistReason: { fontSize: 11, color: '#B9791F' },
  webview: { flex: 1, borderTopWidth: 1, borderTopColor: '#eee' },
});
