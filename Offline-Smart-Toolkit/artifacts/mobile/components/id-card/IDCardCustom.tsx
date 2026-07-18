// ─── Custom ID Card Preview ───────────────────────────────────────────────────
import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { getTemplate } from '@/lib/features/id-card/templates';
import type { CustomIDData } from '@/lib/features/id-card/types';

const CARD_W = 320;
const CARD_H = 202;

interface Props {
  data: CustomIDData;
}

export function IDCardCustom({ data }: Props) {
  const tpl = getTemplate(data.templateId);
  const bgColor = data.backgroundColor || tpl.bgColor;
  const accent = data.accentColor || tpl.accentColor;
  const headerBg = tpl.headerBgColor;
  const textColor = data.textColor || tpl.headerBgColor;

  return (
    <View style={[s.card, { width: CARD_W, height: CARD_H, backgroundColor: bgColor, borderColor: accent + '50' }]}>
      {/* Background image */}
      {data.backgroundImageUri ? (
        <Image
          source={{ uri: data.backgroundImageUri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : null}

      {/* Header */}
      <View style={[s.header, { backgroundColor: headerBg + 'EE' }]}>
        {data.logoUri ? (
          <Image source={{ uri: data.logoUri }} style={s.logo} resizeMode="contain" />
        ) : (
          <View style={[s.logoPh, { backgroundColor: accent + '30' }]}>
            <Text style={{ fontSize: 18 }}>🏷️</Text>
          </View>
        )}
        <Text style={[s.orgName, { color: '#FFFFFF', fontFamily: 'Inter_700Bold' }]} numberOfLines={1}>
          {data.orgName || 'Organization Name'}
        </Text>
      </View>

      {/* Body */}
      <View style={s.body}>
        {/* Photo */}
        <View style={[s.photoBox, { borderColor: accent }]}>
          {data.photoUri ? (
            <Image source={{ uri: data.photoUri }} style={s.photo} resizeMode="cover" />
          ) : (
            <View style={[s.photoPh, { backgroundColor: accent + '18' }]}>
              <Text style={{ fontSize: 24 }}>👤</Text>
            </View>
          )}
        </View>

        {/* Custom fields */}
        <View style={s.fieldsCol}>
          {data.fields.map((field) =>
            field.value ? (
              <View key={field.id} style={s.fieldRow}>
                <Text style={[s.fieldLabel, { color: textColor + '80', fontFamily: 'Inter_500Medium' }]}>
                  {field.label}
                </Text>
                <Text
                  style={[
                    s.fieldValue,
                    {
                      color: field.color || textColor,
                      fontSize: Math.min(field.fontSize * 0.65, 13),
                      fontFamily: field.bold ? 'Inter_700Bold' : 'Inter_400Regular',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {field.value}
                </Text>
              </View>
            ) : null
          )}
        </View>

        {/* QR or Barcode */}
        {data.showQR && data.qrValue ? (
          <View style={s.qrBox}>
            <QRCode value={data.qrValue} size={52} color={headerBg} backgroundColor="transparent" />
          </View>
        ) : null}
      </View>

      {/* Bottom strip */}
      <View style={[s.strip, { backgroundColor: accent }]} />
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, elevation: 6, ...Platform.select({ web: { boxShadow: '0 3px 8px rgba(0,0,0,0.15)' } as any, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 8 } }) },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, gap: 8 },
  logo: { width: 30, height: 30 },
  logoPh: { width: 30, height: 30, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  orgName: { flex: 1, fontSize: 12 },
  body: { flexDirection: 'row', flex: 1, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  photoBox: { width: 64, height: 82, borderRadius: 6, borderWidth: 2, overflow: 'hidden', alignSelf: 'flex-start' },
  photo: { width: '100%', height: '100%' },
  photoPh: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fieldsCol: { flex: 1, gap: 4 },
  fieldRow: { gap: 1 },
  fieldLabel: { fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  fieldValue: {},
  qrBox: { alignSelf: 'flex-end', paddingBottom: 4 },
  strip: { height: 6 },
});
