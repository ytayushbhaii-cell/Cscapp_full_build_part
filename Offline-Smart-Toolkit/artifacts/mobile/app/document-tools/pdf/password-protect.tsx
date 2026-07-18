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
import { passwordProtectPdf } from '@/lib/features/documents/pdf/pdfService';

const COLOR = '#EF4444';

function getStrength(pwd: string): { label: string; color: string } {
  if (pwd.length === 0) return { label: '', color: 'transparent' };
  if (pwd.length < 8) return { label: 'Weak', color: '#EF4444' };
  if (pwd.length <= 12) return { label: 'Good', color: '#F59E0B' };
  return { label: 'Strong', color: '#22C55E' };
}

export default function PasswordProtectScreen() {
  const colors = useColors();
  const [file, setFile] = useState<DocPickResult | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setPassword('');
    setConfirm('');
    setShowPwd(false);
    setShowConfirm(false);
    setResult(null);
    setError(null);
  };

  const strength = getStrength(password);
  const passwordsMatch = password.length > 0 && password === confirm;
  const canProcess = file && password.length >= 4 && passwordsMatch;

  const process = async () => {
    if (!canProcess) return;
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const uri = await passwordProtectPdf(file!.uri, password);
      setResult(uri);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to protect PDF. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolScreenLayout title="Password Protect" subtitle="Add password to PDF" iconName="lock-outline" color={COLOR} onReset={reset}>
      {error && <StatusBanner type="error" message={error} />}

      <DocUploadWidget file={file} onPicked={setFile} onError={setError} color={COLOR} accept="pdf" label="Upload PDF" />

      {file && !result && (
        <View style={styles.section}>
          {/* Warning */}
          <View style={[styles.warnBox, { backgroundColor: '#F97316' + '14', borderColor: '#F97316' + '40', borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="alert-outline" size={15} color="#F97316" />
            <Text style={[styles.infoText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
              ⚠ Remember your password — there is no recovery option.
            </Text>
          </View>

          {/* Password input */}
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Password</Text>
          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius - 4 }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPwd}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPwd((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name={showPwd ? 'eye-off' : 'eye'} size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Strength indicator */}
          {password.length > 0 && (
            <View style={styles.strengthRow}>
              <View style={[styles.strengthBar, { backgroundColor: colors.muted, borderRadius: 4, flex: 1 }]}>
                <View style={[styles.strengthFill, { width: password.length < 8 ? '33%' : password.length <= 12 ? '66%' : '100%', backgroundColor: strength.color, borderRadius: 4 }]} />
              </View>
              <Text style={[styles.strengthLabel, { color: strength.color, fontFamily: 'Inter_600SemiBold' }]}>{strength.label}</Text>
            </View>
          )}

          {/* Confirm password */}
          <Text style={[styles.label, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Confirm Password</Text>
          <View style={[styles.inputWrap, { borderColor: confirm.length > 0 ? (passwordsMatch ? '#22C55E' : '#EF4444') : colors.border, backgroundColor: colors.card, borderRadius: colors.radius - 4 }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Confirm password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showConfirm}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name={showConfirm ? 'eye-off' : 'eye'} size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          {confirm.length > 0 && !passwordsMatch && (
            <Text style={[styles.matchErr, { color: '#EF4444', fontFamily: 'Inter_400Regular' }]}>Passwords do not match.</Text>
          )}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: canProcess ? COLOR : colors.muted, borderRadius: colors.radius - 2 }]}
            onPress={process}
            disabled={processing || !canProcess}
            activeOpacity={0.85}
          >
            {processing ? <ActivityIndicator color="#fff" size="small" /> : <MaterialCommunityIcons name="lock" size={18} color="#fff" />}
            <Text style={[styles.btnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
              {processing ? 'Protecting…' : 'Protect PDF'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {result && (
        <DocResultActions uri={result} fileName="protected.pdf" color={COLOR} onReset={reset} mimeType="application/pdf" />
      )}
    </ToolScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  label: { fontSize: 13 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { fontSize: 14 },
  warnBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderWidth: 1 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingRight: 12 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  strengthBar: { height: 4 },
  strengthFill: { height: 4 },
  strengthLabel: { fontSize: 12, width: 50 },
  matchErr: { fontSize: 12, marginTop: -4 },
});
