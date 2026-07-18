import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { ToolScreenLayout } from '@/components/photo-tools/ToolScreenLayout';
import { StatusBanner } from '@/components/photo-tools/StatusBanner';
import { DocUploadWidget } from '@/components/document-tools/DocUploadWidget';
import type { DocPickResult } from '@/components/document-tools/DocUploadWidget';
import { DocResultActions } from '@/components/document-tools/DocResultActions';
import { removePasswordFromPdf } from '@/lib/features/documents/pdf/pdfService';

const COLOR = '#EF4444';

export default function RemovePasswordScreen() {
  const colors = useColors();
  const [file, setFile] = useState<DocPickResult | null>(null);
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setPassword('');
    setShowPwd(false);
    setResult(null);
    setError(null);
  };

  const handleFilePicked = (picked: DocPickResult) => {
    setFile(picked);
    setResult(null);
    setError(null);
  };

  const process = async () => {
    if (!file || !password) return;
    setProcessing(true);
    setError(null);
    try {
      const uri = await removePasswordFromPdf(file.uri, password);
      setResult(uri);
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('password') || msg.toLowerCase().includes('encrypted')) {
        setError('Incorrect password. Please check and try again.');
      } else {
        setError(msg || 'Failed to remove password. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Remove Password" subtitle="Unlock a password-protected PDF" iconName="lock-open-variant-outline" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      <DocUploadWidget file={file} onPicked={handleFilePicked} onError={setError} color={COLOR} accept="pdf" label="Upload PDF" />

      {file && !result && (
        <View style={styles.section}>
          <View style={[styles.infoBox, { backgroundColor: COLOR + '12', borderColor: COLOR + '30', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="information-outline" size={15} color={COLOR} />
            <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              Enter the current password to save an unprotected copy of the PDF.
            </Text>
          </View>

          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Current Password</Text>
          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius - 4 }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter current password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPwd}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPwd((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name={showPwd ? 'eye-off' : 'eye'} size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: password.length === 0 ? colors.muted : COLOR, borderRadius: colors.radius - 2 }]}
            onPress={process}
            disabled={processing || !password}
            activeOpacity={0.85}
          >
            {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="lock-open-variant" size={18} color="#fff" />}
            <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {processing ? 'Unlocking…' : 'Remove Password'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {result && (
        <DocResultActions uri={result} fileName="unlocked.pdf" color={COLOR} onReset={reset} mimeType="application/pdf" />
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  label: { fontSize: 13 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingRight: 12 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14 },
});
