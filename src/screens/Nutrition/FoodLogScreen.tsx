import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/common/ScreenContainer';
import Button from '../../components/common/Button';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppSelector';
import { addLog, updateLog } from '../../store/slices/nutritionSlice';
import { COLORS } from '../../constants';
import { FoodEntry, Meal, NutritionLog } from '../../types';

const DEFAULT_MEALS = [
  { id: 'm1', name: 'Breakfast', timeEaten: '08:00' },
  { id: 'm2', name: 'Lunch', timeEaten: '12:30' },
  { id: 'm3', name: 'Dinner', timeEaten: '18:30' },
];

function dateLabel(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function stepDate(iso: string, delta: number) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().split('T')[0];
}

const todayIso = new Date().toISOString().split('T')[0];

export default function FoodLogScreen() {
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const logs = useAppSelector(s => s.nutrition.logs);

  const [date, setDate] = useState<string>(
    (route.params?.date ?? todayIso).split('T')[0]
  );

  const existing = logs.find(l => l.date.startsWith(date));

  const [meals, setMeals] = useState<Meal[]>(() =>
    existing?.meals ?? DEFAULT_MEALS.map(m => ({ ...m, foods: [] }))
  );
  const [waterMl, setWaterMl] = useState<string>(
    existing?.waterMl != null ? String(existing.waterMl) : ''
  );

  // Food add form state
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [serving, setServing] = useState('100');

  // New meal form
  const [addingMeal, setAddingMeal] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [newMealTime, setNewMealTime] = useState('');

  // When date changes, reload state from store (or defaults)
  function navigateDate(delta: number) {
    const newDate = stepDate(date, delta);
    if (newDate > todayIso) return; // don't go to future
    const newExisting = logs.find(l => l.date.startsWith(newDate));
    setDate(newDate);
    setMeals(newExisting?.meals ?? DEFAULT_MEALS.map(m => ({ ...m, foods: [] })));
    setWaterMl(newExisting?.waterMl != null ? String(newExisting.waterMl) : '');
    setAddingTo(null);
    setAddingMeal(false);
  }

  function clearForm() {
    setFoodName(''); setCalories(''); setProtein('');
    setCarbs(''); setFat(''); setFiber(''); setServing('100');
  }

  function addFood(mealId: string) {
    if (!foodName.trim()) return;
    const entry: FoodEntry = {
      foodId: Date.now().toString(),
      foodName: foodName.trim(),
      servingG: parseFloat(serving) || 100,
      calories: parseFloat(calories) || 0,
      proteinG: parseFloat(protein) || 0,
      carbsG: parseFloat(carbs) || 0,
      fatG: parseFloat(fat) || 0,
      fiberG: parseFloat(fiber) || undefined,
    };
    setMeals(prev => prev.map(m =>
      m.id !== mealId ? m : { ...m, foods: [...m.foods, entry] }
    ));
    clearForm();
    setAddingTo(null);
  }

  function removeFood(mealId: string, foodId: string) {
    setMeals(prev => prev.map(m =>
      m.id !== mealId ? m : { ...m, foods: m.foods.filter(f => f.foodId !== foodId) }
    ));
  }

  function removeMeal(mealId: string) {
    Alert.alert('Remove Meal', 'Delete this meal and all its foods?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setMeals(prev => prev.filter(m => m.id !== mealId)) },
    ]);
  }

  function addMeal() {
    if (!newMealName.trim()) return;
    const meal: Meal = {
      id: `meal-${Date.now()}`,
      name: newMealName.trim(),
      timeEaten: newMealTime || '--:--',
      foods: [],
    };
    setMeals(prev => [...prev, meal]);
    setNewMealName(''); setNewMealTime('');
    setAddingMeal(false);
  }

  const totals = meals.reduce((acc, m) => {
    m.foods.forEach(f => {
      acc.calories += f.calories;
      acc.protein += f.proteinG;
      acc.carbs += f.carbsG;
      acc.fat += f.fatG;
      acc.fiber += f.fiberG ?? 0;
    });
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  function save() {
    const log: NutritionLog = {
      id: existing?.id ?? Date.now().toString(),
      date: new Date(date + 'T12:00:00').toISOString(),
      meals,
      supplements: [],
      totalCalories: Math.round(totals.calories),
      totalProteinG: Math.round(totals.protein),
      totalCarbsG: Math.round(totals.carbs),
      totalFatG: Math.round(totals.fat),
      totalFiberG: totals.fiber > 0 ? Math.round(totals.fiber) : undefined,
      waterMl: waterMl.trim() ? parseFloat(waterMl) : undefined,
    };
    existing ? dispatch(updateLog(log)) : dispatch(addLog(log));
    Alert.alert('Saved', 'Food log saved.');
  }

  const isFuture = date > todayIso;

  return (
    <ScreenContainer>
      {/* Date navigator */}
      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.dateArrow} onPress={() => navigateDate(-1)}>
          <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.dateLabel}>{dateLabel(date)}</Text>
        <TouchableOpacity
          style={[styles.dateArrow, date >= todayIso && styles.dateArrowDisabled]}
          onPress={() => navigateDate(1)}
          disabled={date >= todayIso}
        >
          <Ionicons name="chevron-forward" size={20} color={date >= todayIso ? COLORS.border : COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Totals summary */}
      <View style={styles.totalsCard}>
        <View style={styles.totalsRow}>
          <Total label="Calories" value={Math.round(totals.calories)} color={COLORS.warning} />
          <Total label="Protein" value={`${Math.round(totals.protein)}g`} color={COLORS.primary} />
          <Total label="Carbs" value={`${Math.round(totals.carbs)}g`} color={COLORS.secondary} />
          <Total label="Fat" value={`${Math.round(totals.fat)}g`} color={COLORS.accent} />
          {totals.fiber > 0 && (
            <Total label="Fiber" value={`${Math.round(totals.fiber)}g`} color={COLORS.textMuted} />
          )}
        </View>
      </View>

      {/* Water */}
      <View style={styles.waterCard}>
        <Ionicons name="water-outline" size={18} color={COLORS.primary} />
        <Text style={styles.waterLabel}>Water</Text>
        <TextInput
          style={styles.waterInput}
          value={waterMl}
          onChangeText={setWaterMl}
          placeholder="0"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
        />
        <Text style={styles.waterUnit}>ml</Text>
        <View style={styles.waterBtns}>
          {[250, 500].map(amt => (
            <TouchableOpacity
              key={amt}
              style={styles.waterAdd}
              onPress={() => setWaterMl(v => String((parseFloat(v) || 0) + amt))}
            >
              <Text style={styles.waterAddText}>+{amt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Meal cards */}
      {meals.map(meal => (
        <View key={meal.id} style={styles.mealCard}>
          <View style={styles.mealHeader}>
            <View style={styles.mealHeaderLeft}>
              <Text style={styles.mealName}>{meal.name}</Text>
              {meal.timeEaten !== '--:--' && (
                <Text style={styles.mealTime}>{meal.timeEaten}</Text>
              )}
            </View>
            <View style={styles.mealHeaderRight}>
              <TouchableOpacity
                style={styles.mealAddBtn}
                onPress={() => { setAddingTo(addingTo === meal.id ? null : meal.id); clearForm(); }}
              >
                <Ionicons name="add" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              {!DEFAULT_MEALS.some(d => d.id === meal.id) && (
                <TouchableOpacity onPress={() => removeMeal(meal.id)} style={styles.mealDeleteBtn}>
                  <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {meal.foods.length > 0 && (
            <View style={styles.foodList}>
              {meal.foods.map(food => (
                <View key={food.foodId} style={styles.foodRow}>
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{food.foodName}</Text>
                    <Text style={styles.foodMacros}>
                      {food.servingG}g · {Math.round(food.calories)} kcal · P {food.proteinG}g · C {food.carbsG}g · F {food.fatG}g
                      {food.fiberG != null ? ` · Fiber ${food.fiberG}g` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeFood(meal.id, food.foodId)}>
                    <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {meal.foods.length === 0 && addingTo !== meal.id && (
            <Text style={styles.emptyMeal}>No foods logged · tap + to add</Text>
          )}

          {addingTo === meal.id && (
            <View style={styles.addForm}>
              <TextInput
                style={styles.input}
                value={foodName}
                onChangeText={setFoodName}
                placeholder="Food name"
                placeholderTextColor={COLORS.textMuted}
                autoFocus
              />
              <View style={styles.macroInputRow}>
                <MacroInput value={calories} onChange={setCalories} placeholder="kcal" />
                <MacroInput value={protein} onChange={setProtein} placeholder="P(g)" />
                <MacroInput value={carbs} onChange={setCarbs} placeholder="C(g)" />
                <MacroInput value={fat} onChange={setFat} placeholder="F(g)" />
              </View>
              <View style={styles.macroInputRow}>
                <MacroInput value={serving} onChange={setServing} placeholder="serving(g)" />
                <MacroInput value={fiber} onChange={setFiber} placeholder="fiber(g)" />
                <View style={{ flex: 2 }} />
              </View>
              <View style={styles.addFormBtns}>
                <Button title="Add" onPress={() => addFood(meal.id)} size="sm" style={{ flex: 1 }} />
                <Button title="Cancel" onPress={() => { setAddingTo(null); clearForm(); }} size="sm" variant="ghost" style={{ flex: 1 }} />
              </View>
            </View>
          )}
        </View>
      ))}

      {/* Add meal */}
      {addingMeal ? (
        <View style={styles.addMealForm}>
          <Text style={styles.addMealTitle}>New Meal</Text>
          <TextInput
            style={styles.input}
            value={newMealName}
            onChangeText={setNewMealName}
            placeholder="Meal name (e.g. Snack, Pre-workout)"
            placeholderTextColor={COLORS.textMuted}
            autoFocus
          />
          <TextInput
            style={styles.input}
            value={newMealTime}
            onChangeText={setNewMealTime}
            placeholder="Time (e.g. 15:30)"
            placeholderTextColor={COLORS.textMuted}
          />
          <View style={styles.addFormBtns}>
            <Button title="Add Meal" onPress={addMeal} size="sm" style={{ flex: 1 }} />
            <Button title="Cancel" onPress={() => { setAddingMeal(false); setNewMealName(''); setNewMealTime(''); }} size="sm" variant="ghost" style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addMealBtn} onPress={() => setAddingMeal(true)}>
          <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
          <Text style={styles.addMealBtnText}>Add Meal / Snack</Text>
        </TouchableOpacity>
      )}

      <Button title="Save Log" onPress={save} size="lg" style={styles.saveBtn} />
    </ScreenContainer>
  );
}

function MacroInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <TextInput
      style={[styles.input, styles.macroInput]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textMuted}
      keyboardType="decimal-pad"
    />
  );
}

function Total({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={styles.totalItem}>
      <Text style={[styles.totalValue, { color }]}>{value}</Text>
      <Text style={styles.totalLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  dateArrow: { padding: 8 },
  dateArrowDisabled: { opacity: 0.3 },
  dateLabel: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  totalsCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 12 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  totalItem: { alignItems: 'center' },
  totalValue: { fontSize: 18, fontWeight: '800' },
  totalLabel: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  waterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  waterLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  waterInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 70,
    textAlign: 'right',
  },
  waterUnit: { color: COLORS.textMuted, fontSize: 13 },
  waterBtns: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  waterAdd: {
    backgroundColor: COLORS.primary + '22',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  waterAddText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  mealCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 10 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mealHeaderLeft: { flex: 1 },
  mealHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mealName: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  mealTime: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  mealAddBtn: { padding: 4 },
  mealDeleteBtn: { padding: 4 },
  foodList: { gap: 0 },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  foodInfo: { flex: 1 },
  foodName: { color: COLORS.text, fontSize: 14, fontWeight: '500' },
  foodMacros: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  emptyMeal: { color: COLORS.textMuted, fontSize: 12, fontStyle: 'italic', paddingVertical: 4 },
  addForm: { marginTop: 10, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  addFormBtns: { flexDirection: 'row', gap: 8 },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    color: COLORS.text,
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  macroInputRow: { flexDirection: 'row', gap: 6 },
  macroInput: { flex: 1, textAlign: 'center', fontSize: 12 },
  addMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  addMealBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  addMealForm: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  addMealTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  saveBtn: { marginTop: 4, marginBottom: 24 },
});
