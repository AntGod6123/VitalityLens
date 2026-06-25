import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants';
import { useAppSelector } from '../../hooks/useAppSelector';

interface Props {
  title: string;
  body: string;
  size?: number;
  color?: string;
}

export default function InfoButton({ title, body, size = 15, color }: Props) {
  const showInfoIcons = useAppSelector(s => s.user.profile?.showInfoIcons ?? true);
  const [visible, setVisible] = useState(false);

  if (!showInfoIcons) return null;

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.btn}
      >
        <Ionicons
          name="information-circle-outline"
          size={size}
          color={color ?? COLORS.textMuted}
        />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>
            <View style={styles.header}>
              <Ionicons name="information-circle" size={18} color={COLORS.primary} />
              <Text style={styles.title}>{title}</Text>
            </View>
            <Text style={styles.body}>{body}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setVisible(false)}>
              <Text style={styles.closeBtnText}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: { justifyContent: 'center', alignItems: 'center' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { color: COLORS.text, fontSize: 16, fontWeight: '700', flex: 1 },
  body: { color: COLORS.textMuted, fontSize: 14, lineHeight: 20 },
  closeBtn: {
    marginTop: 18,
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  closeBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
