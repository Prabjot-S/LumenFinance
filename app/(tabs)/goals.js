import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const GOAL_TYPES = [
  { label: "Emergency", icon: "shield-checkmark-outline", color: "#4ade80" },
  { label: "Travel", icon: "airplane-outline", color: "#fbbf24" },
  { label: "Investing", icon: "trending-up-outline", color: "#6C63FF" },
  { label: "Home", icon: "home-outline", color: "#38bdf8" },
  { label: "Car", icon: "car-outline", color: "#4ECDC4" },
  { label: "Education", icon: "school-outline", color: "#fb923c" },
  { label: "Other", icon: "flag-outline", color: "#8E6CFF" },
];

const money = (value) =>
  `$${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const parseMoney = (value) => {
  const parsed = parseFloat(String(value).replace(/[^0-9.]/g, ""));
  return Number.isNaN(parsed) ? null : parsed;
};
const formatTargetDate = (date) =>
  date
    ? `Target: ${new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })}`
    : "No target date";

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [form, setForm] = useState({
    name: "",
    targetAmount: "",
    savedAmount: "",
    contribution: "",
    targetDate: "",
    goalType: GOAL_TYPES[0].label,
  });

  useFocusEffect(
    useCallback(() => {
      fetchGoals();
    }, []),
  );

  async function fetchGoals() {
    setLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return;

      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("is_completed", { ascending: true })
        .order("target_date", { ascending: true });
      if (error) throw error;
      setGoals(data || []);
    } catch (err) {
      Alert.alert("Error", err.message || "Could not load goals.");
    } finally {
      setLoading(false);
    }
  }

  const openCreate = () => {
    setEditingGoal(null);
    setShowDatePicker(false);
    setForm({
      name: "",
      targetAmount: "",
      savedAmount: "0",
      contribution: "",
      targetDate: "",
      goalType: GOAL_TYPES[0].label,
    });
    setModalVisible(true);
  };

  const openEdit = (goal) => {
    setEditingGoal(goal);
    setShowDatePicker(false);
    setForm({
      name: goal.name,
      targetAmount: String(goal.target_amount),
      savedAmount: String(goal.saved_amount),
      contribution: "",
      targetDate: goal.target_date || "",
      goalType:
        GOAL_TYPES.find((type) => type.icon === goal.icon)?.label ||
        GOAL_TYPES[0].label,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setShowDatePicker(false);
    setModalVisible(false);
  };

  const pickDate = (_event, date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (date) {
      const y = date.getFullYear();
      const m = `${date.getMonth() + 1}`.padStart(2, "0");
      const d = `${date.getDate()}`.padStart(2, "0");
      setForm((p) => ({ ...p, targetDate: `${y}-${m}-${d}` }));
    }
  };

  async function saveGoal() {
    const target = parseMoney(form.targetAmount);
    const saved = parseMoney(form.savedAmount);
    const contribution = parseMoney(form.contribution) || 0;
    const nextSaved = Number(saved || 0) + contribution;

    if (!form.name.trim() || !target || target <= 0 || saved === null) {
      Alert.alert("Missing info", "Enter a name, target amount, and saved amount.");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;

      const visual =
        GOAL_TYPES.find((type) => type.label === form.goalType) ||
        GOAL_TYPES[0];
      const payload = {
        user_id: user.id,
        name: form.name.trim(),
        target_amount: target,
        saved_amount: nextSaved,
        target_date: form.targetDate.trim() || null,
        icon: visual.icon,
        color: visual.color,
        is_completed: nextSaved >= target,
      };

      const query = editingGoal
        ? supabase.from("goals").update(payload).eq("id", editingGoal.id)
        : supabase.from("goals").insert(payload);
      const { error } = await query;
      if (error) throw error;

      closeModal();
      await fetchGoals();
    } catch (err) {
      Alert.alert("Error", err.message || "Could not save goal.");
    } finally {
      setSaving(false);
    }
  }

  function deleteGoal() {
    if (!editingGoal) return;
    Alert.alert("Delete goal", "Remove this goal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("goals").delete().eq("id", editingGoal.id);
          if (error) Alert.alert("Error", error.message);
          else {
            closeModal();
            fetchGoals();
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Goals</Text>
            <Text style={styles.pageSubtitle}>
              {goals.filter((goal) => !goal.is_completed).length} active goals
            </Text>
          </View>
        </View>

        <View style={styles.goalsList}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#6C63FF" />
            </View>
          ) : goals.length === 0 ? (
            <Text style={styles.emptyText}>No goals yet.</Text>
          ) : (
            goals.map((goal) => <GoalCard key={goal.id} goal={goal} onPress={() => openEdit(goal)} />)
          )}

          <TouchableOpacity style={styles.setNewGoal} activeOpacity={0.7} onPress={openCreate}>
            <Ionicons name="add" size={16} color="rgba(108,99,255,0.8)" />
            <Text style={styles.setNewGoalText}>Set new goal</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{editingGoal ? "Edit Goal" : "New Goal"}</Text>
            <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
              <GoalInput label="Name" value={form.name} onChangeText={(text) => setForm((p) => ({ ...p, name: text }))} placeholder="Emergency fund" />
              <GoalInput label="Target Amount" value={form.targetAmount} onChangeText={(text) => setForm((p) => ({ ...p, targetAmount: text }))} placeholder="5000" keyboardType="decimal-pad" />
              <GoalInput label="Saved Amount" value={form.savedAmount} onChangeText={(text) => setForm((p) => ({ ...p, savedAmount: text }))} placeholder="0" keyboardType="decimal-pad" />
              <View style={styles.sheetField}>
                <Text style={styles.sheetLabel}>Goal Type</Text>
                <View style={styles.typePillWrap}>
                  {GOAL_TYPES.map((type) => {
                    const selected = form.goalType === type.label;
                    return (
                      <TouchableOpacity
                        key={type.label}
                        style={[
                          styles.typePill,
                          selected && {
                            borderColor: type.color,
                            backgroundColor: `${type.color}22`,
                          },
                        ]}
                        onPress={() =>
                          setForm((p) => ({ ...p, goalType: type.label }))
                        }
                      >
                        <Ionicons name={type.icon} size={14} color={selected ? type.color : "#D7D9E0"} />
                        <Text style={[styles.typePillText, selected && { color: type.color }]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              {editingGoal ? (
                <GoalInput label="Add Contribution" value={form.contribution} onChangeText={(text) => setForm((p) => ({ ...p, contribution: text }))} placeholder="0" keyboardType="decimal-pad" />
              ) : null}
              <View style={styles.sheetField}>
                <Text style={styles.sheetLabel}>Target Date</Text>
                <TouchableOpacity
                  style={styles.sheetInput}
                  activeOpacity={0.8}
                  onPress={() => setShowDatePicker((prev) => !prev)}
                >
                  <Text style={styles.datePickerText}>
                    {form.targetDate || "Choose date"}
                  </Text>
                </TouchableOpacity>
                {showDatePicker ? (
                  <View style={styles.datePickerWrap}>
                    <DateTimePicker
                      value={
                        form.targetDate
                          ? new Date(`${form.targetDate}T00:00:00`)
                          : new Date()
                      }
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      themeVariant="dark"
                      onChange={pickDate}
                    />
                  </View>
                ) : null}
              </View>
            </ScrollView>
            <View style={styles.sheetButtonRow}>
              {editingGoal ? (
                <TouchableOpacity style={styles.deleteButton} onPress={deleteGoal}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.submitButton, saving && { opacity: 0.65 }]} onPress={saveGoal} disabled={saving}>
                <Text style={styles.submitButtonText}>{saving ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function GoalCard({ goal, onPress }) {
  const pct = goal.target_amount > 0 ? Math.min((goal.saved_amount / goal.target_amount) * 100, 100) : 0;
  const color = goal.color || "#6C63FF";
  return (
    <TouchableOpacity style={styles.goalCard} activeOpacity={0.75} onPress={onPress}>
      <View style={styles.goalHeader}>
        <View style={[styles.goalIcon, { backgroundColor: `${color}22` }]}>
          <Ionicons name={goal.icon || "flag-outline"} size={18} color={color} />
        </View>
        <Text style={styles.goalName}>{goal.name}</Text>
        <View style={[styles.goalPctBadge, { backgroundColor: `${color}22` }]}>
          <Text style={[styles.goalPctText, { color }]}>{Math.round(pct)}%</Text>
        </View>
      </View>
      <View style={styles.goalBarBg}>
        <View style={[styles.goalBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <View style={styles.goalFooter}>
        <View>
          <Text style={styles.goalSaved}>
            Saved <Text style={styles.goalSavedSpan}>{money(goal.saved_amount)}</Text>
          </Text>
          <Text style={styles.goalEta}>{goal.is_completed ? "Completed" : formatTargetDate(goal.target_date)}</Text>
        </View>
        <Text style={styles.goalTarget}>of {money(goal.target_amount)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function GoalInput({ label, ...props }) {
  return (
    <View style={styles.sheetField}>
      <Text style={styles.sheetLabel}>{label}</Text>
      <TextInput style={styles.sheetInput} placeholderTextColor="#6F707C" {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  contentContainer: { paddingHorizontal: 16, paddingTop: 48 },
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  pageTitle: { color: "#FFFFFF", fontSize: 28, fontWeight: "700" },
  pageSubtitle: { color: "#A5A5B2", marginTop: 4, fontSize: 13 },
  goalsList: { paddingHorizontal: 8, marginTop: 4 },
  loadingWrap: { paddingVertical: 32 },
  emptyText: { color: "rgba(255,255,255,0.35)", fontSize: 13, paddingVertical: 12 },
  goalCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  goalHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  goalIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  goalName: { fontSize: 14, fontWeight: "500", color: "#FFFFFF", flex: 1 },
  goalPctBadge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 20 },
  goalPctText: { fontSize: 11, fontWeight: "500" },
  goalBarBg: { height: 5, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginBottom: 10 },
  goalBarFill: { height: "100%", borderRadius: 3 },
  goalFooter: { flexDirection: "row", justifyContent: "space-between" },
  goalSaved: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  goalSavedSpan: { color: "#FFFFFF", fontFamily: "monospace", fontSize: 13 },
  goalEta: { fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 },
  goalTarget: { fontSize: 12, color: "rgba(255,255,255,0.35)" },
  setNewGoal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.15)",
    borderStyle: "dashed",
    borderRadius: 16,
  },
  setNewGoalText: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  bottomSheet: {
    backgroundColor: "#12131B",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    maxHeight: "84%",
    borderTopWidth: 1,
    borderColor: "#242633",
  },
  sheetHandle: { width: 44, height: 5, borderRadius: 99, backgroundColor: "#3A3D4A", alignSelf: "center", marginBottom: 16 },
  sheetTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "700", marginBottom: 18 },
  sheetContent: { paddingBottom: 20 },
  sheetField: { marginBottom: 18 },
  sheetLabel: { color: "#A5A5B2", fontSize: 12, marginBottom: 8 },
  sheetInput: {
    backgroundColor: "#0E1016",
    borderWidth: 1,
    borderColor: "#242633",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#FFFFFF",
    fontSize: 15,
  },
  datePickerText: { color: "#FFFFFF", fontSize: 15 },
  datePickerWrap: {
    marginTop: 10,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#0E1016",
    alignItems: "center",
  },
  typePillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#242633",
    backgroundColor: "#0E1016",
  },
  typePillText: { color: "#D7D9E0", fontSize: 13, fontWeight: "500" },
  sheetButtonRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelButton: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: "#2A2D3A", paddingVertical: 14, alignItems: "center", backgroundColor: "#0E1016" },
  cancelButtonText: { color: "#A5A5B2", fontSize: 15, fontWeight: "600" },
  deleteButton: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,90,90,0.35)", paddingVertical: 14, alignItems: "center", backgroundColor: "rgba(255,90,90,0.08)" },
  deleteButtonText: { color: "#FF6B6B", fontSize: 15, fontWeight: "700" },
  submitButton: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center", backgroundColor: "#6C63FF" },
  submitButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
