import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Platform, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { runOcr } from '@/lib/features/documents/ocr/ocrService';
import type { OcrResult } from '@/lib/features/documents/types';
import { exportFile } from '@/lib/photoTools/exportUtils';

const COLOR = '#EF4444';

const LANGUAGES = [
  { label: 'English', value: 'eng' },
  { label: 'Hindi', value: 'hin' },
  { label: 'English+Hindi', value: 'eng+hin' },
  { label: 'Gujarati', value: 'guj' },
  { label: 'Tamil', value: 'tam' },
];

export default function OcrScreen() {
  const colors = useColors();
  const [file, setFile] = useState<DocPickResult | null>(null);
  const [language, setLanguage] = useState('eng');
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setFile(null);
    setOcrResult(null);
    setError(null);
    setCopied(false);
  };

  const process = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setOcrResult(null);
    try {
      const result = await runOcr(file.uri, language);
      setOcrResult(result);
    } catch (e: any) {
      setError(e?.message ?? 'OCR failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const copyText = async () => {
    if (!ocrResult?.text) return;
    try {
      await Clipboard.setStringAsync(ocrResult.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard.');
    }
  };

  return (
    <ToolScreenLayout title="Offline OCR" subtitle="Extract text from images" iconName="ocr" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      <DocUploadWidget file={file} onPicked={setFile} onError={setError} color={COLOR} accept="image" label="Upload Image" />

      {file && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Language</Text>
          <View style={styles.row}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.value}
                style={[styles.chip, { borderColor: language === lang.value ? COLOR : colors.border, backgroundColor: language === lang.value ? COLOR + '18' : 'transparent', borderRadius: colors.radius - 4 }]}
                onPress={() => setLanguage(lang.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipLabel, { color: language === lang.value ? COLOR : colors.foreground, fontFamily: language === lang.value ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {file && !ocrResult && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
          onPress={process}
          disabled={processing}
          activeOpacity={0.85}
        >
          {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="ocr" size={18} color="#fff" />}
          <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
            {processing ? 'Extracting Text…' : 'Run OCR'}
          </Text>
        </TouchableOpacity>
      )}

      {ocrResult && (
        <View style={styles.section}>
          {/* Engine + confidence badges */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: ocrResult.engine === 'tesseract' ? '#22C55E' + '20' : '#F59E0B' + '20', borderRadius: 20 }]}>
              <MaterialCommunityIcons name="cog-outline" size={12} color={ocrResult.engine === 'tesseract' ? '#22C55E' : '#F59E0B'} />
              <Text style={[styles.badgeText, { color: ocrResult.engine === 'tesseract' ? '#22C55E' : '#F59E0B', fontFamily: 'Inter_600SemiBold' }]}>
                {ocrResult.engine === 'tesseract' ? 'Tesseract' : 'Architecture Stub'}
              </Text>
            </View>
            {ocrResult.confidence > 0 && (
              <View style={[styles.badge, { backgroundColor: COLOR + '18', borderRadius: 20 }]}>
                <Text style={[styles.badgeText, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>
                  {Math.round(ocrResult.confidence * 100)}% confidence
                </Text>
              </View>
            )}
          </View>

          {/* Result text box */}
          <View style={[styles.textBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator>
              <Text selectable style={[styles.ocrText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                {ocrResult.text || '(No text detected)'}
              </Text>
            </ScrollView>
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: copied ? '#22C55E' : COLOR, borderRadius: colors.radius - 2 }]}
            onPress={copyText}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name={copied ? 'check' : 'content-copy'} size={18} color="#fff" />
            <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.card, borderColor: COLOR, borderWidth: 1, borderRadius: colors.radius - 2 }]}
            onPress={async () => {
              if (!ocrResult?.text) return;
              try {
                const text = ocrResult.text;
                const fileName = `ocr-result-${Date.now()}.txt`;
                if (Platform.OS === 'web') {
                  const blob = new Blob([text], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(url), 5000);
                } else {
                  const FileSystem = await import('expo-file-system');
                  const dir = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory;
                  const fileUri = `${dir}${fileName}`;
                  await (FileSystem as any).writeAsStringAsync(fileUri, text, { encoding: 'utf8' as any });
                  await exportFile(fileUri, fileName);
                }
              } catch (e: any) {
                Alert.alert('Export failed', e?.message ?? 'Unknown error');
              }
            }}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="file-export-outline" size={18} color={COLOR} />
            <Text style={[styles.btnText, { color: COLOR, fontFamily: 'Inter_600SemiBold' }]}>
              Download as Text File
            </Text>
          </TouchableOpacity>

          <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
            <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              On web: install tesseract.js for full OCR. On native: react-native-tesseract-ocr required.
            </Text>
          </View>
        </View>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  label: { fontSize: 13 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  chipLabel: { fontSize: 12 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11 },
  textBox: { borderWidth: 1, padding: 12 },
  ocrText: { fontSize: 13, lineHeight: 20 },
});
