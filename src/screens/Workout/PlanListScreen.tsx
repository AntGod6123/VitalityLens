import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { deletePlan, activatePlan, deactivatePlan } from '../../store/slices/planSlice';
import { COLORS } from '../../constants';
import { WorkoutPlan } from '../../types';

const GOAL_COLORS: Record<string, string> = {
  strength: COLORS.primary,
  hypertrophy: COLORS.secondary,
  endurance: COLORS.accent,
  weight_loss: COLORS.warning,
};

export default function PlanListScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const plans = useAppSelector(s => s.plan.plans);

  function confirmDelete(plan: WorkoutPlan) {
    Alert.alert('Delete Plan', `Delete "${plan.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deletePlan(plan.id)) },
    ]);
  }

  function toggleActive(plan: WorkoutPlan) {
    if (plan.isActive) {
      dispatch(deactivatePlan(plan.id));
    } else {
      dispatch(activatePlan({ id: plan.id, startDate: new Date().toISOString() }));
    }
  }

  return (
    <ScreenContainer>
      <Button
        title="+ Create New Plan"
        onPress={() => navigation.navigate('WorkoutBuilder')}
        size="lg"
        style={{ marginBottom: 16 }}
      />

      {plans.length === 0 ? (
        <EmptyState
          icon="clipboard-outline"
          title="No plans yet"
          subtitle="Use the builder to generate a personalised training plan."
        />
      ) : (
        plans.map(plan => {
          const goalColor = GOAL_COLORS[plan.goal] ?? COLORS.primary;
          return (
            <View key={plan.id} style={[styles.card, plan.isActive && styles.cardActive]}>
              {plan.isActive && (
                <View style={styles.activeBanner}>
                  <Ionicons name="flash" size={12} color="#fff" />
                  <Text style={styles.activeBannerText}>ACTIVE</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.cardBody}
                onPress={() => navigation.navigate('PlanDetail', { planId: plan.id })}
                activeOpacity={0.8}
              >
                <View style={styles.cardLeft}>
                  <Text style={styles.cardName}>{plan.name}</Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.badge, { backgroundColor: goalColor + '22' }]}>
                      <Text style={[styles.badgeText, { color: goalColor }]}>{plan.goal.replace('_', ' ')}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: COLORS.border }]}>
                      <Text style={[styles.badgeText, { color: COLORS.textMuted }]}>{plan.split.replace(/_/g, ' ')}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardMeta}>{plan.days.filter(d => !d.isRest).length} training days · {plan.days.length}-day cycle</Text>
                  {plan.description ? <Text style={styles.cardDesc}>{plan.description}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, plan.isActive ? styles.deactivateBtn : styles.activateBtn]}
                  onPress={() => toggleActive(plan)}
                >
                  <Ionicons
                    name={plan.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                    size={15}
                    color={plan.isActive ? COLORS.textMuted : COLORS.primary}
                  />
                  <Text style={[styles.actionBtnText, { color: plan.isActive ? COLORS.textMuted : COLORS.primary }]}>
                    {plan.isActive ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(plan)}>
                  <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                  <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardActive: { borderColor: COLORS.primary + '60' },
  activeBanner: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  activeBannerText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  cardBody: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  cardLeft: { flex: 1 },
  cardName: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  badge: { borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  cardMeta: { color: COLORS.textMuted, fontSize: 12 },
  cardDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 16,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  activateBtn: {},
  deactivateBtn: {},
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 'auto' },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
});
