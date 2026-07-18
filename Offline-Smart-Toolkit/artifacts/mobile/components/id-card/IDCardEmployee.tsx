// ─── Employee ID Card Preview ─────────────────────────────────────────────────
import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { getTemplate } from '@/lib/features/id-card/templates';
import type { EmployeeIDData } from '@/lib/features/id-card/types';

const CARD_W = 320;
const CARD_H = 202;

interface Props {
  data: EmployeeIDData;
  showBack?: boolean;
}

export function IDCardEmployee({ data, showBack = false }: Props) {
  const tpl = getTemplate(data.templateId);
  if (showBack) return <EmployeeBack data={data} tpl={tpl} />;
  return <EmployeeFront data={data} tpl={tpl} />;
}

function EmployeeFront({ data, tpl }: { data: EmployeeIDData; tpl: ReturnType<typeof getTemplate> }) {
  const qrValue = `EmpID:${data.employeeId}|Name:${data.employeeName}|Dept:${data.department}|Company:${data.companyName}`;

  return (
    <View style={[s.card, { width: CARD_W, height: CARD_H, backgroundColor: tpl.bgColor, borderColor: tpl.accentColor + '40' }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: tpl.headerBgColor }]}>
        {data.companyLogoUri ? (
          <Image source={{ uri: data.companyLogoUri }} style={s.logo} resizeMode="contain" />
        ) : (
          <View style={[s.logoPlaceholder, { backgroundColor: tpl.accentColor + '30' }]}>
            <Text style={s.logoEmoji}>🏢</Text>
          </View>
        )}
        <View style={s.headerRight}>
          <Text style={[s.companyName, { color: tpl.textColor, fontFamily: 'Inter_700Bold' }]} numberOfLines={1}>
            {data.companyName || 'Company Name'}
          </Text>
          <Text style={[s.cardBadge, { color: tpl.accentColor }]}>EMPLOYEE IDENTITY CARD</Text>
        </View>
      </View>

      {/* Accent strip */}
      <View style={[s.strip, { backgroundColor: tpl.accentColor }]} />

      {/* Body */}
      <View style={s.body}>
        <View style={[s.photoBox, { borderColor: tpl.accentColor }]}>
          {data.photoUri ? (
            <Image source={{ uri: data.photoUri }} style={s.photo} resizeMode="cover" />
          ) : (
            <View style={[s.photoPlaceholder, { backgroundColor: tpl.accentColor + '18' }]}>
              <Text style={{ fontSize: 24 }}>👤</Text>
            </View>
          )}
        </View>

        <View style={s.infoCol}>
          <Text style={[s.empName, { color: tpl.headerBgColor, fontFamily: 'Inter_700Bold' }]} numberOfLines={1}>
            {data.employeeName || 'Employee Name'}
          </Text>
          <Text style={[s.designation, { color: tpl.accentColor, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
            {data.designation || 'Designation'}
          </Text>
          <Row label="Emp ID" value={data.employeeId || '—'} tpl={tpl} />
          <Row label="Dept" value={data.department || '—'} tpl={tpl} />
          <Row label="Contact" value={data.contactNumber || '—'} tpl={tpl} />
          <Row label="Blood" value={data.bloodGroup || '—'} tpl={tpl} />
        </View>

        <View style={s.qrCol}>
          <QRCode value={qrValue || 'CSC-EMP'} size={52} color={tpl.headerBgColor} backgroundColor="transparent" />
          <Text style={[s.qrLabel, { color: tpl.headerBgColor + '80', fontFamily: 'Inter_400Regular' }]}>
            Scan Me
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={[s.footer, { backgroundColor: tpl.headerBgColor + '10', borderTopColor: tpl.accentColor + '30' }]}>
        <Text style={[s.footerLeft, { color: tpl.headerBgColor + '90', fontFamily: 'Inter_400Regular' }]}>
          Valid Until: {data.validUntil || 'N/A'}
        </Text>
        <Text style={[s.footerId, { color: tpl.accentColor, fontFamily: 'Inter_600SemiBold' }]}>
          #{data.employeeId || '000'}
        </Text>
      </View>
    </View>
  );
}

function EmployeeBack({ data, tpl }: { data: EmployeeIDData; tpl: ReturnType<typeof getTemplate> }) {
  return (
    <View style={[s.card, { width: CARD_W, height: CARD_H, backgroundColor: tpl.bgColor, borderColor: tpl.accentColor + '40' }]}>
      <View style={[s.backHeader, { backgroundColor: tpl.headerBgColor }]}>
        <Text style={[s.backTitle, { color: tpl.textColor, fontFamily: 'Inter_700Bold' }]}>
          {data.companyName || 'Company Name'}
        </Text>
        <Text style={[s.backSub, { color: tpl.accentColor }]}>EMPLOYEE ID — BACK</Text>
      </View>

      <View style={s.backBody}>
        <BackField label="Email" value={data.email || '—'} tpl={tpl} />
        <BackField label="Emergency Contact" value={data.emergencyContact || '—'} tpl={tpl} />
        <BackField label="Address" value={data.address || '—'} tpl={tpl} />
        <BackField label="Joining Date" value={data.joinDate || '—'} tpl={tpl} />

        <View style={[s.notice, { backgroundColor: tpl.accentColor + '10', borderColor: tpl.accentColor + '30' }]}>
          <Text style={[s.noticeText, { color: tpl.headerBgColor + '99', fontFamily: 'Inter_400Regular' }]}>
            If found, please return to {data.companyName || 'the company'}. This card is property of the organization.
          </Text>
        </View>
      </View>
    </View>
  );
}

function Row({ label, value, tpl }: { label: string; value: string; tpl: ReturnType<typeof getTemplate> }) {
  return (
    <View style={s.row}>
      <Text style={[s.rowLabel, { color: tpl.headerBgColor + '70', fontFamily: 'Inter_500Medium' }]}>{label}</Text>
      <Text style={[s.rowValue, { color: tpl.headerBgColor, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function BackField({ label, value, tpl }: { label: string; value: string; tpl: ReturnType<typeof getTemplate> }) {
  return (
    <View style={s.backField}>
      <Text style={[s.backLabel, { color: tpl.headerBgColor + '70', fontFamily: 'Inter_500Medium' }]}>{label}</Text>
      <Text style={[s.backValue, { color: tpl.headerBgColor, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, elevation: 6, ...Platform.select({ web: { boxShadow: '0 3px 8px rgba(0,0,0,0.15)' } as any, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8 } }) },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, gap: 8 },
  logo: { width: 36, height: 36 },
  logoPlaceholder: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 20 },
  headerRight: { flex: 1 },
  companyName: { fontSize: 11 },
  cardBadge: { fontSize: 8.5, letterSpacing: 0.5, marginTop: 1 },
  strip: { height: 3 },
  body: { flexDirection: 'row', flex: 1, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  photoBox: { width: 64, height: 80, borderRadius: 6, borderWidth: 2, overflow: 'hidden', alignSelf: 'flex-start' },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoCol: { flex: 1, gap: 3 },
  empName: { fontSize: 13 },
  designation: { fontSize: 9.5, marginBottom: 2 },
  row: { flexDirection: 'row', gap: 4 },
  rowLabel: { fontSize: 9, width: 44, flexShrink: 0 },
  rowValue: { fontSize: 9, flex: 1 },
  qrCol: { alignItems: 'center', alignSelf: 'flex-end', gap: 3 },
  qrLabel: { fontSize: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderTopWidth: 1 },
  footerLeft: { fontSize: 8 },
  footerId: { fontSize: 9 },
  // Back
  backHeader: { paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  backTitle: { fontSize: 11 },
  backSub: { fontSize: 8.5, marginTop: 1 },
  backBody: { flex: 1, padding: 8, gap: 5 },
  backField: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  backLabel: { fontSize: 9, width: 80, flexShrink: 0 },
  backValue: { fontSize: 9, flex: 1 },
  notice: { marginTop: 4, borderWidth: 1, borderRadius: 6, padding: 6 },
  noticeText: { fontSize: 8, lineHeight: 13 },
});
