import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import { PLATFORM_CONFIGS } from '../platformConfigs';
import { buildInjectionScript } from './injection';
import { QuickCommercePlatform, ShoppingListItem } from '../../types';

type ItemStatus = 'pending' | 'added' | 'failed';

interface Props {
  platform: QuickCommercePlatform;
  items: ShoppingListItem[];
}

// If the page the automation is driving navigates away mid-run, the WebView
// tears down that page's whole JS context — any in-flight injected script,
// including its own timeouts, dies with it and can never send a 'done'
// message. Nothing inside the injected script can detect that; only the
// React Native side, watching the WebView itself, can.
const OVERALL_WATCHDOG_MS = 90_000;

export default function WebViewCartFillScreen({ platform, items }: Props) {
  const config = PLATFORM_CONFIGS[platform];
  const webviewRef = useRef<WebView>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runStartUrlRef = useRef<string | null>(null);
  const [statuses, setStatuses] = useState<ItemStatus[]>(items.map(() => 'pending'));
  const [running, setRunning] = useState(false);
  const [stalledReason, setStalledReason] = useState<string | null>(null);

  useEffect(() => () => clearWatchdog(), []);

  function clearWatchdog() {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }

  function stop(reason: string | null) {
    clearWatchdog();
    setRunning(false);
    setStalledReason(reason);
  }

  function start() {
    setStalledReason(null);
    setRunning(true);
    setStatuses(items.map(() => 'pending'));
    const script = buildInjectionScript(
      items.map((i) => ({ name: i.name })),
      config
    );
    webviewRef.current?.injectJavaScript(script);

    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      stop(
        "This is taking much longer than expected — the page probably navigated away mid-run, which stops the automation silently. Check the panel below and add anything still missing yourself, or hit Start again."
      );
    }, OVERALL_WATCHDOG_MS);
  }

  function cancel() {
    webviewRef.current?.injectJavaScript('window.__cartfillCancelled = true; true;');
    stop(null);
  }

  function onMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'start') {
        runStartUrlRef.current = null; // populated by the next onNavigationStateChange, if any
      } else if (msg.type === 'item-result') {
        setStatuses((prev) => {
          const next = [...prev];
          next[msg.index] = msg.ok ? 'added' : 'failed';
          return next;
        });
      } else if (msg.type === 'done' || msg.type === 'cancelled') {
        stop(null);
      }
    } catch {
      // non-JSON messages from the page are ignored
    }
  }

  function onNavigationStateChange(nav: WebViewNavigation) {
    if (!running) return;
    if (runStartUrlRef.current === null) {
      runStartUrlRef.current = nav.url;
      return;
    }
    // A navigation to a different page mid-run is exactly the failure mode
    // this screen can't recover from on its own — surface it immediately
    // instead of waiting out the full watchdog window.
    if (nav.url !== runStartUrlRef.current && !nav.loading) {
      stop(
        `${config.label}'s page changed while adding items, which stopped the automation. Review your cart and add anything missing yourself.`
      );
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

        {stalledReason && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{stalledReason}</Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          <Pressable style={[styles.button, running && styles.buttonDisabled]} onPress={start} disabled={running}>
            {running ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Start filling cart</Text>}
          </Pressable>
          {running && (
            <Pressable style={styles.stopButton} onPress={cancel}>
              <Text style={styles.stopButtonText}>Stop</Text>
            </Pressable>
          )}
        </View>

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
        onNavigationStateChange={onNavigationStateChange}
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
  notice: { backgroundColor: '#F3DDD6', borderRadius: 8, padding: 12 },
  noticeText: { fontSize: 12.5, color: '#9C3B2E' },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  button: { flex: 1, backgroundColor: '#1F5D48', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  stopButton: { backgroundColor: '#9C3B2E', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center' },
  stopButtonText: { color: '#fff', fontWeight: '600' },
  disclaimer: { fontSize: 12, color: '#888', marginTop: 6 },
  checklist: { maxHeight: 160, paddingHorizontal: 16 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  checklistIcon: { width: 18, fontWeight: '700' },
  checklistLabel: { flex: 1, fontSize: 13 },
  checklistReason: { fontSize: 11, color: '#B9791F' },
  webview: { flex: 1, borderTopWidth: 1, borderTopColor: '#eee' },
});
