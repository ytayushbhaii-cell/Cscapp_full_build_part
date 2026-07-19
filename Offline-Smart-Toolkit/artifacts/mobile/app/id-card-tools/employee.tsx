// ─── Employee ID Card Generator ───────────────────────────────────────────────
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
import { IDCardEmployee } from '@/components/id-card/IDCardEmployee';
import { TemplateSelector } from '@/components/id-card/TemplateSelector';
import { PhotoPicker } from '@/components/id-card/PhotoPicker';
import { exportIDCard } from '@/lib/features/id-card/ExportService';
import { saveIDCard, generateCardId } from '@/lib/features/id-card/db';
import { DEFAULT_EMPLOYEE } from '@/lib/features/id-card/types';
import type { EmployeeIDData, TemplateId, ExportFormat, BloodGroup } from '@/lib/features/id-card/types';

const COLOR = '#1D4ED8';
const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function EmployeeIDScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const topPad = Platform.OS === 'web' ? 30 : insets.top;
  const botPad = Platform.OS === 'web' ? 24 : insets.bottom;

  const [data, setData] = useState<EmployeeIDData>({ ...DEFAULT_EMPLOYEE });
  const [showBack, setShowBack] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const frontShotRef = useRef<ViewShot>(null);
  const backShotRef = useRef<ViewShot>(null);

  const set = (field: keyof EmployeeIDData, value: string) =>
    setData((d) => ({ ...d, [field]: value }));

  const capture = async (): Promise<string> => {
    const ref = showBack ? backShotRef : frontShotRef;
    return (ref.current as any).capture();
  };

  const handleSave = async () => {
    if (!data.employeeName.trim()) {
      Alert.alert('Missing Info', 'Please enter the employee name.');
      return;
    }
    setSaving(true);
    try {
      const uri = await capture();
      await saveIDCard({
        id: generateCardId(),
        type: 'employee',
        name: `Employee ID – ${data.employeeName}`,
        templateId: data.templateId,
        previewUri: uri,
        dataJson: JSON.stringify(data),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      Alert.alert('Saved', 'Employee ID card saved to your library.');
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
      const fileName = `EmployeeID-${data.employeeName.replace(/\s+/g, '_') || 'card'}-${Date.now()}`;
      await exportIDCard(uri, format, fileName);
      if (Platform.OS !== 'web') Alert.alert('Exported', `Card exported as ${format.toUpperCase()}.`);
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message ?? 'Could not export card.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={[styles.header, { paddingTop: topPad + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.headerIcon, { backgroundColor: COLOR + '18' }]}>
          <MaterialCommunityIcons name="badge-account-horizontal-outline" size={16} color={COLOR} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Employee ID Card</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Office • Corporate • Company</Text>
        </View>
        <TouchableOpacity onPress={() => setData({ ...DEFAULT_EMPLOYEE })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="restore" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 24 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Preview */}
        <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.previewHeader}>
            <Text style={[styles.previewLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Live Preview</Text>
            <View style={styles.flipRow}>
              <Text style={[styles.flipLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Back</Text>
              <Switch value={showBack} onValueChange={setShowBack} trackColor={{ false: colors.border, true: COLOR + '80' }} thumbColor={showBack ? COLOR : colors.mutedForeground} />
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewScroll}>
            <View style={[styles.cardWrapper, !showBack && styles.cardActive]}>
              <Text style={[styles.sideLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Front</Text>
              <ViewShot ref={frontShotRef} options={{ format: 'png', quality: 1 }}>
                <IDCardEmployee data={data} showBack={false} />
              </ViewShot>
            </View>
            <View style={[styles.cardWrapper, showBack && styles.cardActive]}>
              <Text style={[styles.sideLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Back</Text>
              <ViewShot ref={backShotRef} options={{ format: 'png', quality: 1 }}>
                <IDCardEmployee data={data} showBack={true} />
              </ViewShot>
            </View>
          </ScrollView>
        </View>

        {/* Template */}
        <Section title="Design Template" colors={colors}>
          <TemplateSelector selected={data.templateId} onSelect={(id) => set('templateId', id as TemplateId)} />
        </Section>

        {/* Company */}
        <Section title="Company Information" colors={colors}>
          <Field label="Company Name *" value={data.companyName} onChange={(v) => set('companyName', v)} placeholder="e.g. Acme Corp." color={COLOR} colors={colors} />
          <Field label="Address" value={data.address} onChange={(v) => set('address', v)} placeholder="Company Address" color={COLOR} colors={colors} multiline />
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Company Logo</Text>
          <PhotoPicker uri={data.companyLogoUri} onPicked={(uri) => set('companyLogoUri', uri)} onClear={() => set('companyLogoUri', '')} label="Add Logo" size={60} accent={COLOR} shape="square" />
        </Section>

        {/* Employee */}
        <Section title="Employee Information" colors={colors}>
          <View style={styles.photoRow}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Employee Photo</Text>
            <PhotoPicker uri={data.photoUri} onPicked={(uri) => set('photoUri', uri)} onClear={() => set('photoUri', '')} label="Add Photo" size={75} accent={COLOR} shape="rounded" />
          </View>
          <Field label="Full Name *" value={data.employeeName} onChange={(v) => set('employeeName', v)} placeholder="Employee Full Name" color={COLOR} colors={colors} />
          <View style={styles.twoCol}>
            <View style={styles.half}><Field label="Employee ID" value={data.employeeId} onChange={(v) => set('employeeId', v)} placeholder="EMP-001" color={COLOR} colors={colors} /></View>
            <View style={styles.half}><Field label="Department" value={data.department} onChange={(v) => set('department', v)} placeholder="e.g. IT" color={COLOR} colors={colors} /></View>
          </View>
          <Field label="Designation" value={data.designation} onChange={(v) => set('designation', v)} placeholder="e.g. Senior Engineer" color={COLOR} colors={colors} />
          <View style={styles.twoCol}>
            <View style={styles.half}><Field label="Contact" value={data.contactNumber} onChange={(v) => set('contactNumber', v)} placeholder="+91..." color={COLOR} colors={colors} keyboardType="phone-pad" /></View>
            <View style={styles.half}><Field label="Email" value={data.email} onChange={(v) => set('email', v)} placeholder="emp@company.com" color={COLOR} colors={colors} keyboardType="email-address" /></View>
          </View>
          <Field label="Emergency Contact" value={data.emergencyContact} onChange={(v) => set('emergencyContact', v)} placeholder="+91 98765 43210" color={COLOR} colors={colors} keyboardType="phone-pad" />
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Blood Group</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
            {BLOOD_GROUPS.map((bg) => (
              <TouchableOpacity key={bg} onPress={() => set('bloodGroup', bg)} style={[styles.pill, { borderColor: data.bloodGroup === bg ? COLOR : colors.border, backgroundColor: data.bloodGroup === bg ? COLOR + '14' : colors.card, borderRadius: 20 }]}>
                <Text style={[styles.pillText, { color: data.bloodGroup === bg ? COLOR : colors.mutedForeground, fontFamily: data.bloodGroup === bg ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{bg}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.twoCol}>
            <View style={styles.half}><Field label="Join Date" value={data.joinDate} onChange={(v) => set('joinDate', v)} placeholder="DD/MM/YYYY" color={COLOR} colors={colors} /></View>
            <View style={styles.half}><Field label="Valid Until" value={data.validUntil} onChange={(v) => set('validUntil', v)} placeholder="DD/MM/YYYY" color={COLOR} colors={colors} /></View>
          </View>
        </Section>

        {/* Save & Export */}
        <Section title="Save & Export" colors={colors}>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2 }]}>
            {saving ? <ActivityIndicator size="small" color="#FFF" /> : (
              <>
                <MaterialCommunityIcons name="content-save-outline" size={18} color="#FFF" />
                <Text style={[styles.btnText, { fontFamily: 'Inter_600SemiBold' }]}>Save Card</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={[styles.exportLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Export As</Text>
          <View style={styles.exportRow}>
            {(['png', 'jpg', 'pdf'] as ExportFormat[]).map((fmt) => (
              <TouchableOpacity key={fmt} onPress={() => handleExport(fmt)} disabled={exporting} style={[styles.exportBtn, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius - 2, flex: 1 }]}>
                {exporting ? <ActivityIndicator size="small" color={COLOR} /> : (
                  <>
                    <MaterialCommunityIcons name={fmt === 'pdf' ? 'file-pdf-box' : 'image-outline'} size={16} color={COLOR} />
                    <Text style={[styles.exportBtnText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{fmt.toUpperCase()}</Text>
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
    <View style={[secS.container, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <Text style={[secS.title, { color: colors.foreground, fontFamily: 'Inter_700Bold', borderBottomColor: colors.border }]}>{title}</Text>
      <View style={secS.body}>{children}</View>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, color, colors, multiline, keyboardType }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  color: string; colors: ReturnType<typeof useColors>; multiline?: boolean; keyboardType?: any;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fldS.wrapper}>
      <Text style={[fldS.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.mutedForeground + '80'} multiline={multiline} keyboardType={keyboardType}
        style={[fldS.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: focused ? color : colors.border, borderRadius: colors.radius - 4, fontFamily: 'Inter_400Regular', minHeight: multiline ? 60 : 40 }]}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 10, borderBottomWidth: 1 },
  headerIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 17 },
  headerSub: { fontSize: 11, marginTop: 1 },
  scroll: { padding: 14, gap: 14 },
  previewCard: { borderWidth: 1, padding: 14 },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  previewLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  flipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flipLabel: { fontSize: 12 },
  previewScroll: { gap: 16, paddingVertical: 4, paddingHorizontal: 2 },
  cardWrapper: { opacity: 0.6, transform: [{ scale: 0.97 }] },
  cardActive: { opacity: 1, transform: [{ scale: 1 }] },
  sideLabel: { fontSize: 10, marginBottom: 4, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.4 },
  twoCol: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  photoRow: { gap: 6 },
  fieldLabel: { fontSize: 12, marginBottom: 6 },
  pillRow: { gap: 6, paddingBottom: 4 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1.5 },
  pillText: { fontSize: 11 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6, marginBottom: 12 },
  btnText: { color: '#FFF', fontSize: 15 },
  exportLabel: { fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  exportRow: { flexDirection: 'row', gap: 10 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6, borderWidth: 1 },
  exportBtnText: { fontSize: 13 },
});
const secS = StyleSheet.create({
  container: { borderWidth: 1, overflow: 'hidden', marginBottom: 2 },
  title: { fontSize: 14, padding: 14, paddingBottom: 10, borderBottomWidth: 1 },
  body: { padding: 14, gap: 12 },
});
const fldS = StyleSheet.create({
  wrapper: { gap: 5 },
  label: { fontSize: 12 },
  input: { borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, textAlignVertical: 'top' },
});
