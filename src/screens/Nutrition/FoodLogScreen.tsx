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

export default function FoodLogScreen() {
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const date = route.params?.date ?? new Date().toISOString().split('T')[0];
  const logs = useAppSelector(s => s.nutrition.logs);
  const existing = logs.find(l => l.date.startsWith(date));

  const [meals, setMeals] = useState<Meal[]>(existing?.meals ?? [
    { id: '1', name: 'Breakfast', timeEaten: '08:00', foods: [] },
    { id: '2', name: 'Lunch', timeEaten: '12:30', foods: [] },
    { id: '3', name: 'Dinner', timeEaten: '18:00', foods: [] },
  ]);

  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [serving, setServing] = useState('100');

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
    };
    setMeals(prev => prev.map(m =>
      m.id !== mealId ? m : { ...m, foods: [...m.foods, entry] }
    ));
    setFoodName(''); setCalories(''); setProtein(''); setCarbs(''); setFat(''); setServing('100');
    setAddingTo(null);
  }

  function removeFood(mealId: string, foodId: string) {
    setMeals(prev => prev.map(m =>
      m.id !== mealId ? m : { ...m, foods: m.foods.filter(f => f.foodId !== foodId) }
    ));
  }

  const totals = meals.reduce((acc, m) => {
    m.foods.forEach(f => {
      acc.calories += f.calories;
      acc.protein += f.proteinG;
      acc.carbs += f.carbsG;
      acc.fat += f.fatG;
    });
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  function save() {
    const log: NutritionLog = {
      id: existing?.id ?? Date.now().toString(),
      date: new Date(date).toISOString(),
      meals,
      supplements: [],
      totalCalories: Math.round(totals.calories),
      totalProteinG: Math.round(totals.protein),
      totalCarbsG: Math.round(totals.carbs),
      totalFatG: Math.round(totals.fat),
    };
    existing ? dispatch(updateLog(log)) : dispatch(addLog(log));
    Alert.alert('Saved', 'Food log saved.');
  }

  return (
    <ScreenContainer>
      {/* Totals */}
      <View style={styles.totalsCard}>
        <Text style={styles.totalsTitle}>{new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
        <View style={styles.totalsRow}>
          <Total label="Calories" value={Math.round(totals.calories)} color={COLORS.warning} />
          <Total label="Protein" value={`${Math.round(totals.protein)}g`} color={COLORS.primary} />
          <Total label="Carbs" value={`${Math.round(totals.carbs)}g`} color={COLORS.secondary} />
          <Total label="Fat" value={`${Math.round(totals.fat)}g`} color={COLORS.accent} />
        </View>
      </View>

      {/* Meals */}
      {meals.map(meal => (
        <View key={meal.id} style={styles.mealCard}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealName}>{meal.name}</Text>
            <TouchableOpacity onPress={() => setAddingTo(addingTo === meal.id ? null : meal.id)}>
              <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {meal.foods.map(food => (
            <View key={food.foodId} style={styles.foodRow}>
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{food.foodName}</Text>
                <Text style={styles.foodMacros}>{food.servingG}g · {food.calories}kcal · P:{food.proteinG}g C:{food.carbsG}g F:{food.fatG}g</Text>
              </View>
              <TouchableOpacity onPress={() => removeFood(meal.id, food.foodId)}>
                <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}

          {addingTo === meal.id && (
            <View style={styles.addForm}>
              <TextInput style={styles.input} value={foodName} onChangeText={setFoodName} placeholder="Food name" placeholderTextColor={COLORS.textMuted} />
              <View style={styles.macroInputRow}>
                <TextInput style={[styles.input, styles.macroInput]} value={calories} onChangeText={setCalories} placeholder="kcal" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                <TextInput style={[styles.input, styles.macroInput]} value={protein} onChangeText={setProtein} placeholder="P(g)" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                <TextInput style={[styles.input, styles.macroInput]} value={carbs} onChangeText={setCarbs} placeholder="C(g)" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                <TextInput style={[styles.input, styles.macroInput]} value={fat} onChangeText={setFat} placeholder="F(g)" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
              </View>
              <Button title="Add Food" onPress={() => addFood(meal.id)} size="sm" />
            </View>
          )}
        </View>
      ))}

      <Button title="Save Log" onPress={save} size="lg" style={styles.saveBtn} />
    </ScreenContainer>
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
  totalsCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 16 },
  totalsTitle: { color: COLORS.textMuted, fontSize: 13, marginBottom: 12 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalItem: { alignItems: 'center' },
  totalValue: { fontSize: 20, fontWeight: '800' },
  totalLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  mealCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 12 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  mealName: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  foodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  foodInfo: { flex: 1 },
  foodName: { color: COLORS.text, fontSize: 14 },
  foodMacros: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  addForm: { marginTop: 12, gap: 8 },
  input: { backgroundColor: COLORS.surfaceLight, borderRadius: 8, color: COLORS.text, fontSize: 14, paddingHorizontal: 10, paddingVertical: 8 },
  macroInputRow: { flexDirection: 'row', gap: 8 },
  macroInput: { flex: 1 },
  saveBtn: { marginTop: 8, marginBottom: 24 },
});
