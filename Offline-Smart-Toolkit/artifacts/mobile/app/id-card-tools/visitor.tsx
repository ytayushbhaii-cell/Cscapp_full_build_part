// ─── Visitor ID Card Generator ────────────────────────────────────────────────
import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import ViewShot from 'react-native-view-shot';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { IDCardVisitor } from '@/components/id-card/IDCardVisitor';
import { TemplateSelector } from '@/components/id-card/TemplateSelector';
import { PhotoPicker } from '@/components/id-card/PhotoPicker';
import { exportIDCard } from '@/lib/features/id-card/ExportService';
import { saveIDCard, generateCardId } from '@/lib/features/id-card/db';
import { DEFAULT_VISITOR } from '@/lib/features/id-card/types';
import type { VisitorIDData, TemplateId, ExportFormat } from '@/lib/features/id-card/types';

const COLOR = '#10B981';

export default function VisitorIDScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const topPad = Platform.OS === 'web' ? 30 : insets.top;
  const botPad = Platform.OS === 'web' ? 24 : insets.bottom;

  const [data, setData] = useState<VisitorIDData>({ ...DEFAULT_VISITOR });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const shotRef = useRef<ViewShot>(null);

  const set = (field: keyof VisitorIDData, value: string) =>
    setData((d) => ({ ...d, [field]: value }));

  const capture = async (): Promise<string> => (shotRef.current as any).capture();

  const handleSave = async () => {
    if (!data.visitorName.trim()) {
      Alert.alert('Missing Info', 'Please enter the visitor name.');
      return;
    }
    setSaving(true);
    try {
      const uri = await capture();
      await saveIDCard({
        id: generateCardId(),
        type: 'visitor',
        name: `Visitor Pass – ${data.visitorName}`,
        templateId: data.templateId,
        previewUri: uri,
        dataJson: JSON.stringify(data),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      Alert.alert('Saved', 'Visitor pass saved.');
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message ?? 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    setExporting(true);
    try {
      const uri = await capture();
      const fileName = `VisitorPass-${data.visitorName.replace(/\s+/g, '_') || 'pass'}-${Date.now()}`;
      await exportIDCard(uri, format, fileName);
      if (Platform.OS !== 'web') Alert.alert('Exported', `Pass exported as ${format.toUpperCase()}.`);
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message ?? 'Could not export.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[s.header, { paddingTop: topPad + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[s.headerIcon, { backgroundColor: COLOR + '18' }]}>
          <MaterialCommunityIcons name="card-account-details-outline" size={16} color={COLOR} />
        </View>
        <View style={s.headerText}>
          <Text style={[s.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Visitor Pass</Text>
          <Text style={[s.headerSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Events • Offices • CSC Centers</Text>
        </View>
        <TouchableOpacity onPress={() => setData({ ...DEFAULT_VISITOR })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="restore" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: botPad + 24 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Preview */}
        <View style={[s.previewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[s.previewLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Live Preview</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.previewScroll}>
            <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }}>
              <IDCardVisitor data={data} />
            </ViewShot>
          </ScrollView>
        </View>

        {/* Template */}
        <Section title="Design Template" colors={colors}>
          <TemplateSelector selected={data.templateId} onSelect={(id) => set('templateId', id as TemplateId)} />
        </Section>

        {/* Organization */}
        <Section title="Organization" colors={colors}>
          <Field label="Organization Name" value={data.orgName} onChange={(v) => set('orgName', v)} placeholder="Your Company / School Name" color={COLOR} colors={colors} />
          <Text style={[s.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Organization Logo</Text>
          <PhotoPicker uri={data.orgLogoUri} onPicked={(uri) => set('orgLogoUri', uri)} onClear={() => set('orgLogoUri', '')} label="Add Logo" size={55} accent={COLOR} shape="square" />
        </Section>

        {/* Visitor */}
        <Section title="Visitor Details" colors={colors}>
          <View style={s.photoRow}>
            <Text style={[s.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Visitor Photo</Text>
            <PhotoPicker uri={data.photoUri} onPicked={(uri) => set('photoUri', uri)} onClear={() => set('photoUri', '')} label="Add Photo" size={75} accent={COLOR} shape="rounded" />
          </View>
          <Field label="Visitor Name *" value={data.visitorName} onChange={(v) => set('visitorName', v)} placeholder="Full Name" color={COLOR} colors={colors} />
          <Field label="Company / Organization" value={data.company} onChange={(v) => set('company', v)} placeholder="Visitor's Company" color={COLOR} colors={colors} />
          <Field label="Purpose of Visit" value={data.purpose} onChange={(v) => set('purpose', v)} placeholder="e.g. Meeting, Delivery, Interview" color={COLOR} colors={colors} />
          <Field label="Host Name" value={data.hostName} onChange={(v) => set('hostName', v)} placeholder="Person to Meet" color={COLOR} colors={colors} />
          <View style={s.twoCol}>
            <View style={s.half}><Field label="Badge Number" value={data.badgeNumber} onChange={(v) => set('badgeNumber', v)} placeholder="001" color={COLOR} colors={colors} /></View>
            <View style={s.half}><Field label="Date" value={data.date} onChange={(v) => set('date', v)} placeholder="DD/MM/YYYY" color={COLOR} colors={colors} /></View>
          </View>
          <View style={s.twoCol}>
            <View style={s.half}><Field label="Time In" value={data.timeIn} onChange={(v) => set('timeIn', v)} placeholder="e.g. 10:30 AM" color={COLOR} colors={colors} /></View>
            <View style={s.half}><Field label="Time Out" value={data.timeOut} onChange={(v) => set('timeOut', v)} placeholder="e.g. 12:00 PM" color={COLOR} colors={colors} /></View>
          </View>
        </Section>

        {/* Save & Export */}
        <Section title="Save & Export" colors={colors}>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={[s.saveBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}>
            {saving ? <ActivityIndicator size="small" color="#FFF" /> : (
              <>
                <MaterialCommunityIcons name="content-save-outline" size={18} color="#FFF" />
                <Text style={[s.btnText, { fontFamily: 'Inter_600SemiBold' }]}>Save Pass</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={[s.exportLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Export As</Text>
          <View style={s.exportRow}>
            {(['png', 'jpg', 'pdf'] as ExportFormat[]).map((fmt) => (
              <TouchableOpacity key={fmt} onPress={() => handleExport(fmt)} disabled={exporting} style={[s.exportBtn, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius - 2, flex: 1 }]}>
                {exporting ? <ActivityIndicator size="small" color={COLOR} /> : (
                  <>
                    <MaterialCommunityIcons name={fmt === 'pdf' ? 'file-pdf-box' : 'image-outline'} size={16} color={COLOR} />
                    <Text style={[s.exportBtnText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{fmt.toUpperCase()}</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[secS.c, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <Text style={[secS.t, { color: colors.foreground, fontFamily: 'Inter_700Bold', borderBottomColor: colors.border }]}>{title}</Text>
      <View style={secS.b}>{children}</View>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, color, colors, multiline, keyboardType }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  color: string; colors: ReturnType<typeof useColors>; multiline?: boolean; keyboardType?: any;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fS.w}>
      <Text style={[fS.l, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.mutedForeground + '80'} multiline={multiline} keyboardType={keyboardType}
        style={[fS.i, { color: colors.foreground, backgroundColor: colors.background, borderColor: focused ? color : colors.border, borderRadius: colors.radius - 4, fontFamily: 'Inter_400Regular', minHeight: multiline ? 60 : 40 }]}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 10, borderBottomWidth: 1 },
  headerIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 17 },
  headerSub: { fontSize: 11, marginTop: 1 },
  scroll: { padding: 14, gap: 14 },
  previewCard: { borderWidth: 1, padding: 14, alignItems: 'center', marginBottom: 2 },
  previewLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, alignSelf: 'flex-start', marginBottom: 12 },
  previewScroll: { paddingVertical: 4 },
  twoCol: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  photoRow: { gap: 6 },
  fieldLabel: { fontSize: 12, marginBottom: 6 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6, marginBottom: 12 },
  btnText: { color: '#FFF', fontSize: 15 },
  exportLabel: { fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  exportRow: { flexDirection: 'row', gap: 10 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6, borderWidth: 1 },
  exportBtnText: { fontSize: 13 },
});
const secS = StyleSheet.create({ c: { borderWidth: 1, overflow: 'hidden', marginBottom: 2 }, t: { fontSize: 14, padding: 14, paddingBottom: 10, borderBottomWidth: 1 }, b: { padding: 14, gap: 12 } });
const fS = StyleSheet.create({ w: { gap: 5 }, l: { fontSize: 12 }, i: { borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, textAlignVertical: 'top' } });
