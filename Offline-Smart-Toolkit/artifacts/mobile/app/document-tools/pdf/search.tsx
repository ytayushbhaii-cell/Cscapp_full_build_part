import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  TextInput, ScrollView, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useColors } from '@/hooks/useColors';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { getPdfInfo } from '@/lib/features/documents/pdf/pdfService';
import { pdfPageToImages } from '@/lib/features/documents/pdf/pdfToImageService';
import { runOcr } from '@/lib/features/documents/ocr/ocrService';
import type { PdfInfo } from '@/lib/features/documents/types';

const COLOR = '#EF4444';

interface SearchHit {
  page: number;
  excerpt: string;
  matchStart: number;
  matchEnd: number;
}

function extractHits(text: string, query: string, pageNum: number): SearchHit[] {
  const hits: SearchHit[] = [];
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let idx = 0;
  while (idx < lower.length) {
    const pos = lower.indexOf(q, idx);
    if (pos === -1) break;
    const start = Math.max(0, pos - 60);
    const end = Math.min(text.length, pos + q.length + 60);
    const excerpt = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    hits.push({ page: pageNum, excerpt, matchStart: pos - start + (start > 0 ? 1 : 0), matchEnd: pos - start + (start > 0 ? 1 : 0) + q.length });
    idx = pos + q.length;
  }
  return hits;
}

