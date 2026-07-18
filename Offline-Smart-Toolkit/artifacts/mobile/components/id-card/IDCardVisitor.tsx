// ─── Visitor ID Card Preview ──────────────────────────────────────────────────
import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { getTemplate } from '@/lib/features/id-card/templates';
import type { VisitorIDData } from '@/lib/features/id-card/types';

const CARD_W = 320;
const CARD_H = 202;

interface Props {
  data: VisitorIDData;
}

export function IDCardVisitor({ data }: Props) {
  const tpl = getTemplate(data.templateId);
  const qrValue = `Visitor:${data.visitorName}|Badge:${data.badgeNumber}|Date:${data.date}`;

  return (
    <View style={[s.card, { width: CARD_W, height: CARD_H, backgroundColor: tpl.bgColor, borderColor: tpl.accentColor + '40' }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: tpl.headerBgColor }]}>
        <View style={[s.visitorBadge, { backgroundColor: tpl.accentColor }]}>
          <Text style={[s.visitorBadgeText, { color: '#FFFFFF', fontFamily: 'Inter_700Bold' }]}>VISITOR</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={[s.orgName, { color: tpl.textColor, fontFamily: 'Inter_700Bold' }]} numberOfLines={1}>
            {data.orgName || 'Organization Name'}
          </Text>
          <Text style={[s.passLabel, { color: tpl.accentColor }]}>VISITOR PASS</Text>
        </View>
        {data.orgLogoUri ? (
          <Image source={{ uri: data.orgLogoUri }} style={s.logo} resizeMode="contain" />
        ) : null}
      </View>

      {/* Body */}
      <View style={s.body}>
        {/* Photo */}
        <View style={[s.photoBox, { borderColor: tpl.accentColor }]}>
          {data.photoUri ? (
            <Image source={{ uri: data.photoUri }} style={s.photo} resizeMode="cover" />
          ) : (
            <View style={[s.photoPlaceholder, { backgroundColor: tpl.accentColor + '18' }]}>
              <Text style={{ fontSize: 26 }}>👤</Text>
            </View>
          )}
          {data.badgeNumber ? (
            <View style={[s.badgeTag, { backgroundColor: tpl.accentColor }]}>
              <Text style={s.badgeTagText}>#{data.badgeNumber}</Text>
            </View>
          ) : null}
        </View>

        {/* Info */}
        <View style={s.infoCol}>
          <Text style={[s.visitorName, { color: tpl.headerBgColor, fontFamily: 'Inter_700Bold' }]} numberOfLines={1}>
            {data.visitorName || 'Visitor Name'}
          </Text>
          <Text style={[s.companyText, { color: tpl.accentColor, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>
            {data.company || '—'}
          </Text>
          <VRow label="Purpose" value={data.purpose || '—'} tpl={tpl} />
          <VRow label="Host" value={data.hostName || '—'} tpl={tpl} />
          <VRow label="Date" value={data.date || '—'} tpl={tpl} />
          <VRow label="Time In" value={data.timeIn || '—'} tpl={tpl} />
          {data.timeOut ? <VRow label="Time Out" value={data.timeOut} tpl={tpl} /> : null}
        </View>

        {/* QR */}
        <View style={s.qrBox}>
          <QRCode value={qrValue || 'CSC-VISITOR'} size={50} color={tpl.headerBgColor} backgroundColor="transparent" />
        </View>
      </View>

      {/* Footer */}
      <View style={[s.footer, { backgroundColor: tpl.accentColor + '14', borderTopColor: tpl.accentColor + '30' }]}>
        <Text style={[s.footerText, { color: tpl.headerBgColor + '80', fontFamily: 'Inter_400Regular' }]}>
          This pass is valid for one-time entry only
        </Text>
        <View style={[s.statusPill, { backgroundColor: tpl.accentColor }]}>
          <Text style={[s.statusText, { fontFamily: 'Inter_600SemiBold' }]}>AUTHORIZED</Text>
        </View>
      </View>
    </View>
  );
}

function VRow({ label, value, tpl }: { label: string; value: string; tpl: ReturnType<typeof getTemplate> }) {
  return (
    <View style={s.vrow}>
      <Text style={[s.vLabel, { color: tpl.headerBgColor + '70', fontFamily: 'Inter_500Medium' }]}>{label}</Text>
      <Text style={[s.vValue, { color: tpl.headerBgColor, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, elevation: 6, ...Platform.select({ web: { boxShadow: '0 3px 8px rgba(0,0,0,0.15)' } as any, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8 } }) },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, gap: 8 },
  visitorBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  visitorBadgeText: { fontSize: 9, letterSpacing: 1 },
  headerRight: { flex: 1 },
  orgName: { fontSize: 11 },
  passLabel: { fontSize: 8.5, marginTop: 1 },
  logo: { width: 32, height: 32 },
  body: { flexDirection: 'row', flex: 1, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  photoBox: { width: 64, height: 82, borderRadius: 6, borderWidth: 2, overflow: 'hidden', alignSelf: 'flex-start', position: 'relative' },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badgeTag: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 2, alignItems: 'center' },
  badgeTagText: { fontSize: 8, color: '#FFF', fontFamily: 'Inter_700Bold' },
  infoCol: { flex: 1, gap: 3 },
  visitorName: { fontSize: 13 },
  companyText: { fontSize: 9.5, marginBottom: 2 },
  vrow: { flexDirection: 'row', gap: 4 },
  vLabel: { fontSize: 9, width: 44, flexShrink: 0 },
  vValue: { fontSize: 9, flex: 1 },
  qrBox: { alignSelf: 'flex-end', paddingBottom: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderTopWidth: 1 },
  footerText: { fontSize: 8, flex: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 7, color: '#FFF', letterSpacing: 0.5 },
});
