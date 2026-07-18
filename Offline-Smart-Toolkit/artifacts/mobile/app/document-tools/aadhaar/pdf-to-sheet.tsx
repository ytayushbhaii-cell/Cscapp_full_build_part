import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { DocResultActions } from '@/components/document-tools/DocResultActions';
import { PrintLayoutPicker } from '@/components/document-tools/PrintLayoutPicker';
import type { PrintLayout } from '@/lib/features/documents/types';
import { writePdfBytes } from '@/lib/features/documents/printUtils';
import { getPdfInfo } from '@/lib/features/documents/pdf/pdfService';
import { PDFDocument } from 'pdf-lib';
import type { PdfInfo } from '@/lib/features/documents/types';

const COLOR = '#F97316';

const MM_TO_PT = 72 / 25.4;
const CARD_W_MM = 85.6;
const CARD_H_MM = 53.98;
const CARD_W_PT = CARD_W_MM * MM_TO_PT;
const CARD_H_PT = CARD_H_MM * MM_TO_PT;

const PAPER_PT: Record<string, { w: number; h: number }> = {
  a4:     { w: 595.28, h: 841.89 },
  letter: { w: 612,    h: 792 },
  legal:  { w: 612,    h: 1008 },
};

const defaultLayout: PrintLayout = {
  paperSize: 'a4',
  copies: 4,
  autoMargin: true,
  autoCenter: true,
  landscape: false,
};

async function fetchBytes(uri: string): Promise<Uint8Array> {
  if (uri.startsWith('data:')) {
    const base64 = uri.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  const res = await fetch(uri);
  return new Uint8Array(await res.arrayBuffer());
}

async function buildPdfToSheet(
  pdfUri: string,
  copies: number,
  paperSize: string,
): Promise<string> {
  const srcBytes = await fetchBytes(pdfUri);
  const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
  const pageCount = srcDoc.getPageCount();

  const paper = PAPER_PT[paperSize] ?? PAPER_PT.a4;
  const margin = 10 * MM_TO_PT;
  const gap = 4 * MM_TO_PT;

  const cols = Math.max(1, Math.floor((paper.w - margin * 2 + gap) / (CARD_W_PT + gap)));
  const rows = Math.max(1, Math.floor((paper.h - margin * 2 + gap) / (CARD_H_PT + gap)));
  const perPage = cols * rows;

  const outDoc = await PDFDocument.create();

  // For each source page, copy it into card-sized slots
  for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
    // How many output pages needed for `copies` of this source page
    const totalSlots = copies;
    const outputPages = Math.ceil(totalSlots / perPage);
    let remaining = totalSlots;

    for (let p = 0; p < outputPages; p++) {
      const outPage = outDoc.addPage([paper.w, paper.h]);
      const slotsOnPage = Math.min(perPage, remaining);

      for (let i = 0; i < slotsOnPage; i++) {
        const [embeddedPage] = await outDoc.copyPages(srcDoc, [pageIdx]);
        const srcW = embeddedPage.getWidth();
        const srcH = embeddedPage.getHeight();

        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = margin + col * (CARD_W_PT + gap);
        const y = paper.h - margin - CARD_H_PT - row * (CARD_H_PT + gap);

        // Scale source page to fit card dimensions
        const scaleX = CARD_W_PT / srcW;
        const scaleY = CARD_H_PT / srcH;
        const scale = Math.min(scaleX, scaleY);

        const drawW = srcW * scale;
        const drawH = srcH * scale;
        const offsetX = x + (CARD_W_PT - drawW) / 2;
        const offsetY = y + (CARD_H_PT - drawH) / 2;

        // Use a single-page doc to embed the page as XObject
        const singleDoc = await PDFDocument.create();
        const [copiedPage] = await singleDoc.copyPages(srcDoc, [pageIdx]);
        singleDoc.addPage(copiedPage);
        const singleBytes = await singleDoc.save();
        const singleLoaded = await PDFDocument.load(singleBytes);
        const [embedded] = await outDoc.embedPdf(singleLoaded, [0]);

        outPage.drawPage(embedded, {
          x: offsetX,
          y: offsetY,
          width: drawW,
          height: drawH,
        });
      }

      remaining -= slotsOnPage;
    }
  }

  const outBytes = await outDoc.save();
  return writePdfBytes(outBytes, `aadhaar-pdf-sheet-${Date.now()}.pdf`);
}

