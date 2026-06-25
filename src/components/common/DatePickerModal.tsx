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

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  minDate?: Date;
  maxDate?: Date;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function DatePickerModal({ value, onChange, label, minDate, maxDate }: Props) {
  const [visible, setVisible] = useState(false);
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [selected, setSelected] = useState(new Date(value));

  const today = maxDate ?? new Date();
  const minY = minDate?.getFullYear() ?? 1990;

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    if (nextY > today.getFullYear() || (nextY === today.getFullYear() && nextM > today.getMonth())) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function selectDay(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    if (minDate && d < minDate) return;
    if (d > today) return;
    setSelected(d);
  }

  function confirm() {
    onChange(selected);
    setVisible(false);
  }

  function open() {
    setSelected(new Date(value));
    setViewYear(value.getFullYear());
    setViewMonth(value.getMonth());
    setVisible(true);
  }

  const numDays = daysInMonth(viewYear, viewMonth);
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const days: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: numDays }, (_, i) => i + 1)];

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={open}>
        <Text style={styles.triggerText}>
          {label ? `${label}: ` : ''}{value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>
            {/* Month/year navigation */}
            <View style={styles.navRow}>
              <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="chevron-back" size={22} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{MONTH_FULL[viewMonth]} {viewYear}</Text>
              <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="chevron-forward" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Day-of-week headers */}
            <View style={styles.dowRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <Text key={d} style={styles.dowText}>{d}</Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.grid}>
              {days.map((day, idx) => {
                if (!day) return <View key={`e${idx}`} style={styles.dayCell} />;
                const cellDate = new Date(viewYear, viewMonth, day);
                const isSelected = selected.getDate() === day && selected.getMonth() === viewMonth && selected.getFullYear() === viewYear;
                const isToday = cellDate.toDateString() === new Date().toDateString();
                const disabled = cellDate > today || (minDate ? cellDate < minDate : false);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayCell, isSelected && styles.dayCellSelected, isToday && !isSelected && styles.dayCellToday]}
                    onPress={() => !disabled && selectDay(day)}
                    activeOpacity={disabled ? 1 : 0.7}
                  >
                    <Text style={[styles.dayText, isSelected && styles.dayTextSelected, disabled && styles.dayTextDisabled]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirm}>
                <Text style={styles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const CELL = 40;

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  triggerText: { color: COLORS.text, fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: COLORS.border },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  monthLabel: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  dowRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  dowText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', width: CELL, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center', borderRadius: CELL / 2, marginBottom: 4 },
  dayCellSelected: { backgroundColor: COLORS.primary },
  dayCellToday: { borderWidth: 1, borderColor: COLORS.primary },
  dayText: { color: COLORS.text, fontSize: 14 },
  dayTextSelected: { color: '#fff', fontWeight: '700' },
  dayTextDisabled: { color: COLORS.border },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  cancelText: { color: COLORS.textMuted, fontSize: 15 },
  confirmBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
