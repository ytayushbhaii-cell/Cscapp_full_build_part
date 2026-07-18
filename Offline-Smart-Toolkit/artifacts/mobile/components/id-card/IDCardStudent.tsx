// ─── Student ID Card Preview (Render Component) ───────────────────────────────
// Pure View-based card that can be captured by ViewShot.
// No state, no hooks other than pure rendering.

import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { getTemplate } from '@/lib/features/id-card/templates';
import type { StudentIDData } from '@/lib/features/id-card/types';

// Standard CR80 card: 85.6mm × 53.98mm.
// At 3px/mm ≈ 257 × 162px — good for screen preview
const CARD_W = 320;
const CARD_H = 202;

interface Props {
  data: StudentIDData;
  showBack?: boolean;
}

export function IDCardStudent({ data, showBack = false }: Props) {
  const tpl = getTemplate(data.templateId);

  if (showBack) return <StudentBack data={data} tpl={tpl} />;
  return <StudentFront data={data} tpl={tpl} />;
}

function StudentFront({ data, tpl }: { data: StudentIDData; tpl: ReturnType<typeof getTemplate> }) {
  const qrValue = `Name:${data.name}|Roll:${data.rollNumber}|Class:${data.className}|School:${data.schoolName}`;

  return (
    <View style={[s.card, { width: CARD_W, height: CARD_H, backgroundColor: tpl.bgColor, borderColor: tpl.accentColor + '40' }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: tpl.headerBgColor }]}>
        {data.schoolLogoUri ? (
          <Image source={{ uri: data.schoolLogoUri }} style={s.logo} resizeMode="contain" />
        ) : (
          <View style={[s.logoPlaceholder, { backgroundColor: tpl.accentColor + '30' }]}>
            <Text style={[s.logoText, { color: tpl.textColor }]}>🏫</Text>
          </View>
        )}
        <View style={s.headerText}>
          <Text style={[s.schoolName, { color: tpl.textColor, fontFamily: 'Inter_700Bold' }]} numberOfLines={1}>
            {data.schoolName || 'School Name'}
          </Text>
          <Text style={[s.cardTitle, { color: tpl.accentColor }]}>STUDENT IDENTITY CARD</Text>
          <Text style={[s.yearText, { color: tpl.textColor + 'CC' }]}>
            {data.academicYear}
          </Text>
        </View>
      </View>

      {/* Body */}
      <View style={s.body}>
        {/* Photo */}
        <View style={[s.photoBox, { borderColor: tpl.accentColor }]}>
          {data.photoUri ? (
            <Image source={{ uri: data.photoUri }} style={s.photo} resizeMode="cover" />
          ) : (
            <View style={[s.photoPlaceholder, { backgroundColor: tpl.accentColor + '20' }]}>
              <Text style={{ fontSize: 28 }}>👤</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={s.info}>
          <Text style={[s.nameText, { color: tpl.headerBgColor, fontFamily: 'Inter_700Bold' }]} numberOfLines={1}>
            {data.name || 'Student Name'}
          </Text>
          <InfoRow label="Roll No." value={data.rollNumber || '—'} tpl={tpl} />
          <InfoRow label="Class" value={`${data.className}${data.division ? ' – ' + data.division : ''}`} tpl={tpl} />
          <InfoRow label="D.O.B" value={data.dateOfBirth || '—'} tpl={tpl} />
          <InfoRow label="Blood" value={data.bloodGroup || '—'} tpl={tpl} />
          <InfoRow label="Contact" value={data.contactNumber || '—'} tpl={tpl} />
        </View>

        {/* QR */}
        <View style={s.qrBox}>
          <QRCode value={qrValue || 'CSC-TOOLKIT'} size={52} color={tpl.headerBgColor} backgroundColor="transparent" />
        </View>
      </View>

      {/* Footer */}
      <View style={[s.footer, { backgroundColor: tpl.headerBgColor + '18', borderTopColor: tpl.accentColor + '30' }]}>
        <Text style={[s.footerText, { color: tpl.headerBgColor, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
          {data.address || 'School Address'}
        </Text>
        <Text style={[s.validText, { color: tpl.accentColor }]}>
          Valid: {data.validUntil || 'This Year'}
        </Text>
      </View>
    </View>
  );
}

function StudentBack({ data, tpl }: { data: StudentIDData; tpl: ReturnType<typeof getTemplate> }) {
  return (
    <View style={[s.card, { width: CARD_W, height: CARD_H, backgroundColor: tpl.bgColor, borderColor: tpl.accentColor + '40' }]}>
      {/* Top bar */}
      <View style={[s.backHeader, { backgroundColor: tpl.headerBgColor }]}>
        <Text style={[s.backTitle, { color: tpl.textColor, fontFamily: 'Inter_700Bold' }]}>
          {data.schoolName || 'School Name'}
        </Text>
      </View>

      <View style={s.backBody}>
        {/* Emergency info */}
        <View style={[s.infoBox, { borderColor: tpl.accentColor + '40', backgroundColor: tpl.accentColor + '08' }]}>
          <Text style={[s.infoBoxTitle, { color: tpl.headerBgColor, fontFamily: 'Inter_600SemiBold' }]}>
            Emergency Contact
          </Text>
          <Text style={[s.infoBoxValue, { color: tpl.headerBgColor + 'CC' }]}>
            {data.contactNumber || '—'}
          </Text>
        </View>

        {/* Rules */}
        <View style={s.rulesBox}>
          <Text style={[s.rulesTitle, { color: tpl.headerBgColor, fontFamily: 'Inter_600SemiBold' }]}>
            Rules & Regulations
          </Text>
          {[
            '• This card is non-transferable.',
            '• Report loss immediately to school.',
            '• Must be carried at all times.',
            '• If found, return to school office.',
          ].map((r, i) => (
            <Text key={i} style={[s.ruleText, { color: tpl.headerBgColor + 'AA' }]}>{r}</Text>
          ))}
        </View>

        {/* Signature */}
        <View style={s.signatureRow}>
          <View style={s.sigBox}>
            {data.principalSignatureUri ? (
              <Image source={{ uri: data.principalSignatureUri }} style={s.sigImg} resizeMode="contain" />
            ) : (
              <View style={[s.sigPlaceholder, { borderColor: tpl.accentColor + '40' }]} />
            )}
            <Text style={[s.sigLabel, { color: tpl.headerBgColor, fontFamily: 'Inter_500Medium' }]}>
              {data.principalName ? `Principal\n${data.principalName}` : 'Principal Signature'}
            </Text>
          </View>
          <View style={s.sigBox}>
            <View style={[s.sigPlaceholder, { borderColor: tpl.accentColor + '40' }]} />
            <Text style={[s.sigLabel, { color: tpl.headerBgColor, fontFamily: 'Inter_500Medium' }]}>
              Student Signature
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function InfoRow({
  label, value, tpl,
}: { label: string; value: string; tpl: ReturnType<typeof getTemplate> }) {
  return (
    <View style={s.infoRow}>
      <Text style={[s.infoLabel, { color: tpl.headerBgColor + '80', fontFamily: 'Inter_500Medium' }]}>
        {label}
      </Text>
      <Text style={[s.infoValue, { color: tpl.headerBgColor, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, elevation: 6, ...Platform.select({ web: { boxShadow: '0 3px 8px rgba(0,0,0,0.15)' } as any, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8 } }) },
  // Front
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, gap: 8 },
  logo: { width: 36, height: 36 },
  logoPlaceholder: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 20 },
  headerText: { flex: 1 },
  schoolName: { fontSize: 11 },
  cardTitle: { fontSize: 9, letterSpacing: 0.8, marginTop: 1 },
  yearText: { fontSize: 8, marginTop: 1 },
  body: { flexDirection: 'row', flex: 1, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  photoBox: { width: 64, height: 82, borderRadius: 6, borderWidth: 2, overflow: 'hidden', alignSelf: 'flex-start' },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 3 },
  nameText: { fontSize: 13, marginBottom: 3 },
  infoRow: { flexDirection: 'row', gap: 4 },
  infoLabel: { fontSize: 9, width: 44, flexShrink: 0 },
  infoValue: { fontSize: 9, flex: 1 },
  qrBox: { alignSelf: 'flex-end', paddingBottom: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderTopWidth: 1 },
  footerText: { fontSize: 8, flex: 1, marginRight: 6 },
  validText: { fontSize: 8, fontFamily: 'Inter_600SemiBold' },
  // Back
  backHeader: { paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  backTitle: { fontSize: 11 },
  backBody: { flex: 1, padding: 8, gap: 6 },
  infoBox: { borderWidth: 1, borderRadius: 6, padding: 6 },
  infoBoxTitle: { fontSize: 9 },
  infoBoxValue: { fontSize: 10, marginTop: 2 },
  rulesBox: { flex: 1 },
  rulesTitle: { fontSize: 9, marginBottom: 3 },
  ruleText: { fontSize: 7.5, lineHeight: 13, fontFamily: 'Inter_400Regular' },
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  sigBox: { flex: 1, alignItems: 'center', gap: 4 },
  sigImg: { width: 80, height: 28 },
  sigPlaceholder: { width: '100%', height: 28, borderWidth: 1, borderStyle: 'dashed', borderRadius: 4 },
  sigLabel: { fontSize: 8, textAlign: 'center' },
});
