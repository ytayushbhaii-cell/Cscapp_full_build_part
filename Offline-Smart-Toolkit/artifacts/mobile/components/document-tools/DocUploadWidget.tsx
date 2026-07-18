import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { PickedImage } from '@/lib/photoTools/types';

export interface DocPickResult {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  isImage: boolean;
}

interface DocUploadWidgetProps {
  file: DocPickResult | null;
  onPicked: (file: DocPickResult) => void;
  onError: (message: string) => void;
  color: string;
  label?: string;
  accept?: 'image' | 'pdf' | 'both';
}

export function DocUploadWidget({
  file,
  onPicked,
  onError,
  color,
  label = 'Upload Document',
  accept = 'both',
}: DocUploadWidgetProps) {
  const colors = useColors();

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      onError('Gallery access denied. Enable photo permissions to continue.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      exif: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      const a = result.assets[0];
      onPicked({
        uri: a.uri,
        name: a.fileName || `image-${Date.now()}.jpg`,
        size: a.fileSize,
        mimeType: a.mimeType,
        width: a.width,
        height: a.height,
        isImage: true,
      });
    }
  };

  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const a = result.assets[0];
        onPicked({
          uri: a.uri,
          name: a.name || `document-${Date.now()}.pdf`,
          size: a.size,
          mimeType: a.mimeType ?? 'application/pdf',
          isImage: false,
        });
      }
    } catch {
      onError('Could not open document picker. Try again.');
    }
  };

  const pickCamera = async () => {
    if (Platform.OS === 'web') {
      onError('Camera capture not available on web — use Browse instead.');
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      onError('Camera access denied.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!result.canceled && result.assets?.[0]) {
      const a = result.assets[0];
      onPicked({
        uri: a.uri,
        name: a.fileName || `scan-${Date.now()}.jpg`,
        size: a.fileSize,
        mimeType: a.mimeType,
        width: a.width,
        height: a.height,
        isImage: true,
      });
    }
  };

  if (file) {
    return (
      <View style={[styles.previewWrap, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
        {file.isImage ? (
          <Image source={{ uri: file.uri }} style={[styles.previewImg, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
        ) : (
          <View style={[styles.pdfPreview, { backgroundColor: '#EF4444' + '18', borderRadius: colors.radius - 4 }]}>
            <MaterialCommunityIcons name="file-pdf-box" size={40} color="#EF4444" />
            <Text style={[styles.pdfName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={2}>{file.name}</Text>
          </View>
        )}
        <View style={styles.previewMeta}>
          <MaterialCommunityIcons name={file.isImage ? 'file-image-outline' : 'file-pdf-box'} size={14} color={colors.mutedForeground} />
          <Text style={[styles.previewText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
            {file.name}
            {file.size ? ` · ${(file.size / 1024).toFixed(0)} KB` : ''}
            {file.width && file.height ? ` · ${file.width}×${file.height}` : ''}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.dropZone, { borderColor: color + '55', backgroundColor: color + '0C', borderRadius: colors.radius }]}>
      <View style={[styles.iconCircle, { backgroundColor: color + '18' }]}>
        <MaterialCommunityIcons name="file-upload-outline" size={32} color={color} />
      </View>
      <Text style={[styles.dropTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{label}</Text>
      <Text style={[styles.dropHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        {accept === 'image' ? 'JPG, PNG, WEBP' : accept === 'pdf' ? 'PDF files only' : 'JPG, PNG, PDF — up to 50 MB'}
      </Text>
      <View style={styles.buttonRow}>
        {(accept === 'image' || accept === 'both') && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: color, borderRadius: colors.radius - 4 }]} onPress={pickImage} activeOpacity={0.85}>
            <MaterialCommunityIcons name="folder-image" size={16} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>Image</Text>
          </TouchableOpacity>
        )}
        {(accept === 'pdf' || accept === 'both') && (
          <TouchableOpacity style={[styles.actionBtn, styles.outlineBtn, { borderColor: color, borderRadius: colors.radius - 4 }]} onPress={pickPdf} activeOpacity={0.85}>
            <MaterialCommunityIcons name="file-pdf-box" size={16} color={color} />
            <Text style={[styles.actionText, { color, fontFamily: 'Inter_600SemiBold' }]}>PDF</Text>
          </TouchableOpacity>
        )}
        {(accept === 'image' || accept === 'both') && (
          <TouchableOpacity style={[styles.actionBtn, styles.outlineBtn, { borderColor: color, borderRadius: colors.radius - 4 }]} onPress={pickCamera} activeOpacity={0.85}>
            <MaterialCommunityIcons name="camera-outline" size={16} color={color} />
            <Text style={[styles.actionText, { color, fontFamily: 'Inter_600SemiBold' }]}>Camera</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dropZone: { borderWidth: 1.5, borderStyle: 'dashed', padding: 24, alignItems: 'center', gap: 6 },
  iconCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  dropTitle: { fontSize: 15 },
  dropHint: { fontSize: 12, textAlign: 'center', marginBottom: 10 },
  buttonRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14 },
  outlineBtn: { borderWidth: 1.5, backgroundColor: 'transparent' },
  actionText: { fontSize: 13 },
  previewWrap: { borderWidth: 1, padding: 10, gap: 8 },
  previewImg: { width: '100%', height: 220, backgroundColor: '#00000008' },
  pdfPreview: { width: '100%', height: 120, alignItems: 'center', justifyContent: 'center', gap: 8 },
  pdfName: { fontSize: 13, textAlign: 'center', paddingHorizontal: 16 },
  previewMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewText: { fontSize: 12, flex: 1 },
});
