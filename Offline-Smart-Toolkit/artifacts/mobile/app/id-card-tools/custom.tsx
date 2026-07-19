// ─── Custom ID Card Generator ─────────────────────────────────────────────────
import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import ViewShot from 'react-native-view-shot';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { IDCardCustom } from '@/components/id-card/IDCardCustom';
import { TemplateSelector } from '@/components/id-card/TemplateSelector';
import { PhotoPicker } from '@/components/id-card/PhotoPicker';
import { exportIDCard } from '@/lib/features/id-card/ExportService';
import { saveIDCard, generateCardId } from '@/lib/features/id-card/db';
import { DEFAULT_CUSTOM } from '@/lib/features/id-card/types';
import type { CustomIDData, CustomIDField, TemplateId, ExportFormat } from '@/lib/features/id-card/types';

const COLOR = '#8B5CF6';

const PRESET_COLORS = ['#1D4ED8', '#059669', '#DC2626', '#D97706', '#8B5CF6', '#0F172A', '#EC4899', '#06B6D4'];
const TEXT_COLORS = ['#0F172A', '#1D4ED8', '#059669', '#DC2626', '#FFFFFF', '#78350F'];

export default function CustomIDScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const topPad = Platform.OS === 'web' ? 30 : insets.top;
  const botPad = Platform.OS === 'web' ? 24 : insets.bottom;

  const [data, setData] = useState<CustomIDData>({ ...DEFAULT_CUSTOM, fields: DEFAULT_CUSTOM.fields.map(f => ({ ...f })) });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const shotRef = useRef<ViewShot>(null);

  const set = (key: keyof CustomIDData, value: any) =>
    setData((d) => ({ ...d, [key]: value }));

  const updateField = (id: string, key: keyof CustomIDField, value: any) =>
    setData((d) => ({ ...d, fields: d.fields.map((f) => f.id === id ? { ...f, [key]: value } : f) }));

  const addField = () => {
    const newField: CustomIDField = {
      id: Date.now().toString(),
      label: `Field ${data.fields.length + 1}`,
      value: '',
      x: 0, y: 0,
      fontSize: 13,
      bold: false,
      color: data.textColor,
    };
    setData((d) => ({ ...d, fields: [...d.fields, newField] }));
  };

  const removeField = (id: string) =>
    setData((d) => ({ ...d, fields: d.fields.filter((f) => f.id !== id) }));

  const capture = async (): Promise<string> => (shotRef.current as any).capture();

  const handleSave = async () => {
    setSaving(true);
    try {
      const uri = await capture();
      await saveIDCard({
        id: generateCardId(),
        type: 'custom',
        name: `Custom ID – ${data.orgName || 'My Card'}`,
        templateId: data.templateId,
        previewUri: uri,
        dataJson: JSON.stringify(data),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      Alert.alert('Saved', 'Custom ID card saved.');
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message ?? 'Could not save card.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    setExporting(true);
    try {
      const uri = await capture();
      const fileName = `CustomID-${data.orgName?.replace(/\s+/g, '_') || 'card'}-${Date.now()}`;
      await exportIDCard(uri, format, fileName);
      if (Platform.OS !== 'web') Alert.alert('Exported', `Exported as ${format.toUpperCase()}.`);
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
          <MaterialCommunityIcons name="pencil-ruler" size={16} color={COLOR} />
        </View>
        <View style={s.headerText}>
          <Text style={[s.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Custom ID Card</Text>
          <Text style={[s.headerSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Design your own card</Text>
        </View>
        <TouchableOpacity onPress={() => setData({ ...DEFAULT_CUSTOM, fields: DEFAULT_CUSTOM.fields.map(f => ({ ...f })) })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="restore" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: botPad + 24 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Preview */}
        <View style={[s.previewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[s.previewLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Live Preview</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.previewScroll}>
            <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }}>
              <IDCardCustom data={data} />
            </ViewShot>
          </ScrollView>
        </View>

        {/* Template */}
        <Section title="Design Template" colors={colors}>
          <TemplateSelector selected={data.templateId} onSelect={(id) => set('templateId', id as TemplateId)} />
        </Section>

        {/* Identity */}
        <Section title="Identity & Logo" colors={colors}>
          <FldInput label="Organization / Card Name" value={data.orgName} onChange={(v) => set('orgName', v)} placeholder="e.g. My Company" color={COLOR} colors={colors} />
          <Text style={[s.fLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Logo</Text>
          <PhotoPicker uri={data.logoUri} onPicked={(uri) => set('logoUri', uri)} onClear={() => set('logoUri', '')} label="Add Logo" size={55} accent={COLOR} shape="square" />
          <Text style={[s.fLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Photo</Text>
          <PhotoPicker uri={data.photoUri} onPicked={(uri) => set('photoUri', uri)} onClear={() => set('photoUri', '')} label="Add Photo" size={70} accent={COLOR} shape="rounded" />
        </Section>

        {/* Colors */}
        <Section title="Colors" colors={colors}>
          <ColorRow label="Accent Color" colors={PRESET_COLORS} selected={data.accentColor} onSelect={(c) => set('accentColor', c)} textColors={colors} />
          <ColorRow label="Background" colors={['#FFFFFF', '#F8FAFC', '#0F172A', '#EFF6FF', '#F0FDF4', '#FFFBEB', '#FFF1F2', '#F5F3FF']} selected={data.backgroundColor} onSelect={(c) => set('backgroundColor', c)} textColors={colors} />
          <ColorRow label="Text Color" colors={TEXT_COLORS} selected={data.textColor} onSelect={(c) => set('textColor', c)} textColors={colors} />
        </Section>

        {/* Custom Fields */}
        <Section title="Card Fields" colors={colors}>
          {data.fields.map((field, i) => (
            <View key={field.id} style={[s.fieldCard, { borderColor: colors.border, backgroundColor: colors.background, borderRadius: colors.radius - 4 }]}>
              <View style={s.fieldCardHeader}>
                <Text style={[s.fieldCardTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Field {i + 1}</Text>
                {data.fields.length > 1 && (
                  <TouchableOpacity onPress={() => removeField(field.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="close" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={s.twoCol}>
                <View style={s.half}>
                  <FldInput label="Label" value={field.label} onChange={(v) => updateField(field.id, 'label', v)} placeholder="e.g. Name" color={COLOR} colors={colors} />
                </View>
                <View style={s.half}>
                  <FldInput label="Value" value={field.value} onChange={(v) => updateField(field.id, 'value', v)} placeholder="Enter value" color={COLOR} colors={colors} />
                </View>
              </View>
              <View style={s.fieldOptions}>
                <TouchableOpacity
                  onPress={() => updateField(field.id, 'bold', !field.bold)}
                  style={[s.boldToggle, { borderColor: field.bold ? COLOR : colors.border, backgroundColor: field.bold ? COLOR + '14' : colors.card, borderRadius: colors.radius - 6 }]}
                >
                  <MaterialCommunityIcons name="format-bold" size={16} color={field.bold ? COLOR : colors.mutedForeground} />
                  <Text style={[s.boldText, { color: field.bold ? COLOR : colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Bold</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity
            onPress={addField}
            style={[s.addFieldBtn, { borderColor: COLOR + '40', borderRadius: colors.radius - 4 }]}
          >
            <MaterialCommunityIcons name="plus" size={16} color={COLOR} />
            <Text style={[s.addFieldText, { color: COLOR, fontFamily: 'Inter_500Medium' }]}>Add Field</Text>
          </TouchableOpacity>
        </Section>

        {/* QR Code */}
        <Section title="QR Code" colors={colors}>
          <View style={s.switchRow}>
            <Text style={[s.switchLabel, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Include QR Code</Text>
            <Switch value={data.showQR} onValueChange={(v) => set('showQR', v)} trackColor={{ false: colors.border, true: COLOR + '80' }} thumbColor={data.showQR ? COLOR : colors.mutedForeground} />
          </View>
          {data.showQR && (
            <FldInput label="QR Code Data" value={data.qrValue} onChange={(v) => set('qrValue', v)} placeholder="Text, URL, or any data" color={COLOR} colors={colors} />
          )}
        </Section>

        {/* Save & Export */}
        <Section title="Save & Export" colors={colors}>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={[s.saveBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}>
            {saving ? <ActivityIndicator size="small" color="#FFF" /> : (
              <>
                <MaterialCommunityIcons name="content-save-outline" size={18} color="#FFF" />
                <Text style={[s.btnText, { fontFamily: 'Inter_600SemiBold' }]}>Save Card</Text>
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
    <View style={[scS.c, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <Text style={[scS.t, { color: colors.foreground, fontFamily: 'Inter_700Bold', borderBottomColor: colors.border }]}>{title}</Text>
      <View style={scS.b}>{children}</View>
    </View>
  );
}

function FldInput({ label, value, onChange, placeholder, color, colors, multiline }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  color: string; colors: ReturnType<typeof useColors>; multiline?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fiS.w}>
      <Text style={[fiS.l, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.mutedForeground + '80'} multiline={multiline}
        style={[fiS.i, { color: colors.foreground, backgroundColor: colors.background, borderColor: focused ? color : colors.border, borderRadius: colors.radius - 4, fontFamily: 'Inter_400Regular' }]}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
    </View>
  );
}

function ColorRow({ label, colors: colorList, selected, onSelect, textColors }: {
  label: string; colors: string[]; selected: string; onSelect: (c: string) => void; textColors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={crS.wrapper}>
      <Text style={[crS.label, { color: textColors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={crS.row}>
        {colorList.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => onSelect(c)}
            style={[crS.swatch, {
              backgroundColor: c,
              borderColor: selected === c ? textColors.foreground : textColors.border,
              borderWidth: selected === c ? 2.5 : 1,
            }]}
          >
            {selected === c && <MaterialCommunityIcons name="check" size={14} color={c === '#FFFFFF' || c === '#F8FAFC' || c === '#EFF6FF' || c === '#FFFBEB' ? '#0F172A' : '#FFFFFF'} />}
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  previewCard: { borderWidth: 1, padding: 14, alignItems: 'center' },
  previewLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, alignSelf: 'flex-start', marginBottom: 12 },
  previewScroll: { paddingVertical: 4 },
  fLabel: { fontSize: 12, marginBottom: 6 },
  twoCol: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  fieldCard: { borderWidth: 1, padding: 10, gap: 8, marginBottom: 4 },
  fieldCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldCardTitle: { fontSize: 12 },
  fieldOptions: { flexDirection: 'row', gap: 8 },
  boldToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  boldText: { fontSize: 12 },
  addFieldBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1.5, borderStyle: 'dashed' },
  addFieldText: { fontSize: 13 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontSize: 14 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6, marginBottom: 12 },
  btnText: { color: '#FFF', fontSize: 15 },
  exportLabel: { fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  exportRow: { flexDirection: 'row', gap: 10 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6, borderWidth: 1 },
  exportBtnText: { fontSize: 13 },
});
const scS = StyleSheet.create({ c: { borderWidth: 1, overflow: 'hidden', marginBottom: 2 }, t: { fontSize: 14, padding: 14, paddingBottom: 10, borderBottomWidth: 1 }, b: { padding: 14, gap: 12 } });
const fiS = StyleSheet.create({ w: { gap: 5 }, l: { fontSize: 12 }, i: { borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 } });
const crS = StyleSheet.create({ wrapper: { gap: 6 }, label: { fontSize: 12 }, row: { gap: 8, paddingBottom: 2 }, swatch: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' } });
