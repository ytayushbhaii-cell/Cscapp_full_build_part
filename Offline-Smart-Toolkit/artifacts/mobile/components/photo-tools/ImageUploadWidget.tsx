import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { PickedImage } from '@/lib/photoTools/types';
import { MAX_IMAGE_BYTES, SUPPORTED_IMAGE_EXTENSIONS } from '@/lib/photoTools/types';

interface ImageUploadWidgetProps {
  image: PickedImage | null;
  onPicked: (image: PickedImage) => void;
  onError: (message: string) => void;
  color: string;
  label?: string;
}

function extOf(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

/**
 * Reusable upload area used by every Photo Tools screen: browse (gallery) +
 * camera import, format/size validation and a thumbnail preview. Ready for
 * drag & drop on web (native <input capture> isn't exposed by expo-image-picker,
 * but tapping "Browse" opens the OS file/gallery picker either way).
 */
export function ImageUploadWidget({ image, onPicked, onError, color, label = 'Upload a photo' }: ImageUploadWidgetProps) {
  const colors = useColors();

  const validateAndEmit = (asset: ImagePicker.ImagePickerAsset) => {
    const fileName = asset.fileName || `photo-${Date.now()}.jpg`;
    const ext = extOf(fileName) || 'jpg';
    if (!SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) {
      onError(`Unsupported format ".${ext}". Use JPG, JPEG, PNG, WEBP or BMP.`);
      return;
    }
    if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
      onError('That image is larger than 25 MB. Please choose a smaller file.');
      return;
    }
    onPicked({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      fileName,
      mimeType: asset.mimeType,
      fileSize: asset.fileSize,
    });
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onError('Gallery access was denied. Enable photo permissions to continue.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      exif: false,
    });
    if (!result.canceled && result.assets?.[0]) validateAndEmit(result.assets[0]);
  };

  const pickFromCamera = async () => {
    if (Platform.OS === 'web') {
      onError('Camera capture is not available on web preview — use Browse instead.');
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      onError('Camera access was denied. Enable camera permissions to continue.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!result.canceled && result.assets?.[0]) validateAndEmit(result.assets[0]);
  };

  if (image) {
    return (
      <View style={[styles.previewWrap, { borderColor: colors.border, borderRadius: colors.radius, backgroundColor: colors.card }]}>
        <Image source={{ uri: image.uri }} style={[styles.previewImg, { borderRadius: colors.radius - 4 }]} resizeMode="contain" />
        <View style={styles.previewMeta}>
          <MaterialCommunityIcons name="file-image-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.previewText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
            {image.fileName} · {image.width}×{image.height}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.dropZone,
        { borderColor: color + '55', backgroundColor: color + '0C', borderRadius: colors.radius },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: color + '18' }]}>
        <MaterialCommunityIcons name="cloud-upload-outline" size={30} color={color} />
      </View>
      <Text style={[styles.dropTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{label}</Text>
      <Text style={[styles.dropHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        JPG, JPEG, PNG, WEBP or BMP · up to 25 MB
      </Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: color, borderRadius: colors.radius - 4 }]}
          onPress={pickFromLibrary}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="folder-image" size={17} color="#fff" />
          <Text style={[styles.actionText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>Browse File</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.outlineBtn, { borderColor: color, borderRadius: colors.radius - 4 }]}
          onPress={pickFromCamera}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="camera-outline" size={17} color={color} />
          <Text style={[styles.actionText, { color, fontFamily: 'Inter_600SemiBold' }]}>Camera</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dropZone: { borderWidth: 1.5, borderStyle: 'dashed', padding: 24, alignItems: 'center', gap: 6 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  dropTitle: { fontSize: 15 },
  dropHint: { fontSize: 12, textAlign: 'center', marginBottom: 10 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14 },
  outlineBtn: { borderWidth: 1.5, backgroundColor: 'transparent' },
  actionText: { fontSize: 13 },
  previewWrap: { borderWidth: 1, padding: 10, gap: 8 },
  previewImg: { width: '100%', height: 260, backgroundColor: '#00000008' },
  previewMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewText: { fontSize: 12, flex: 1 },
});
