import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import Button from '../../components/common/Button';
import { useAppDispatch } from '../../hooks/useAppSelector';
import { addDocument } from '../../store/slices/medicalSlice';
import { COLORS } from '../../constants';
import { MedicalDocument } from '../../types';

export default function UploadDocumentScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const [picked, setPicked] = useState<{ name: string; uri: string; type: 'pdf' | 'image' | 'other' } | null>(null);
  const [processing, setProcessing] = useState(false);

  async function pickDocument() {
    try {
      // DocumentPicker import is deferred to avoid breaking without native modules in dev
      const DocumentPicker = require('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const ext = asset.name?.split('.').pop()?.toLowerCase();
        const type = ext === 'pdf' ? 'pdf' : ['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(ext ?? '') ? 'image' : 'other';
        setPicked({ name: asset.name ?? 'document', uri: asset.uri, type });
      }
    } catch (e) {
      Alert.alert('Error', 'Could not pick document.');
    }
  }

  async function upload() {
    if (!picked) return;
    setProcessing(true);
    // Simulate AI processing delay
    await new Promise(r => setTimeout(r, 1500));

    const doc: MedicalDocument = {
      id: Date.now().toString(),
      uploadDate: new Date().toISOString(),
      fileName: picked.name,
      fileType: picked.type,
      fileUri: picked.uri,
      summary: 'Document uploaded. AI analysis pending — connect ANTHROPIC_API_KEY to enable automatic summarisation and restriction extraction.',
      extractedConditions: [],
      extractedRestrictions: [],
      recommendations: [],
    };

    dispatch(addDocument(doc));
    setProcessing(false);
    navigation.goBack();
  }

  return (
    <ScreenContainer>
      <Text style={styles.heading}>Upload Medical Document</Text>
      <Text style={styles.sub}>
        Upload lab reports, imaging results, doctor's notes, or any medical record. AI will extract relevant workout restrictions and quality-of-life recommendations.
      </Text>

      {/* Supported types */}
      <View style={styles.typesRow}>
        <TypeChip icon="document-text" label="PDF" />
        <TypeChip icon="image" label="Image" />
        <TypeChip icon="medkit" label="Lab Report" />
      </View>

      {/* Drop zone */}
      <View style={styles.dropZone}>
        {picked ? (
          <>
            <Ionicons name={picked.type === 'pdf' ? 'document-text' : 'image'} size={48} color={COLORS.primary} />
            <Text style={styles.pickedName}>{picked.name}</Text>
            <Text style={styles.pickedType}>{picked.type.toUpperCase()}</Text>
          </>
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.dropText}>Tap to select a file</Text>
            <Text style={styles.dropSub}>PDF, JPG, PNG supported</Text>
          </>
        )}
      </View>

      <Button title={picked ? 'Change File' : 'Select File'} onPress={pickDocument} variant="secondary" />

      {picked && (
        <Button title="Upload & Analyse" onPress={upload} loading={processing} size="lg" style={styles.uploadBtn} />
      )}

      {/* AI info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>How AI Analysis Works</Text>
        <Text style={styles.infoText}>
          Once uploaded, Claude AI reads your document and:{'\n'}
          {'  '}• Summarises the medical content in plain language{'\n'}
          {'  '}• Identifies conditions and diagnoses{'\n'}
          {'  '}• Flags workout restrictions and contraindications{'\n'}
          {'  '}• Generates quality-of-life recommendations{'\n\n'}
          Restrictions are automatically applied to your Exercise Library and Workout Builder.
        </Text>
      </View>
    </ScreenContainer>
  );
}

function TypeChip({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.typeChip}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
      <Text style={styles.typeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { color: COLORS.text, fontSize: 22, fontWeight: '800', marginBottom: 8 },
  sub: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 20 },
  typesRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  typeChip: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, alignItems: 'center', gap: 6 },
  typeLabel: { color: COLORS.textMuted, fontSize: 12 },
  dropZone: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', marginBottom: 16, gap: 8 },
  dropText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  dropSub: { color: COLORS.textMuted, fontSize: 13 },
  pickedName: { color: COLORS.text, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  pickedType: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  uploadBtn: { marginTop: 12 },
  infoBox: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginTop: 24 },
  infoTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  infoText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
});
