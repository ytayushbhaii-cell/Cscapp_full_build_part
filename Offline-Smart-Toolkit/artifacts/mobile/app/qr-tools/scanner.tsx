import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView,
  Alert, FlatList,
} from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { parseScannedQR } from '@/lib/features/qr/qrService';
import { addHistoryEntry, getHistory, type ToolHistoryEntry } from '@/lib/features/toolsHistory/db';

const QR_COLOR = '#8B5CF6';

// Lazy camera import to avoid issues when expo-camera is not available on web
let CameraView: any = null;
let useCameraPermissions: any = null;
try {
  const cam = require('expo-camera');
  CameraView = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
} catch {}

function CameraScanner({ onScanned, onClose }: { onScanned: (data: string) => void; onClose: () => void }) {
  const colors = useColors();
  const [permission, requestPermission] = (useCameraPermissions ?? (() => [null, async () => {}]))();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = useCallback(({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScanned(data);
  }, [scanned, onScanned]);

  if (!CameraView) {
    return (
      <View style={[styles.camPlaceholder, { backgroundColor: colors.muted, borderRadius: 16 }]}>
        <MaterialCommunityIcons name="camera-off" size={48} color={colors.mutedForeground} />
        <Text style={[styles.camMsg, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          Camera not available on this platform
        </Text>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.camPlaceholder, { backgroundColor: colors.muted, borderRadius: 16 }]}>
        <MaterialCommunityIcons name="camera-lock" size={48} color={colors.mutedForeground} />
        <Text style={[styles.camMsg, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.camPlaceholder, { backgroundColor: colors.muted, borderRadius: 16 }]}>
        <MaterialCommunityIcons name="camera-off" size={48} color={colors.mutedForeground} />
        <Text style={[styles.camMsg, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>Camera Permission Required</Text>
        <Text style={[styles.camSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Allow camera access to scan QR codes</Text>
        <TouchableOpacity style={[styles.permBtn, { backgroundColor: QR_COLOR }]} onPress={requestPermission}>
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
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'pdf417', 'aztec', 'datamatrix'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View style={styles.scanOverlay}>
        <View style={styles.scanCorner1} />
        <View style={styles.scanCorner2} />
        <View style={styles.scanCorner3} />
        <View style={styles.scanCorner4} />
      </View>
      <TouchableOpacity style={styles.closeCam} onPress={onClose}>
        <MaterialCommunityIcons name="close-circle" size={32} color="rgba(255,255,255,0.85)" />
      </TouchableOpacity>
      {scanned && (
        <TouchableOpacity style={[styles.rescanBtn, { backgroundColor: QR_COLOR }]} onPress={() => setScanned(false)}>
          <Text style={[styles.rescanText, { fontFamily: 'Inter_600SemiBold' }]}>Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function QRScannerScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const [showCamera, setShowCamera] = useState(false);
  const [lastResult, setLastResult] = useState<{ type: string; display: string; raw: string } | null>(null);
  const [history, setHistory] = useState<ToolHistoryEntry[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const loadHistory = useCallback(async () => {
    const h = await getHistory('qr');
    setHistory(h);
    setHistoryLoaded(true);
  }, []);

  React.useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleScanned = useCallback(async (data: string) => {
    setShowCamera(false);
    const parsed = parseScannedQR(data);
    setLastResult({ ...parsed, raw: data });
    await addHistoryEntry({
      category: 'qr',
      toolId: 'qr-scanner',
      title: `Scanned: ${parsed.type}`,
      detail: parsed.display,
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
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>QR Scanner</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 24 }]}>
        {showCamera ? (
          <CameraScanner onScanned={handleScanned} onClose={() => setShowCamera(false)} />
        ) : (
          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: QR_COLOR, borderRadius: colors.radius }]}
            onPress={() => setShowCamera(true)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="qrcode-scan" size={28} color="#fff" />
            <Text style={[styles.scanBtnText, { fontFamily: 'Inter_700Bold' }]}>Scan with Camera</Text>
          </TouchableOpacity>
        )}

        {/* Last result */}
        {lastResult && (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: QR_COLOR + '40', borderRadius: colors.radius }]}>
            <View style={styles.resultHeader}>
              <View style={[styles.typeBadge, { backgroundColor: QR_COLOR + '18', borderRadius: 6 }]}>
                <Text style={[styles.typeLabel, { color: QR_COLOR, fontFamily: 'Inter_600SemiBold' }]}>{lastResult.type}</Text>
              </View>
              <TouchableOpacity onPress={() => copyToClipboard(lastResult.raw)} style={styles.copyBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="content-copy" size={18} color={QR_COLOR} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.resultText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]} selectable>
              {lastResult.raw}
            </Text>
          </View>
        )}

        {/* History */}
        {historyLoaded && history.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>Recent Scans</Text>
            {history.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.historyItem, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}
                onPress={() => copyToClipboard(item.detail)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="qrcode" size={20} color={QR_COLOR} />
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

const CORNER_COLOR = '#8B5CF6';
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  iconBtn: { padding: 8, borderRadius: 8 },
  title: { flex: 1, fontSize: 18 },
  scroll: { padding: 16, gap: 16 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 18 },
  scanBtnText: { color: '#fff', fontSize: 16 },
  camPlaceholder: { height: 260, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  camMsg: { fontSize: 15, textAlign: 'center' },
  camSub: { fontSize: 13, textAlign: 'center' },
  permBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  permBtnText: { color: '#fff', fontSize: 14 },
  scanOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scanCorner1: { position: 'absolute', top: 60, left: 60, width: 40, height: 40, borderTopWidth: 3, borderLeftWidth: 3, borderColor: CORNER_COLOR },
  scanCorner2: { position: 'absolute', top: 60, right: 60, width: 40, height: 40, borderTopWidth: 3, borderRightWidth: 3, borderColor: CORNER_COLOR },
  scanCorner3: { position: 'absolute', bottom: 60, left: 60, width: 40, height: 40, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: CORNER_COLOR },
  scanCorner4: { position: 'absolute', bottom: 60, right: 60, width: 40, height: 40, borderBottomWidth: 3, borderRightWidth: 3, borderColor: CORNER_COLOR },
  closeCam: { position: 'absolute', top: 12, right: 12 },
  rescanBtn: { position: 'absolute', bottom: 16, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24 },
  rescanText: { color: '#fff', fontSize: 14 },
  resultCard: { padding: 16, borderWidth: 1.5, gap: 10 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4 },
  typeLabel: { fontSize: 12 },
  copyBtn: { padding: 4 },
  resultText: { fontSize: 14, lineHeight: 20 },
  sectionLabel: { fontSize: 13, marginTop: 4 },
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1 },
  histTitle: { fontSize: 13 },
  histDetail: { fontSize: 11, marginTop: 2 },
});
