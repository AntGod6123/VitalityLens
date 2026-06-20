import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import Button from '../../components/common/Button';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppSelector';
import { deleteDocument } from '../../store/slices/medicalSlice';
import { COLORS } from '../../constants';

export default function DocumentDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const doc = useAppSelector(s => s.medical.documents.find(d => d.id === route.params?.documentId));

  if (!doc) return null;

  function remove() {
    Alert.alert('Delete Document', 'This will permanently delete this document.', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { dispatch(deleteDocument(doc.id)); navigation.goBack(); } },
    ]);
  }

  return (
    <ScreenContainer>
      <View style={styles.fileRow}>
        <Ionicons name={doc.fileType === 'pdf' ? 'document-text' : 'image'} size={40} color={COLORS.primary} />
        <View style={styles.fileInfo}>
          <Text style={styles.fileName}>{doc.fileName}</Text>
          <Text style={styles.fileMeta}>{doc.fileType.toUpperCase()} · Uploaded {new Date(doc.uploadDate).toLocaleDateString()}</Text>
        </View>
      </View>

      {/* AI Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Summary</Text>
        <Text style={styles.summaryText}>{doc.summary ?? 'Not yet processed.'}</Text>
      </View>

      {/* Conditions */}
      {(doc.extractedConditions?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identified Conditions</Text>
          {doc.extractedConditions!.map((c, i) => (
            <View key={i} style={styles.listRow}>
              <View style={styles.dot} />
              <Text style={styles.listText}>{c}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Restrictions */}
      {(doc.extractedRestrictions?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Restrictions</Text>
          {doc.extractedRestrictions!.map((r, i) => (
            <View key={i} style={[styles.listRow, styles.restrictionRow]}>
              <Ionicons name="warning" size={14} color={COLORS.danger} style={{ marginRight: 8 }} />
              <Text style={[styles.listText, { color: COLORS.danger }]}>{r}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recommendations */}
      {(doc.recommendations?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          {doc.recommendations!.map((r, i) => (
            <View key={i} style={styles.listRow}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.secondary} style={{ marginRight: 8 }} />
              <Text style={styles.listText}>{r}</Text>
            </View>
          ))}
        </View>
      )}

      <Button title="Delete Document" onPress={remove} variant="danger" style={styles.deleteBtn} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 20 },
  fileInfo: { flex: 1 },
  fileName: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  fileMeta: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  summaryText: { color: COLORS.text, fontSize: 14, lineHeight: 20, backgroundColor: COLORS.surface, borderRadius: 10, padding: 14 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  restrictionRow: { backgroundColor: COLORS.danger + '11', borderRadius: 8, padding: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.secondary, marginRight: 10, marginTop: 6 },
  listText: { color: COLORS.text, fontSize: 14, flex: 1, lineHeight: 20 },
  deleteBtn: { marginTop: 12, backgroundColor: COLORS.danger, borderColor: COLORS.danger },
});
