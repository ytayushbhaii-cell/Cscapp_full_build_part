// ─── Student ID Card Generator ────────────────────────────────────────────────
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
import { IDCardStudent } from '@/components/id-card/IDCardStudent';
import { TemplateSelector } from '@/components/id-card/TemplateSelector';
import { PhotoPicker } from '@/components/id-card/PhotoPicker';
import { exportIDCard } from '@/lib/features/id-card/ExportService';
import { saveIDCard, generateCardId } from '@/lib/features/id-card/db';
import { DEFAULT_STUDENT } from '@/lib/features/id-card/types';
import type { StudentIDData, TemplateId, ExportFormat, BloodGroup } from '@/lib/features/id-card/types';

const COLOR = '#059669';
const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function StudentIDScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const topPad = Platform.OS === 'web' ? 30 : insets.top;
  const botPad = Platform.OS === 'web' ? 24 : insets.bottom;

  const [data, setData] = useState<StudentIDData>({ ...DEFAULT_STUDENT });
  const [showBack, setShowBack] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const frontShotRef = useRef<ViewShot>(null);
  const backShotRef = useRef<ViewShot>(null);

  const set = (field: keyof StudentIDData, value: string) =>
    setData((d) => ({ ...d, [field]: value }));

  const capture = async (): Promise<string> => {
    const ref = showBack ? backShotRef : frontShotRef;
    if (Platform.OS === 'web') {
      // On web, html2canvas via ViewShot
      return (ref.current as any).capture();
    }
    return (ref.current as any).capture();
  };

  const handleSave = async () => {
    if (!data.name.trim()) {
      Alert.alert('Missing Info', 'Please enter the student name.');
      return;
    }
    setSaving(true);
    try {
      const uri = await capture();
      await saveIDCard({
        id: generateCardId(),
        type: 'student',
        name: `Student ID – ${data.name}`,
        templateId: data.templateId,
        previewUri: uri,
        dataJson: JSON.stringify(data),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      Alert.alert('Saved', 'Student ID card saved to your library.');
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
      const fileName = `StudentID-${data.name.replace(/\s+/g, '_') || 'card'}-${Date.now()}`;
      await exportIDCard(uri, format, fileName);
      if (Platform.OS !== 'web') {
        Alert.alert('Exported', `Card exported as ${format.toUpperCase()}.`);
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message ?? 'Could not export card.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={[styles.headerIcon, { backgroundColor: COLOR + '18' }]}>
          <MaterialCommunityIcons name="school-outline" size={16} color={COLOR} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            Student ID Card
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            School • College • Academy
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setData({ ...DEFAULT_STUDENT })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="restore" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Live Preview ── */}
        <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.previewHeader}>
            <Text style={[styles.previewLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
              Live Preview
            </Text>
            <View style={styles.flipRow}>
              <Text style={[styles.flipLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Back</Text>
              <Switch
                value={showBack}
                onValueChange={setShowBack}
                trackColor={{ false: colors.border, true: COLOR + '80' }}
                thumbColor={showBack ? COLOR : colors.mutedForeground}
              />
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewScroll}>
            {/* Front */}
            <View style={[styles.cardWrapper, !showBack && styles.cardActive]}>
              <Text style={[styles.sideLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Front</Text>
              <ViewShot ref={frontShotRef} options={{ format: 'png', quality: 1 }}>
                <IDCardStudent data={data} showBack={false} />
              </ViewShot>
            </View>
            {/* Back */}
            <View style={[styles.cardWrapper, showBack && styles.cardActive]}>
              <Text style={[styles.sideLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Back</Text>
              <ViewShot ref={backShotRef} options={{ format: 'png', quality: 1 }}>
                <IDCardStudent data={data} showBack={true} />
              </ViewShot>
            </View>
          </ScrollView>
        </View>

        {/* ── Template ── */}
        <Section title="Design Template" colors={colors}>
          <TemplateSelector selected={data.templateId} onSelect={(id) => set('templateId', id as TemplateId)} />
        </Section>

        {/* ── School Info ── */}
        <Section title="School Information" colors={colors}>
          <Field label="School Name *" value={data.schoolName} onChange={(v) => set('schoolName', v)} placeholder="e.g. St. Mary's High School" color={COLOR} colors={colors} />
          <Field label="Academic Year" value={data.academicYear} onChange={(v) => set('academicYear', v)} placeholder="2024-2025" color={COLOR} colors={colors} />
          <Field label="Principal Name" value={data.principalName} onChange={(v) => set('principalName', v)} placeholder="e.g. Dr. A. Sharma" color={COLOR} colors={colors} />
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>School Logo</Text>
          <PhotoPicker
            uri={data.schoolLogoUri}
            onPicked={(uri) => set('schoolLogoUri', uri)}
            onClear={() => set('schoolLogoUri', '')}
            label="Add Logo"
            size={60}
            accent={COLOR}
            shape="square"
          />
        </Section>

        {/* ── Student Info ── */}
        <Section title="Student Information" colors={colors}>
          <View style={styles.photoRow}>
            <View style={styles.photoLabel}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Student Photo</Text>
              <PhotoPicker
                uri={data.photoUri}
                onPicked={(uri) => set('photoUri', uri)}
                onClear={() => set('photoUri', '')}
                label="Add Photo"
                size={75}
                accent={COLOR}
                shape="rounded"
              />
            </View>
          </View>
          <Field label="Full Name *" value={data.name} onChange={(v) => set('name', v)} placeholder="Student Full Name" color={COLOR} colors={colors} />
          <View style={styles.twoCol}>
            <View style={styles.half}>
              <Field label="Roll Number" value={data.rollNumber} onChange={(v) => set('rollNumber', v)} placeholder="e.g. 2401" color={COLOR} colors={colors} />
            </View>
            <View style={styles.half}>
              <Field label="Class" value={data.className} onChange={(v) => set('className', v)} placeholder="e.g. 10" color={COLOR} colors={colors} />
            </View>
          </View>
          <View style={styles.twoCol}>
            <View style={styles.half}>
              <Field label="Division" value={data.division} onChange={(v) => set('division', v)} placeholder="A / B / C" color={COLOR} colors={colors} />
            </View>
            <View style={styles.half}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Blood Group</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {BLOOD_GROUPS.map((bg) => (
                  <TouchableOpacity
                    key={bg}
                    onPress={() => set('bloodGroup', bg)}
                    style={[styles.pill, {
                      borderColor: data.bloodGroup === bg ? COLOR : colors.border,
                      backgroundColor: data.bloodGroup === bg ? COLOR + '14' : colors.card,
                      borderRadius: 20,
                    }]}
                  >
                    <Text style={[styles.pillText, { color: data.bloodGroup === bg ? COLOR : colors.mutedForeground, fontFamily: data.bloodGroup === bg ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                      {bg}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <Field label="Date of Birth" value={data.dateOfBirth} onChange={(v) => set('dateOfBirth', v)} placeholder="DD/MM/YYYY" color={COLOR} colors={colors} />
          <Field label="Contact Number" value={data.contactNumber} onChange={(v) => set('contactNumber', v)} placeholder="+91 98765 43210" color={COLOR} colors={colors} keyboardType="phone-pad" />
          <Field label="Address" value={data.address} onChange={(v) => set('address', v)} placeholder="School / Home Address" color={COLOR} colors={colors} multiline />
          <View style={styles.twoCol}>
            <View style={styles.half}>
              <Field label="Issue Date" value={data.issueDate} onChange={(v) => set('issueDate', v)} placeholder="DD/MM/YYYY" color={COLOR} colors={colors} />
            </View>
            <View style={styles.half}>
              <Field label="Valid Until" value={data.validUntil} onChange={(v) => set('validUntil', v)} placeholder="DD/MM/YYYY" color={COLOR} colors={colors} />
            </View>
          </View>
        </Section>

        {/* ── Export ── */}
        <Section title="Save & Export" colors={colors}>
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.saveBtn, { backgroundColor: COLOR, borderRadius: colors.radius - 2, flex: 1 }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save-outline" size={18} color="#FFF" />
                  <Text style={[styles.btnText, { fontFamily: 'Inter_600SemiBold' }]}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.exportLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Export As</Text>
          <View style={styles.exportRow}>
            {(['png', 'jpg', 'pdf'] as ExportFormat[]).map((fmt) => (
              <TouchableOpacity
                key={fmt}
                onPress={() => handleExport(fmt)}
                disabled={exporting}
                style={[styles.exportBtn, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius - 2, flex: 1 }]}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={COLOR} />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name={fmt === 'pdf' ? 'file-pdf-box' : 'image-outline'}
                      size={16}
                      color={COLOR}
                    />
                    <Text style={[styles.exportBtnText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                      {fmt.toUpperCase()}
                    </Text>
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

// ── Shared sub-components ─────────────────────────────────────────────────────

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[sectionS.container, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <Text style={[sectionS.title, { color: colors.foreground, fontFamily: 'Inter_700Bold', borderBottomColor: colors.border }]}>
        {title}
      </Text>
      <View style={sectionS.body}>{children}</View>
    </View>
  );
}

function Field({
  label, value, onChange, placeholder, color, colors, multiline, keyboardType,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  color: string; colors: ReturnType<typeof useColors>; multiline?: boolean; keyboardType?: any;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fieldS.wrapper}>
      <Text style={[fieldS.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground + '80'}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[
          fieldS.input,
          {
            color: colors.foreground,
            backgroundColor: colors.background,
            borderColor: focused ? color : colors.border,
            borderRadius: colors.radius - 4,
            fontFamily: 'Inter_400Regular',
            minHeight: multiline ? 60 : 40,
          },
        ]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 10, borderBottomWidth: 1 },
  iconBtn: { padding: 2 },
  headerIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 17 },
  headerSub: { fontSize: 11, marginTop: 1 },
  scroll: { padding: 14, gap: 14 },
  previewCard: { borderWidth: 1, padding: 14, marginBottom: 2 },
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
  photoRow: { marginBottom: 4 },
  photoLabel: { gap: 6 },
  fieldLabel: { fontSize: 12, marginBottom: 6 },
  pillRow: { gap: 6, paddingBottom: 4 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1.5 },
  pillText: { fontSize: 11 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  btnText: { color: '#FFF', fontSize: 15 },
  exportLabel: { fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  exportRow: { flexDirection: 'row', gap: 10 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6, borderWidth: 1 },
  exportBtnText: { fontSize: 13 },
});

const sectionS = StyleSheet.create({
  container: { borderWidth: 1, overflow: 'hidden', marginBottom: 2 },
  title: { fontSize: 14, padding: 14, paddingBottom: 10, borderBottomWidth: 1 },
  body: { padding: 14, gap: 12 },
});

const fieldS = StyleSheet.create({
  wrapper: { gap: 5 },
  label: { fontSize: 12 },
  input: { borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, textAlignVertical: 'top' },
});
