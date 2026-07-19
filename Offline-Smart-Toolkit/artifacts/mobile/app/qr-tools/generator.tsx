import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import ViewShot from 'react-native-view-shot';
import QRCode from 'react-native-qrcode-svg';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { buildQRValue, describeQRValue, type QRType } from '@/lib/features/qr/qrService';
import { addHistoryEntry } from '@/lib/features/toolsHistory/db';
import { exportFile } from '@/lib/photoTools/exportUtils';

const QR_COLOR = '#8B5CF6';

const QR_TYPES: { id: QRType; label: string; icon: string }[] = [
  { id: 'text',     label: 'Text',     icon: 'text'              },
  { id: 'url',      label: 'URL',      icon: 'web'               },
  { id: 'phone',    label: 'Phone',    icon: 'phone'             },
  { id: 'email',    label: 'Email',    icon: 'email-outline'     },
  { id: 'wifi',     label: 'WiFi',     icon: 'wifi'              },
  { id: 'contact',  label: 'Contact',  icon: 'card-account-details-outline' },
  { id: 'location', label: 'Location', icon: 'map-marker-outline' },
];

const COLORS = ['#000000', '#1D4ED8', '#7C3AED', '#DC2626', '#059669', '#D97706', '#0F172A'];

export default function QRGeneratorScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { favoriteIds, toggleFavorite } = useApp();

  const topPadding = Platform.OS === 'web' ? 30 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const [qrType, setQrType] = useState<QRType>('text');
  const [formData, setFormData] = useState<Record<string, string>>({ text: '' });
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [qrSize, setQrSize] = useState(240);
  const [exporting, setExporting] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);
  const qrSvgRef = useRef<any>(null);

  /** Capture QR as PNG data-URL (web: SVG→Canvas; native: ViewShot) */
  const captureQR = async (): Promise<string> => {
    if (Platform.OS === 'web') {
      // react-native-qrcode-svg exposes the SVG DOM element via getRef on web
      const svgEl = qrSvgRef.current;
      if (!svgEl) throw new Error('SVG ref not available');
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const padded = qrSize + 40;
      const canvas = document.createElement('canvas');
      canvas.width = padded; canvas.height = padded;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, padded, padded);
      return new Promise<string>((resolve, reject) => {
        const img = new Image();
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        img.onload = () => {
          ctx.drawImage(img, 20, 20, qrSize, qrSize);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG render failed')); };
        img.src = url;
      });
    }
    // Native: use ViewShot
    return (viewShotRef.current as any).capture();
  };

  const isFav = favoriteIds.includes('qr-generator');
  const qrValue = buildQRValue(qrType, formData);
  const hasValue = qrValue.trim().length > 0;

  const updateField = (key: string, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleExport = async () => {
    if (!hasValue) { Alert.alert('Empty QR', 'Please enter some content first.'); return; }
    setExporting(true);
    try {
      const uri = await captureQR();
      const fileName = `QR-${qrType}-${Date.now()}.png`;
      await addHistoryEntry({
        category: 'qr',
        toolId: 'qr-generator',
        title: `QR ${qrType.toUpperCase()}`,
        detail: describeQRValue(qrType, formData),
        outputUri: uri,
      });
      await exportFile(uri, fileName);
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!hasValue) { Alert.alert('Empty QR', 'Please enter some content first.'); return; }
    setExporting(true);
    try {
      const uri = await captureQR();
      const fileName = `QR-${qrType}-${Date.now()}.png`;
      if (Platform.OS === 'web') {
        // Try Web Share API with file, fallback to download
        try {
          const res = await fetch(uri);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: 'image/png' });
          if ((navigator as any).canShare?.({ files: [file] })) {
            await (navigator as any).share({ files: [file], title: 'QR Code' });
            return;
          }
        } catch { /* fall through to download */ }
        await exportFile(uri, fileName);
      } else {
        const Sharing = await import('expo-sharing');
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share QR Code' });
        } else {
          await exportFile(uri, fileName);
        }
      }
    } catch (e: any) {
      Alert.alert('Share failed', e?.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveToGallery = async () => {
    if (!hasValue) { Alert.alert('Empty QR', 'Please enter some content first.'); return; }
    if (Platform.OS === 'web') { Alert.alert('Not supported', 'Gallery save is not available on web.'); return; }
    setExporting(true);
    try {
      const uri = await captureQR();
      const MediaLibrary = await import('expo-media-library');
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission denied', 'Allow photo library access to save to gallery.'); return; }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', 'QR code saved to your photo gallery.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  const renderFields = () => {
    const inp = (key: string, placeholder: string, keyboard?: any, multiline?: boolean) => (
      <TextInput
        key={key}
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: 'Inter_400Regular', borderRadius: colors.radius - 4 }, multiline ? { height: 80, textAlignVertical: 'top' } : {}]}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        value={formData[key] ?? ''}
        onChangeText={(v) => updateField(key, v)}
        keyboardType={keyboard}
        multiline={multiline}
        autoCapitalize="none"
      />
    );

    switch (qrType) {
      case 'text':    return inp('text', 'Enter text...', 'default', true);
      case 'url':     return inp('url', 'https://example.com');
      case 'phone':   return inp('phone', '+91 9876543210', 'phone-pad');
      case 'email':   return (
        <View style={{ gap: 8 }}>
          {inp('email', 'email@example.com', 'email-address')}
          {inp('subject', 'Subject (optional)')}
          {inp('body', 'Body (optional)', 'default', true)}
        </View>
      );
      case 'wifi':    return (
        <View style={{ gap: 8 }}>
          {inp('ssid', 'Network name (SSID)')}
          {inp('password', 'Password')}
          <View style={[styles.row, { gap: 8 }]}>
            {(['WPA', 'WEP', 'nopass'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, { borderColor: formData.security === s ? QR_COLOR : colors.border, backgroundColor: formData.security === s ? QR_COLOR + '18' : colors.card, borderRadius: colors.radius - 4 }]}
                onPress={() => updateField('security', s)}
              >
                <Text style={[styles.chipText, { color: formData.security === s ? QR_COLOR : colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
      case 'contact': return (
        <View style={{ gap: 8 }}>
          {inp('name', 'Full Name')}
          {inp('phone', 'Phone', 'phone-pad')}
          {inp('email', 'Email', 'email-address')}
          {inp('org', 'Organization')}
          {inp('url', 'Website')}
        </View>
      );
      case 'location': return (
        <View style={{ gap: 8 }}>
          {inp('lat', 'Latitude (e.g. 28.6139)', 'decimal-pad')}
          {inp('lng', 'Longitude (e.g. 77.2090)', 'decimal-pad')}
          {inp('label', 'Label (optional)')}
        </View>
      );
      default: return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 10, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>QR Generator</Text>
        <TouchableOpacity onPress={() => toggleFavorite('qr-generator')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.iconBtn}>
          <MaterialCommunityIcons name={isFav ? 'heart' : 'heart-outline'} size={22} color={isFav ? '#EF4444' : colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding + 24 }]} showsVerticalScrollIndicator={false}>

        {/* Type selector */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>QR Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={styles.typeRow}>
            {QR_TYPES.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.typeChip, { borderColor: qrType === t.id ? QR_COLOR : colors.border, backgroundColor: qrType === t.id ? QR_COLOR + '18' : colors.card, borderRadius: colors.radius - 4 }]}
                onPress={() => { setQrType(t.id); setFormData({}); }}
              >
                <MaterialCommunityIcons name={t.icon as any} size={16} color={qrType === t.id ? QR_COLOR : colors.mutedForeground} />
                <Text style={[styles.typeText, { color: qrType === t.id ? QR_COLOR : colors.mutedForeground, fontFamily: qrType === t.id ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Fields */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Content</Text>
        <View style={{ marginBottom: 16 }}>
          {renderFields()}
        </View>

        {/* QR Preview */}
        {hasValue && (
          <>
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Preview</Text>
            <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={{ backgroundColor: bgColor, padding: 20, borderRadius: 12 }}>
                <QRCode
                  value={qrValue}
                  size={qrSize}
                  color={fgColor}
                  backgroundColor={bgColor}
                  getRef={(ref) => { qrSvgRef.current = ref; }}
                />
              </ViewShot>
            </View>
          </>
        )}

        {/* Color options */}
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', marginTop: 16 }]}>QR Color</Text>
        <View style={[styles.row, { gap: 10, marginBottom: 16 }]}>
          {COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorDot, { backgroundColor: c, borderWidth: fgColor === c ? 3 : 1, borderColor: fgColor === c ? QR_COLOR : colors.border }]}
              onPress={() => setFgColor(c)}
            />
          ))}
        </View>

        {/* Export */}
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: QR_COLOR, borderRadius: colors.radius, opacity: hasValue ? 1 : 0.45 }]}
          onPress={handleExport}
          disabled={!hasValue || exporting}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="download" size={20} color="#fff" />
          <Text style={[styles.exportBtnText, { fontFamily: 'Inter_700Bold' }]}>
            {exporting ? 'Exporting...' : 'Export PNG'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shareBtn, { borderColor: QR_COLOR, borderRadius: colors.radius, opacity: hasValue ? 1 : 0.45 }]}
          onPress={handleShare}
          disabled={!hasValue || exporting}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="share-variant" size={20} color={QR_COLOR} />
          <Text style={[styles.shareBtnText, { color: QR_COLOR, fontFamily: 'Inter_600SemiBold' }]}>Share</Text>
        </TouchableOpacity>

        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={[styles.shareBtn, { borderColor: QR_COLOR, borderRadius: colors.radius, opacity: hasValue ? 1 : 0.45 }]}
            onPress={handleSaveToGallery}
            disabled={!hasValue || exporting}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="image-outline" size={20} color={QR_COLOR} />
            <Text style={[styles.shareBtnText, { color: QR_COLOR, fontFamily: 'Inter_600SemiBold' }]}>Save to Gallery</Text>
          </TouchableOpacity>
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
  scroll: { padding: 16, gap: 0 },
  label: { fontSize: 12, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
  typeRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  typeText: { fontSize: 13 },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  chipText: { fontSize: 12 },
  previewCard: { alignItems: 'center', padding: 20, borderWidth: 1, marginBottom: 8 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 8 },
  exportBtnText: { color: '#fff', fontSize: 15 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1.5, marginTop: 10 },
  shareBtnText: { fontSize: 15 },
});
