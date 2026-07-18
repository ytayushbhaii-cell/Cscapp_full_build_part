import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, Image, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { getPdfInfo } from '@/lib/features/documents/pdf/pdfService';
import { pdfPageToImages } from '@/lib/features/documents/pdf/pdfToImageService';
import type { PdfInfo, PdfToImageResult } from '@/lib/features/documents/types';

const COLOR = '#EF4444';
const FORMAT_OPTIONS: { label: string; value: 'jpeg' | 'png' }[] = [
  { label: 'JPEG', value: 'jpeg' },
  { label: 'PNG', value: 'png' },
];
const SCALE_OPTIONS: { label: string; value: number }[] = [
  { label: '1× (72 DPI)', value: 1 },
  { label: '2× (144 DPI)', value: 2 },
  { label: '3× (216 DPI)', value: 3 },
];

export default function PdfToImageScreen() {
  const colors = useColors();
  const [file, setFile] = useState<DocPickResult | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [scale, setScale] = useState<number>(2);
  const [results, setResults] = useState<PdfToImageResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setPdfInfo(null);
    setResults([]);
    setError(null);
  };

  const handleFilePicked = async (picked: DocPickResult) => {
    setFile(picked);
    setPdfInfo(null);
    setResults([]);
    setError(null);
    try {
      const info = await getPdfInfo(picked.uri, picked.size);
      setPdfInfo(info);
    } catch {
      // Non-critical
    }
  };

  const process = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setResults([]);
    try {
      const imgs = await pdfPageToImages(file.uri, undefined, format, scale);
      if (imgs[0]?.isStub) {
        setError(imgs[0].stubMessage ?? 'PDF to Image requires web preview.');
      } else {
        setResults(imgs);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Conversion failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadImage = (img: PdfToImageResult) => {
    if (Platform.OS === 'web') {
      const a = document.createElement('a');
      a.href = img.uri;
      a.download = `page-${img.pageNumber}.${format}`;
      a.click();
    }
  };

  const downloadAll = () => {
    results.forEach((img) => {
      setTimeout(() => downloadImage(img), (img.pageNumber - 1) * 120);
    });
  };

  return (
    <ToolScreenLayout
      title="PDF to Image"
      subtitle="Convert PDF pages to PNG / JPEG"
      iconName="file-image-outline"
      color={COLOR}
      onReset={reset}
    >
      {error && <StatusBanner type="error" message={error} />}

      <DocUploadWidget
        file={file}
        onPicked={handleFilePicked}
        onError={setError}
        color={COLOR}
        accept="pdf"
        label="Upload PDF"
      />

      {pdfInfo && (
        <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="file-pdf-box" size={15} color={COLOR} />
          <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
            {pdfInfo.pageCount} page{pdfInfo.pageCount !== 1 ? 's' : ''} detected
            {pdfInfo.encrypted ? ' · 🔒 Encrypted' : ''}
          </Text>
        </View>
      )}

      {file && results.length === 0 && (
        <>
          {/* Format */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              Output Format
            </Text>
            <View style={styles.row}>
              {FORMAT_OPTIONS.map((opt) => {
                const active = format === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setFormat(opt.value)}
                    style={[styles.chip, {
                      borderColor: active ? COLOR : colors.border,
                      backgroundColor: active ? COLOR + '14' : colors.card,
                      borderRadius: colors.radius - 4,
                    }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipLabel, {
                      color: active ? COLOR : colors.foreground,
                      fontFamily: active ? 'Inter_700Bold' : 'Inter_400Regular',
                    }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Scale */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              Resolution
            </Text>
            <View style={styles.row}>
              {SCALE_OPTIONS.map((opt) => {
                const active = scale === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setScale(opt.value)}
                    style={[styles.chip, {
                      borderColor: active ? COLOR : colors.border,
                      backgroundColor: active ? COLOR + '14' : colors.card,
                      borderRadius: colors.radius - 4,
                    }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipLabel, {
                      color: active ? COLOR : colors.foreground,
                      fontFamily: active ? 'Inter_700Bold' : 'Inter_400Regular',
                    }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {Platform.OS !== 'web' && (
            <View style={[styles.archBox, { backgroundColor: '#F59E0B' + '14', borderColor: '#F59E0B' + '40', borderRadius: colors.radius }]}>
              <MaterialCommunityIcons name="information-outline" size={15} color="#F59E0B" />
              <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                PDF to Image conversion is available on the web preview. On native, use a PDF viewer app.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, {
              backgroundColor: Platform.OS !== 'web' ? colors.muted : COLOR,
              borderRadius: colors.radius - 2,
            }]}
            onPress={process}
            disabled={processing || Platform.OS !== 'web'}
            activeOpacity={0.85}
          >
            {processing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialCommunityIcons name="file-image-outline" size={18} color="#fff" />
            )}
            <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {processing ? 'Converting…' : 'Convert to Images'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {results.length > 0 && (
        <View style={styles.section}>
          {/* Success summary */}
          <View style={[styles.resultHeader, { backgroundColor: '#22C55E' + '14', borderColor: '#22C55E' + '40', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="check-circle" size={16} color="#22C55E" />
            <Text style={[styles.resultHeaderText, { color: '#22C55E', fontFamily: 'Inter_600SemiBold' }]}>
              {results.length} page{results.length !== 1 ? 's' : ''} converted to {format.toUpperCase()}
            </Text>
          </View>

          {/* Download All */}
          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
              onPress={downloadAll}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="download-multiple" size={18} color="#fff" />
              <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
                Download All ({results.length})
              </Text>
            </TouchableOpacity>
          )}

          {/* Image previews */}
          {results.map((img) => (
            <View key={img.pageNumber} style={[styles.imgCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Image
                source={{ uri: img.uri }}
                style={[styles.imgPreview, { borderRadius: colors.radius - 4 }]}
                resizeMode="contain"
              />
              <View style={styles.imgFooter}>
                <View style={styles.imgMeta}>
                  <MaterialCommunityIcons name="file-image" size={14} color={COLOR} />
                  <Text style={[styles.imgLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                    Page {img.pageNumber}
                  </Text>
                  <Text style={[styles.imgDims, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                    {img.width} × {img.height}
                  </Text>
                </View>
                {Platform.OS === 'web' && (
                  <TouchableOpacity
                    style={[styles.dlBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 6 }]}
                    onPress={() => downloadImage(img)}
                    activeOpacity={0.85}
                  >
                    <MaterialCommunityIcons name="download" size={14} color="#fff" />
                    <Text style={[styles.dlBtnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
                      Download
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: colors.border, borderRadius: colors.radius - 2 }]}
            onPress={reset}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="refresh" size={16} color={colors.foreground} />
            <Text style={[styles.resetBtnText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              Convert Another PDF
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  label: { fontSize: 13 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, paddingVertical: 8, paddingHorizontal: 14 },
  chipLabel: { fontSize: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  archBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderWidth: 1 },
  resultHeaderText: { fontSize: 13 },
  imgCard: { borderWidth: 1, overflow: 'hidden' },
  imgPreview: { width: '100%', height: 260, backgroundColor: '#00000008' },
  imgFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, gap: 8 },
  imgMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  imgLabel: { fontSize: 13 },
  imgDims: { fontSize: 11 },
  dlBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7, paddingHorizontal: 12 },
  dlBtnText: { fontSize: 12 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderWidth: 1 },
  resetBtnText: { fontSize: 13 },
});