export default function PdfToSheetScreen() {
  const colors = useColors();
  const { isDark } = useTheme();

  const [file, setFile] = useState<DocPickResult | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [layout, setLayout] = useState<PrintLayout>(defaultLayout);
  const [resultUri, setResultUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const reset = () => {
    setFile(null);
    setPdfInfo(null);
    setResultUri(null);
    setError(null);
    setProcessing(false);
    setInfoLoading(false);
  };

  const handleFilePicked = async (picked: DocPickResult) => {
    setFile(picked);
    setResultUri(null);
    setPdfInfo(null);
    setError(null);
    setInfoLoading(true);
    try {
      const info = await getPdfInfo(picked.uri, picked.size);
      setPdfInfo(info);
    } catch {
      // Non-fatal — info is optional
    } finally {
      setInfoLoading(false);
    }
  };

  const process = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const uri = await buildPdfToSheet(file.uri, layout.copies, layout.paperSize);
      setResultUri(uri);
    } catch (e: any) {
      setError(e?.message ?? 'Processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout
      title="PDF to Aadhaar Sheet"
      subtitle="Extract from PDF and create print sheet"
      iconName="file-pdf-box"
      color={COLOR}
      onReset={reset}
    >
      {error && <StatusBanner type="error" message={error} />}

      <View style={styles.section}>
        <DocUploadWidget
          file={file}
          onPicked={handleFilePicked}
          onError={setError}
          color={COLOR}
          accept="pdf"
          label="Upload PDF"
        />
      </View>

      {infoLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={COLOR} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Reading PDF info…
          </Text>
        </View>
      )}

      {pdfInfo && (
        <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.resultRow}>
            <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Pages</Text>
            <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              {pdfInfo.pageCount}
            </Text>
          </View>
          {pdfInfo.title ? (
            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Title</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                {pdfInfo.title}
              </Text>
            </View>
          ) : null}
          {pdfInfo.fileSizeBytes > 0 && (
            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>File Size</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                {(pdfInfo.fileSizeBytes / 1024).toFixed(1)} KB
              </Text>
            </View>
          )}
          {pdfInfo.encrypted && (
            <View style={styles.resultRow}>
              <MaterialCommunityIcons name="lock" size={14} color="#EF4444" />
              <Text style={[styles.resultVal, { color: '#EF4444', fontFamily: 'Inter_400Regular' }]}>
                Encrypted PDF — output may be limited
              </Text>
            </View>
          )}
        </View>
      )}

      <PrintLayoutPicker layout={layout} onChange={setLayout} color={COLOR} showCopies />

      <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
        <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
        <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
          PDF pages will be embedded in a new print sheet document. Each source page is scaled to fit 85.6×53.98mm card slots, tiled on the selected paper size.
        </Text>
      </View>

      {file && !resultUri && (
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}
            onPress={process}
            disabled={processing || !file}
            activeOpacity={0.85}
          >
            {processing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialCommunityIcons name="printer" size={18} color="#fff" />
            )}
            <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {processing ? 'Processing…' : 'Generate PDF'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {resultUri && (
        <View style={styles.section}>
          <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.resultRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#22C55E" />
              <Text style={[styles.resultVal, { color: '#22C55E', fontFamily: 'Inter_600SemiBold' }]}>
                Print sheet generated successfully
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Copies</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                {layout.copies} per page
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultKey, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Paper</Text>
              <Text style={[styles.resultVal, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                {layout.paperSize.toUpperCase()}
              </Text>
            </View>
          </View>
          <DocResultActions
            uri={resultUri}
            fileName="aadhaar-pdf-sheet.pdf"
            color={COLOR}
            onReset={reset}
            mimeType="application/pdf"
          />
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
  resultBox: { padding: 14, borderWidth: 1, gap: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultKey: { fontSize: 12, width: 110 },
  resultVal: { fontSize: 12, flex: 1 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13 },
});
