import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import SectionHeader from '../../components/common/SectionHeader';
import EmptyState from '../../components/common/EmptyState';
import { useAppSelector } from '../../hooks/useAppSelector';
import { COLORS } from '../../constants';

export default function MedicalHomeScreen() {
  const navigation = useNavigation<any>();
  const documents = useAppSelector(s => s.medical.documents);
  const injuries = useAppSelector(s => s.medical.injuries);
  const activeInjuries = injuries.filter(i => i.isActive);

  return (
    <ScreenContainer>
      {/* Quick actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('UploadDocument')}>
          <Ionicons name="document-text" size={32} color={COLORS.primary} />
          <Text style={styles.actionLabel}>Upload Document</Text>
          <Text style={styles.actionSub}>Medical records, lab results</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('InjuryDashboard')}>
          <Ionicons name="bandage" size={32} color={COLORS.danger} />
          <Text style={styles.actionLabel}>Injury Dashboard</Text>
          <Text style={styles.actionSub}>{activeInjuries.length} active</Text>
        </TouchableOpacity>
      </View>

      {/* Active injuries summary */}
      {activeInjuries.length > 0 && (
        <>
          <SectionHeader title="Active Injuries" action={{ label: 'Manage', onPress: () => navigation.navigate('InjuryDashboard') }} />
          {activeInjuries.map(inj => (
            <View key={inj.id} style={[styles.injuryCard, styles[inj.severity]]}>
              <View style={styles.injuryLeft}>
                <Text style={styles.injuryPart}>{inj.bodyPart}</Text>
                <Text style={styles.injuryDesc} numberOfLines={2}>{inj.description}</Text>
                {inj.expectedRecoveryDate && (
                  <Text style={styles.injuryDate}>Est. recovery: {new Date(inj.expectedRecoveryDate).toLocaleDateString()}</Text>
                )}
              </View>
              <View style={[styles.severityBadge, severityStyle(inj.severity)]}>
                <Text style={[styles.severityText, { color: severityColor(inj.severity) }]}>{inj.severity}</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {/* Documents */}
      <SectionHeader title="Medical Documents" action={{ label: 'Upload', onPress: () => navigation.navigate('UploadDocument') }} />
      {documents.length === 0 ? (
        <EmptyState icon="document-outline" title="No documents" subtitle="Upload medical records to get AI-powered workout restriction analysis." />
      ) : (
        documents.map(doc => (
          <TouchableOpacity key={doc.id} style={styles.docCard} onPress={() => navigation.navigate('DocumentDetail', { documentId: doc.id })}>
            <Ionicons name={doc.fileType === 'pdf' ? 'document-text' : 'image'} size={28} color={COLORS.primary} />
            <View style={styles.docInfo}>
              <Text style={styles.docName}>{doc.fileName}</Text>
              <Text style={styles.docDate}>{new Date(doc.uploadDate).toLocaleDateString()}</Text>
              {doc.summary && <Text style={styles.docSummary} numberOfLines={2}>{doc.summary}</Text>}
            </View>
            {doc.processedAt ? (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.secondary} />
            ) : (
              <Ionicons name="time-outline" size={20} color={COLORS.textMuted} />
            )}
          </TouchableOpacity>
        ))
      )}
    </ScreenContainer>
  );
}

function severityColor(severity: string) {
  return { mild: COLORS.warning, moderate: COLORS.accent, severe: COLORS.danger }[severity] ?? COLORS.textMuted;
}

function severityStyle(severity: string) {
  const color = severityColor(severity);
  return { backgroundColor: color + '22' };
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  actionCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, alignItems: 'center', gap: 6 },
  actionLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  actionSub: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center' },
  injuryCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  mild: {},
  moderate: {},
  severe: { borderWidth: 1, borderColor: COLORS.danger + '44' },
  injuryLeft: { flex: 1, marginRight: 10 },
  injuryPart: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  injuryDesc: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  injuryDate: { color: COLORS.textMuted, fontSize: 11, marginTop: 6 },
  severityBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  severityText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  docCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  docInfo: { flex: 1 },
  docName: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  docDate: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  docSummary: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
});
