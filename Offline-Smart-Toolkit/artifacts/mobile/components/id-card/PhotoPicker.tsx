// ─── Photo Picker for ID Card ─────────────────────────────────────────────────
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';

interface PhotoPickerProps {
  uri: string | null;
  onPicked: (uri: string) => void;
  onClear: () => void;
  label?: string;
  size?: number;
  accent?: string;
  shape?: 'square' | 'rounded' | 'circle';
}

export function PhotoPicker({
  uri,
  onPicked,
  onClear,
  label = 'Add Photo',
  size = 90,
  accent = '#1D4ED8',
  shape = 'rounded',
}: PhotoPickerProps) {
  const colors = useColors();

  const borderRadius =
    shape === 'circle' ? size / 2 : shape === 'square' ? 4 : colors.radius;

  const pick = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo library access to pick a photo.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      onPicked(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        onPress={pick}
        activeOpacity={0.8}
        style={[
          styles.box,
          {
            width: size,
            height: size * 1.3,
            borderRadius,
            borderColor: uri ? 'transparent' : accent + '60',
            backgroundColor: uri ? 'transparent' : accent + '10',
          },
        ]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: size, height: size * 1.3, borderRadius }}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <MaterialCommunityIcons name="camera-plus-outline" size={28} color={accent} />
            <Text style={[styles.label, { color: accent, fontFamily: 'Inter_500Medium' }]}>
              {label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      {uri && (
        <TouchableOpacity onPress={onClear} style={[styles.clearBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="close" size={12} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', alignSelf: 'flex-start' },
  box: { borderWidth: 2, borderStyle: 'dashed', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  placeholder: { alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  label: { fontSize: 10, textAlign: 'center' },
  clearBtn: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, elevation: 2,
  },
});