export default function SearchPdfScreen() {
  const colors = useColors();
  const [file, setFile] = useState<DocPickResult | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [ocrPages, setOcrPages] = useState<{ page: number; text: string }[]>([]);
  const [processing, setProcessing] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setPdfInfo(null);
    setQuery('');
    setHits([]);
    setOcrPages([]);
    setProcessing(false);
    setSearched(false);
    setError(null);
  };

  const handleFilePicked = async (picked: DocPickResult) => {
    setFile(picked);
    setPdfInfo(null);
    setHits([]);
    setOcrPages([]);
    setSearched(false);
    setError(null);
    try {
      const info = await getPdfInfo(picked.uri, picked.size);
      setPdfInfo(info);
    } catch {
      // Non-critical
    }
  };

  const runSearch = async () => {
    if (!file || !query.trim()) return;
    setProcessing(true);
    setError(null);
    setHits([]);
    setSearched(false);

    try {
      let pageTexts = ocrPages;

      if (pageTexts.length === 0) {
        // First: convert PDF pages to images, then OCR each page
        const imgs = await pdfPageToImages(file.uri, undefined, 'jpeg', 1.5);

        if (imgs[0]?.isStub) {
          setError('Search PDF requires web preview (OCR + PDF rendering).');
          setProcessing(false);
          return;
        }

        const texts: { page: number; text: string }[] = [];
        for (const img of imgs) {
          const ocr = await runOcr(img.uri, 'eng');
          texts.push({ page: img.pageNumber, text: ocr.text });
        }
        setOcrPages(texts);
        pageTexts = texts;
      }

      // Search across all pages
      const allHits: SearchHit[] = [];
      for (const { page, text } of pageTexts) {
        allHits.push(...extractHits(text, query, page));
      }
      setHits(allHits);
      setSearched(true);
    } catch (e: any) {
      setError(e?.message ?? 'Search failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const searchCached = () => {
    if (ocrPages.length === 0) return;
    const allHits: SearchHit[] = [];
    for (const { page, text } of ocrPages) {
      allHits.push(...extractHits(text, query, page));
    }
    setHits(allHits);
    setSearched(true);
  };

  const copyAllText = async () => {
    const full = ocrPages.map((p) => `--- Page ${p.page} ---\n${p.text}`).join('\n\n');
    await Clipboard.setStringAsync(full);
  };

  const isSearching = processing;
  const hasCachedOcr = ocrPages.length > 0;

  return (
    <ToolScreenLayout
      title="Search PDF"
      subtitle="Find text within PDF using OCR"
      iconName="file-search-outline"
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
        label="Upload PDF to Search"
      />

      {pdfInfo && (
        <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="file-pdf-box" size={15} color={COLOR} />
          <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
            {pdfInfo.pageCount} page{pdfInfo.pageCount !== 1 ? 's' : ''} · OCR will run on all pages
          </Text>
        </View>
      )}

      {Platform.OS !== 'web' && file && (
        <View style={[styles.infoBox, { backgroundColor: '#F59E0B' + '14', borderColor: '#F59E0B' + '40', borderRadius: colors.radius }]}>
          <MaterialCommunityIcons name="information-outline" size={15} color="#F59E0B" />
          <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
            Search PDF uses OCR and requires the web preview.
          </Text>
        </View>
      )}

      {file && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
            Search Query
          </Text>
          <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
              placeholder="Enter text to search…"
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={hasCachedOcr ? searchCached : runSearch}
              returnKeyType="search"
              editable={!processing}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <MaterialCommunityIcons name="close" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          {hasCachedOcr && (
            <Text style={[styles.cachedNote, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              ✓ OCR extracted from {ocrPages.length} pages — search is instant now
            </Text>
          )}

          <TouchableOpacity
            style={[styles.btn, {
              backgroundColor: !query.trim() || processing || Platform.OS !== 'web' ? colors.muted : COLOR,
              borderRadius: colors.radius - 2,
            }]}
            onPress={hasCachedOcr ? searchCached : runSearch}
            disabled={!query.trim() || processing || Platform.OS !== 'web'}
            activeOpacity={0.85}
          >
            {processing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialCommunityIcons name="magnify" size={18} color="#fff" />
            )}
            <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {processing
                ? `Extracting text… (${ocrPages.length}/${pdfInfo?.pageCount ?? '?'} pages)`
                : hasCachedOcr
                  ? 'Search'
                  : 'Extract Text & Search'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      {searched && (
        <View style={styles.section}>
          <View style={styles.resultsHeader}>
            <View style={[styles.badge, {
              backgroundColor: hits.length > 0 ? '#22C55E' + '18' : '#F59E0B' + '18',
              borderRadius: 20,
            }]}>
              <MaterialCommunityIcons
                name={hits.length > 0 ? 'check-circle' : 'alert-circle-outline'}
                size={14}
                color={hits.length > 0 ? '#22C55E' : '#F59E0B'}
              />
              <Text style={[styles.badgeText, {
                color: hits.length > 0 ? '#22C55E' : '#F59E0B',
                fontFamily: 'Inter_600SemiBold',
              }]}>
                {hits.length > 0 ? `${hits.length} match${hits.length !== 1 ? 'es' : ''} found` : 'No matches found'}
              </Text>
            </View>

            {hasCachedOcr && (
              <TouchableOpacity
                style={[styles.copyBtn, { borderColor: colors.border, borderRadius: colors.radius - 6 }]}
                onPress={copyAllText}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="content-copy" size={14} color={colors.foreground} />
                <Text style={[styles.copyBtnText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                  Copy All Text
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {hits.map((hit, i) => (
            <View key={i} style={[styles.hitCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 2 }]}>
              <View style={styles.hitHeader}>
                <View style={[styles.pageBadge, { backgroundColor: COLOR + '18', borderRadius: 6 }]}>
                  <Text style={[styles.pageBadgeText, { color: COLOR, fontFamily: 'Inter_700Bold' }]}>P{hit.page}</Text>
                </View>
                <Text style={[styles.hitPage, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  Page {hit.page}
                </Text>
              </View>
              <Text style={[styles.hitExcerpt, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                {hit.excerpt}
              </Text>
            </View>
          ))}
        </View>
      )}

      {!file && (
        <View style={[styles.howCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.howTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            How it works
          </Text>
          {[
            { icon: 'file-pdf-box', text: 'Upload any PDF document' },
            { icon: 'image-outline', text: 'Pages are rendered as images' },
            { icon: 'ocr', text: 'Tesseract OCR extracts text from each page' },
            { icon: 'magnify', text: 'Search results show page number and context' },
            { icon: 'content-copy', text: 'Copy all extracted text for external use' },
          ].map((step) => (
            <View key={step.text} style={styles.howRow}>
              <MaterialCommunityIcons name={step.icon as any} size={16} color={COLOR} />
              <Text style={[styles.howText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                {step.text}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  label: { fontSize: 13 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  cachedNote: { fontSize: 11 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { fontSize: 12 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  copyBtnText: { fontSize: 12 },
  hitCard: { padding: 12, borderWidth: 1, gap: 6 },
  hitHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageBadge: { paddingHorizontal: 8, paddingVertical: 3 },
  pageBadgeText: { fontSize: 11 },
  hitPage: { fontSize: 12 },
  hitExcerpt: { fontSize: 12, lineHeight: 18 },
  howCard: { borderWidth: 1, padding: 16, gap: 12 },
  howTitle: { fontSize: 14, marginBottom: 2 },
  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  howText: { fontSize: 12, flex: 1, lineHeight: 18 },
});
