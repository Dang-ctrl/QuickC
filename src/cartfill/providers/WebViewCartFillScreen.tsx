import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { PLATFORM_CONFIGS } from '../platformConfigs';
import { buildInjectionScript } from './injection';
import { QuickCommercePlatform, ShoppingListItem } from '../../types';

type ItemStatus = 'pending' | 'added' | 'failed';

interface Props {
  platform: QuickCommercePlatform;
  items: ShoppingListItem[];
}

// If the page the automation is driving does a full reload mid-run, the
// WebView tears down that page's JS context — the injected script dies with
// it and can never send 'done'. Only the React Native side can notice, and
// the signal is silence: the script reports after every item, so no message
// for this long means it's gone. (Watching the URL instead would misfire:
// Blinkit and Zepto change it on every search without reloading.)
const INACTIVITY_WATCHDOG_MS = 60_000;

const FAILURE_TEXT: Record<string, string> = {
  'no-matching-product': 'no matching product found, add manually',
  'search-input-not-found': "couldn't open search, add manually",
  'add-not-confirmed': 'unsure it was added, check your cart',
  'timed-out': 'took too long, add manually',
};

export default function WebViewCartFillScreen({ platform, items }: Props) {
  const config = PLATFORM_CONFIGS[platform];
  const webviewRef = useRef<WebView>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningRef = useRef(false);
  const [statuses, setStatuses] = useState<ItemStatus[]>(items.map(() => 'pending'));
  const [running, setRunning] = useState(false);
  const [stalledReason, setStalledReason] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  useEffect(() => () => clearWatchdog(), []);

  function clearWatchdog() {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }

  function stop(reason: string | null) {
    clearWatchdog();
    runningRef.current = false;
    setRunning(false);
    setStalledReason(reason);
  }

  function start() {
    setStalledReason(null);
    runningRef.current = true;
    setRunning(true);
    setStatuses(items.map(() => 'pending'));
    setNotes({});
    const script = buildInjectionScript(
      items.map((i) => ({ name: i.name })),
      config
    );
    webviewRef.current?.injectJavaScript(script);

    armWatchdog();
  }

  function armWatchdog() {
    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      stop(
        "The automation stopped responding — the page probably reloaded mid-run. Check the panel below and add anything still missing yourself, or hit Start again."
      );
    }, INACTIVITY_WATCHDOG_MS);
  }

  function scriptFor(resume: boolean) {
    return buildInjectionScript(
      items.map((i) => ({ name: i.name })),
      config,
      { resume }
    );
  }

  // Some sites (Zepto) reload the page when search opens, which destroys the
  // running script. The script keeps its place in sessionStorage; re-injecting
  // it after each load lets it pick up from the item that was in flight.
  function onLoadEnd() {
    if (runningRef.current) webviewRef.current?.injectJavaScript(scriptFor(true));
  }

  function cancel() {
    webviewRef.current?.injectJavaScript(
      "window.__cartfillCancelled = true; try { sessionStorage.removeItem('__cartfill_state__'); } catch (e) {} true;"
    );
    stop(null);
  }

  function onMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'start' || msg.type === 'resumed') {
        armWatchdog();
      } else if (msg.type === 'item-result') {
        armWatchdog();
        setStatuses((prev) => {
          const next = [...prev];
          next[msg.index] = msg.ok ? 'added' : 'failed';
          return next;
        });
        setNotes((prev) => ({
          ...prev,
          [msg.index]: msg.ok ? `added: ${msg.matched}` : FAILURE_TEXT[msg.reason] ?? 'add manually',
        }));
      } else if (msg.type === 'done' || msg.type === 'cancelled') {
        stop(null);
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
            <View style={styles.checklistText}>
              <Text style={styles.checklistLabel} numberOfLines={1}>
                {item.name} ({item.totalQty}{item.unit})
              </Text>
              {notes[i] && (
                <Text style={[styles.checklistNote, statuses[i] === 'failed' && styles.checklistReason]} numberOfLines={1}>
                  {notes[i]}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      <WebView
        ref={webviewRef}
        source={{ uri: config.url }}
        style={styles.webview}
        onMessage={onMessage}
        onLoadEnd={onLoadEnd}
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
  checklist: { maxHeight: 200, paddingHorizontal: 16 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  checklistIcon: { width: 18, fontWeight: '700' },
  checklistText: { flex: 1 },
  checklistLabel: { fontSize: 13 },
  checklistNote: { fontSize: 11, color: '#666' },
  checklistReason: { fontSize: 11, color: '#B9791F' },
  webview: { flex: 1, borderTopWidth: 1, borderTopColor: '#eee' },
});
