import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView,
  Alert,
} from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { addHistoryEntry, getHistory, type ToolHistoryEntry } from '@/lib/features/toolsHistory/db';

const BARCODE_COLOR = '#7C3AED';

let CameraView: any = null;
let useCameraPermissions: any = null;
try {
  const cam = require('expo-camera');
  CameraView = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
} catch {}

const BARCODE_TYPES = ['ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e', 'itf14', 'qr', 'pdf417'];

function BarcodeCamera({ onScanned, onClose }: { onScanned: (type: string, data: string) => void; onClose: () => void }) {
  const colors = useColors();
  const [permission, requestPermission] = (useCameraPermissions ?? (() => [null, async () => {}]))();
  const [scanned, setScanned] = useState(false);

  const handleScanned = useCallback(({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScanned(type, data);
  }, [scanned, onScanned]);

  if (!CameraView) {
    return (
      <View style={[styles.camPlaceholder, { backgroundColor: colors.muted, borderRadius: 16 }]}>
        <MaterialCommunityIcons name="camera-off" size={48} color={colors.mutedForeground} />
        <Text style={[styles.camMsg, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Camera not available on this platform</Text>
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <View style={[styles.camPlaceholder, { backgroundColor: colors.muted, borderRadius: 16 }]}>
        <MaterialCommunityIcons name="camera-lock" size={48} color={colors.mutedForeground} />
        <Text style={[styles.camMsg, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>Camera Permission Required</Text>
        <TouchableOpacity style={[styles.permBtn, { backgroundColor: BARCODE_COLOR }]} onPress={requestPermission}>
          <Text style={[styles.permBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
      <CameraView
        style={{ height: 300 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
        onBarcodeScanned={scanned ? undefined : handleScanned}
      />
      <View style={styles.scanOverlay}>
        <View style={[styles.scanBox, { borderColor: BARCODE_COLOR }]} />
      </View>
      <TouchableOpacity style={styles.closeCam} onPress={onClose}>
        <MaterialCommunityIcons name="close-circle" size={32} color="rgba(255,255,255,0.85)" />
      </TouchableOpacity>
      {scanned && (
        <TouchableOpacity style={[styles.rescanBtn, { backgroundColor: BARCODE_COLOR }]} onPress={() => setScanned(false)}>
          <Text style={[styles.rescanText, { fontFamily: 'Inter_600SemiBold' }]}>Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function BarcodeScannerScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const [showCamera, setShowCamera] = useState(false);
  const [lastResult, setLastResult] = useState<{ type: string; data: string } | null>(null);
  const [history, setHistory] = useState<ToolHistoryEntry[]>([]);

  const loadHistory = useCallback(async () => {
    setHistory(await getHistory('barcode'));
  }, []);

  React.useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleScanned = useCallback(async (type: string, data: string) => {
    setShowCamera(false);
    setLastResult({ type: type.toUpperCase(), data });
    await addHistoryEntry({
      category: 'barcode',
      toolId: 'barcode-scanner',
      title: `Scanned: ${type.toUpperCase()}`,
      detail: data,
      outputUri: null,
    });
    loadHistory();
  }, [loadHistory]);

  const copyToClipboard = async (text: string) => {
    await ExpoClipboard.setStringAsync(text);
    Alert.alert('Copied', 'Result copied to clipboard');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Barcode Scanner</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 24 }]}>
        {showCamera ? (
          <BarcodeCamera onScanned={handleScanned} onClose={() => setShowCamera(false)} />
        ) : (
          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: BARCODE_COLOR, borderRadius: colors.radius }]}
            onPress={() => setShowCamera(true)}
          >
            <MaterialCommunityIcons name="barcode-scan" size={28} color="#fff" />
            <Text style={[styles.scanBtnText, { fontFamily: 'Inter_700Bold' }]}>Scan with Camera</Text>
          </TouchableOpacity>
        )}

        {/* Supported formats info */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="information-outline" size={18} color={BARCODE_COLOR} />
          <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Supports: EAN-13, EAN-8, Code 128, Code 39, UPC-A, UPC-E, ITF-14, QR, PDF417
          </Text>
        </View>

        {lastResult && (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: BARCODE_COLOR + '40', borderRadius: colors.radius }]}>
            <View style={styles.resultRow}>
              <View style={[styles.typeBadge, { backgroundColor: BARCODE_COLOR + '18', borderRadius: 6 }]}>
                <Text style={[styles.typeLabel, { color: BARCODE_COLOR, fontFamily: 'Inter_600SemiBold' }]}>{lastResult.type}</Text>
              </View>
              <TouchableOpacity onPress={() => copyToClipboard(lastResult.data)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="content-copy" size={18} color={BARCODE_COLOR} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.resultText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} selectable>
              {lastResult.data}
            </Text>
          </View>
        )}

        {history.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>Scan History</Text>
            {history.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.histItem, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}
                onPress={() => copyToClipboard(item.detail)}
              >
                <MaterialCommunityIcons name="barcode" size={20} color={BARCODE_COLOR} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.histTitle, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.histDetail, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>{item.detail}</Text>
                </View>
                <MaterialCommunityIcons name="content-copy" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  iconBtn: { padding: 8, borderRadius: 8 },
  title: { flex: 1, fontSize: 18 },
  scroll: { padding: 16, gap: 14 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 18 },
  scanBtnText: { color: '#fff', fontSize: 16 },
  camPlaceholder: { height: 260, alignItems: 'center', justifyContent: 'center', gap: 12 },
  camMsg: { fontSize: 15 },
  permBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  permBtnText: { color: '#fff', fontSize: 14 },
  scanOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scanBox: { width: 200, height: 100, borderWidth: 2, borderRadius: 4 },
  closeCam: { position: 'absolute', top: 12, right: 12 },
  rescanBtn: { position: 'absolute', bottom: 16, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24 },
  rescanText: { color: '#fff', fontSize: 14 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },
  resultCard: { padding: 16, borderWidth: 1.5, gap: 10 },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4 },
  typeLabel: { fontSize: 12 },
  resultText: { fontSize: 16 },
  sectionLabel: { fontSize: 13 },
  histItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1 },
  histTitle: { fontSize: 13 },
  histDetail: { fontSize: 11, marginTop: 2 },
});
