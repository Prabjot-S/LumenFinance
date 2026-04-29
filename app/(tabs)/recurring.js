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

const FREQUENCIES = ["weekly", "biweekly", "monthly"];

const CATEGORY_ICON_MAP = {
  Entertainment: "game-controller-outline",
  Food: "fast-food-outline",
  Other: "pricetag-outline",
  Shopping: "bag-handle-outline",
  Salary: "cash-outline",
  Investment: "trending-up-outline",
  Rent: "home-outline",
  Transport: "car-outline",
  Freelance: "laptop-outline",
  Healthcare: "medkit-outline",
};

const toSqlDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseSqlDate = (dateString) => new Date(`${dateString}T00:00:00`);

const formatCurrency = (value) => {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatShortDate = (dateString) => {
  return parseSqlDate(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const formatFrequency = (frequency) => {
  if (frequency === "biweekly") return "Bi-weekly";
  return frequency.charAt(0).toUpperCase() + frequency.slice(1);
};

const addFrequency = (date, frequency) => {
  const next = new Date(date);
  if (frequency === "weekly") next.setDate(next.getDate() + 7);
  else if (frequency === "biweekly") next.setDate(next.getDate() + 14);
  else next.setMonth(next.getMonth() + 1);
  return next;
};

const getNextFutureDueDate = (startDateString, frequency) => {
  const today = parseSqlDate(toSqlDate(new Date()));
  let nextDueDate = parseSqlDate(startDateString);

  while (nextDueDate <= today) {
    nextDueDate = addFrequency(nextDueDate, frequency);
  }

  return toSqlDate(nextDueDate);
};

const getMonthlyEstimate = (amount, frequency) => {
  const value = Number(amount || 0);
  if (frequency === "weekly") return (value * 52) / 12;
  if (frequency === "biweekly") return (value * 26) / 12;
  return value;
};

const getCategoryIcon = (categoryName, transactionType) => {
  if (transactionType === "income") return "cash-outline";
  return CATEGORY_ICON_MAP[categoryName] || "repeat-outline";
};

export default function Recurring() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recurringItems, setRecurringItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    transactionType: "expense",
    frequency: "monthly",
    startDate: toSqlDate(new Date()),
    categoryId: null,
  });

  useFocusEffect(
    useCallback(() => {
      fetchRecurring();
      // fetchRecurring is intentionally stable for screen focus reloads.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  async function fetchRecurring() {
    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session) return;

      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .select("id, name, color")
        .order("name", { ascending: true });

      if (categoryError) throw categoryError;
      setCategories(categoryData || []);

      const { data: recurData, error: recurError } = await supabase
        .from("recurring_transactions")
        .select(
          `
          id,
          user_id,
          category_id,
          name,
          amount,
          transaction_type,
          frequency,
          start_date,
          next_due_date,
          is_active,
          categories!category_id (name, color)
        `,
        )
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .order("next_due_date", { ascending: true });

      if (recurError) throw recurError;

      const processedItems = await generateDuePayments(
        recurData || [],
        session.user.id,
      );
      setRecurringItems(processedItems);
    } catch (err) {
      Alert.alert("Error", err.message || "Could not load recurring items.");
    } finally {
      setLoading(false);
    }
  }

  async function generateDuePayments(items, userId) {
    const today = parseSqlDate(toSqlDate(new Date()));
    let netWorthDelta = 0;
    const nextItems = [];

    for (const item of items) {
      let nextDueDate = parseSqlDate(item.next_due_date);
      const rowsToInsert = [];

      while (nextDueDate <= today) {
        rowsToInsert.push({
          user_id: userId,
          category_id: item.category_id,
          recurring_transaction_id: item.id,
          amount: Number(item.amount),
          transaction_type: item.transaction_type,
          transaction_name: item.name,
          transaction_date: toSqlDate(nextDueDate),
        });

        netWorthDelta +=
          item.transaction_type === "income"
            ? Number(item.amount)
            : -Number(item.amount);
        nextDueDate = addFrequency(nextDueDate, item.frequency);
      }

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("transactions")
          .insert(rowsToInsert);

        if (insertError) throw insertError;

        const nextDueDateSql = toSqlDate(nextDueDate);
        const { error: updateError } = await supabase
          .from("recurring_transactions")
          .update({ next_due_date: nextDueDateSql })
          .eq("id", item.id);

        if (updateError) throw updateError;

        nextItems.push({ ...item, next_due_date: nextDueDateSql });
      } else {
        nextItems.push(item);
      }
    }

    if (netWorthDelta !== 0) {
      const { data: accountData, error: accountError } = await supabase
        .from("accounts")
        .select("net_worth")
        .eq("user_id", userId)
        .single();

      if (!accountError && accountData) {
        await supabase
          .from("accounts")
          .update({ net_worth: Number(accountData.net_worth || 0) + netWorthDelta })
          .eq("user_id", userId);
      }
    }

    return nextItems;
  }

  const resetForm = () => {
    setEditingItem(null);
    setShowDatePicker(false);
    setForm({
      name: "",
      amount: "",
      transactionType: "expense",
      frequency: "monthly",
      startDate: toSqlDate(new Date()),
      categoryId: categories[0]?.id || null,
    });
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setShowDatePicker(false);
    setForm({
      name: item.name,
      amount: String(item.amount),
      transactionType: item.transaction_type,
      frequency: item.frequency,
      startDate: item.start_date,
      categoryId: item.category_id,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleDateChange = (_event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setForm((prev) => ({ ...prev, startDate: toSqlDate(selectedDate) }));
    }
  };

  async function handleSave() {
    const cleanedAmount = form.amount.replace(/[^0-9.]/g, "");
    const parsedAmount = parseFloat(cleanedAmount);

    if (!form.name.trim()) {
      Alert.alert("Missing info", "Please enter a name.");
      return;
    }

    if (!form.categoryId) {
      Alert.alert("Missing info", "Please choose a category.");
      return;
    }

    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.startDate)) {
      Alert.alert("Invalid date", "Use YYYY-MM-DD format.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Not authenticated");

      const payload = {
        user_id: user.id,
        category_id: form.categoryId,
        name: form.name.trim(),
        amount: parsedAmount,
        transaction_type: form.transactionType,
        frequency: form.frequency,
        start_date: form.startDate,
        next_due_date: editingItem
          ? getNextFutureDueDate(form.startDate, form.frequency)
          : form.startDate,
        is_active: true,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("recurring_transactions")
          .update(payload)
          .eq("id", editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("recurring_transactions")
          .insert(payload);

        if (error) throw error;
      }

      closeModal();
      await fetchRecurring();
    } catch (err) {
      Alert.alert("Error", err.message || "Could not save recurring item.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!editingItem) return;

    Alert.alert("Delete recurring item", "Remove this recurring item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("recurring_transactions")
              .delete()
              .eq("id", editingItem.id);

            if (error) throw error;

            closeModal();
            await fetchRecurring();
          } catch (err) {
            Alert.alert("Error", err.message || "Could not delete item.");
          }
        },
      },
    ]);
  }

  const incomeItems = recurringItems.filter(
    (item) => item.transaction_type === "income",
  );
  const expenseItems = recurringItems.filter(
    (item) => item.transaction_type === "expense",
  );
  const monthlyIncome = incomeItems.reduce(
    (sum, item) => sum + getMonthlyEstimate(item.amount, item.frequency),
    0,
  );
  const monthlyExpenses = expenseItems.reduce(
    (sum, item) => sum + getMonthlyEstimate(item.amount, item.frequency),
    0,
  );
  const monthlyTotal = monthlyIncome - monthlyExpenses;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Recurring</Text>
            <Text style={styles.pageSubtitle}>
              ${formatCurrency(Math.abs(monthlyTotal))}/mo{" "}
              {monthlyTotal >= 0 ? "net income" : "tracked"}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#6C63FF" />
            <Text style={styles.loadingText}>Loading recurring items...</Text>
          </View>
        ) : (
          <>
            <RecurringSection
              title="Income"
              total={monthlyIncome}
              emptyText="No recurring income yet."
              items={incomeItems}
              onPressItem={openEditModal}
            />

            <RecurringSection
              title="Expenses"
              total={monthlyExpenses}
              emptyText="No recurring expenses yet."
              items={expenseItems}
              onPressItem={openEditModal}
            />

            <TouchableOpacity
              style={styles.setNewRecurring}
              activeOpacity={0.7}
              onPress={openCreateModal}
            >
              <Ionicons name="add" size={16} color="rgba(108,99,255,0.8)" />
              <Text style={styles.setNewRecurringText}>Set new recurring</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />

          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {editingItem ? "Edit Recurring" : "New Recurring"}
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.typeToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.typeToggleButton,
                    form.transactionType === "expense" &&
                      styles.typeToggleButtonActive,
                  ]}
                  onPress={() =>
                    setForm((prev) => ({ ...prev, transactionType: "expense" }))
                  }
                >
                  <Text
                    style={[
                      styles.typeToggleText,
                      form.transactionType === "expense" &&
                        styles.typeToggleTextActive,
                    ]}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeToggleButton,
                    form.transactionType === "income" &&
                      styles.typeToggleButtonActive,
                  ]}
                  onPress={() =>
                    setForm((prev) => ({ ...prev, transactionType: "income" }))
                  }
                >
                  <Text
                    style={[
                      styles.typeToggleText,
                      form.transactionType === "income" &&
                        styles.typeToggleTextActive,
                    ]}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sheetField}>
                <Text style={styles.sheetLabel}>Name</Text>
                <TextInput
                  style={styles.sheetInput}
                  placeholder="e.g. Paycheck, Rent, Netflix"
                  placeholderTextColor="#6F707C"
                  value={form.name}
                  onChangeText={(text) =>
                    setForm((prev) => ({ ...prev, name: text }))
                  }
                />
              </View>

              <View style={styles.sheetField}>
                <Text style={styles.sheetLabel}>Amount</Text>
                <TextInput
                  style={styles.sheetInput}
                  placeholder="0.00"
                  placeholderTextColor="#6F707C"
                  keyboardType="decimal-pad"
                  value={form.amount}
                  onChangeText={(text) =>
                    setForm((prev) => ({ ...prev, amount: text }))
                  }
                />
              </View>

              <View style={styles.sheetField}>
                <Text style={styles.sheetLabel}>Start Date</Text>
                <TouchableOpacity
                  style={styles.sheetInput}
                  activeOpacity={0.8}
                  onPress={() => setShowDatePicker((prev) => !prev)}
                >
                  <Text style={styles.datePickerText}>
                    {parseSqlDate(form.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <View style={styles.datePickerWrap}>
                    <DateTimePicker
                      value={parseSqlDate(form.startDate)}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      themeVariant="dark"
                      onChange={handleDateChange}
                    />
                  </View>
                )}
              </View>

              <View style={styles.sheetField}>
                <Text style={styles.sheetLabel}>Frequency</Text>
                <View style={styles.pillWrap}>
                  {FREQUENCIES.map((frequency) => (
                    <TouchableOpacity
                      key={frequency}
                      style={[
                        styles.pill,
                        form.frequency === frequency && styles.pillActive,
                      ]}
                      onPress={() =>
                        setForm((prev) => ({ ...prev, frequency }))
                      }
                    >
                      <Text
                        style={[
                          styles.pillText,
                          form.frequency === frequency && styles.pillTextActive,
                        ]}
                      >
                        {formatFrequency(frequency)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.sheetField}>
                <Text style={styles.sheetLabel}>Category</Text>
                <View style={styles.pillWrap}>
                  {categories.map((category) => {
                    const isSelected = form.categoryId === category.id;

                    return (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.pill,
                          isSelected && {
                            borderColor: category.color,
                            backgroundColor: `${category.color}22`,
                          },
                        ]}
                        onPress={() =>
                          setForm((prev) => ({
                            ...prev,
                            categoryId: category.id,
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.pillText,
                            isSelected && { color: category.color },
                          ]}
                        >
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.sheetButtonRow}>
              {editingItem ? (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDelete}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.submitButton, saving && styles.submitButtonOff]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.submitButtonText}>
                  {saving ? "Saving..." : editingItem ? "Save Changes" : "Add"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function RecurringSection({ title, total, emptyText, items, onPressItem }) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionLink}>${formatCurrency(total)}/mo</Text>
      </View>

      <View style={styles.recurList}>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>{emptyText}</Text>
        ) : (
          items.map((item) => (
            <RecurringRow
              key={item.id}
              item={item}
              onPress={() => onPressItem(item)}
            />
          ))
        )}
      </View>
    </>
  );
}

function RecurringRow({ item, onPress }) {
  const categoryName = item.categories?.name || "Other";
  const categoryColor = item.categories?.color || "#6C63FF";
  const isIncome = item.transaction_type === "income";

  return (
    <TouchableOpacity
      style={styles.recurItem}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View
        style={[
          styles.riIcon,
          { backgroundColor: isIncome ? "#11281D" : `${categoryColor}22` },
        ]}
      >
        <Ionicons
          name={getCategoryIcon(categoryName, item.transaction_type)}
          size={15}
          color={isIncome ? "#56D37F" : categoryColor}
        />
      </View>
      <View style={styles.riInfo}>
        <Text style={styles.riName}>{item.name}</Text>
        <Text style={styles.riNext}>Next: {formatShortDate(item.next_due_date)}</Text>
      </View>
      <View style={styles.riRight}>
        <Text style={[styles.riAmt, isIncome && styles.riIncome]}>
          {isIncome ? "+" : "-"}${formatCurrency(item.amount)}
        </Text>
        <Text style={styles.riFreq}>{formatFrequency(item.frequency)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  pageTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
  },
  pageSubtitle: {
    color: "#A5A5B2",
    marginTop: 4,
    fontSize: 13,
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    color: "#A5A5B2",
    fontSize: 13,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 6,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  sectionLink: {
    color: "#8E6CFF",
    fontSize: 13,
  },
  recurList: {
    paddingHorizontal: 8,
  },
  recurItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  riIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  riInfo: {
    flex: 1,
  },
  riName: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  riNext: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    marginTop: 2,
  },
  riRight: {
    alignItems: "flex-end",
  },
  riAmt: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
    fontFamily: "monospace",
  },
  riIncome: {
    color: "#56D37F",
  },
  riFreq: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    marginTop: 2,
  },
  emptyText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 13,
    paddingVertical: 12,
  },
  setNewRecurring: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.15)",
    borderStyle: "dashed",
    borderRadius: 16,
    marginHorizontal: 8,
    marginTop: 18,
  },
  setNewRecurringText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
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
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 99,
    backgroundColor: "#3A3D4A",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 18,
  },
  sheetContent: {
    paddingBottom: 20,
  },
  sheetField: {
    marginBottom: 18,
  },
  sheetLabel: {
    color: "#A5A5B2",
    fontSize: 12,
    marginBottom: 8,
  },
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
  datePickerText: {
    color: "#FFFFFF",
    fontSize: 15,
  },
  datePickerWrap: {
    marginTop: 10,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#0E1016",
    alignItems: "center",
  },
  typeToggleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  typeToggleButton: {
    flex: 1,
    backgroundColor: "#0E1016",
    borderWidth: 1,
    borderColor: "#242633",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  typeToggleButtonActive: {
    backgroundColor: "#1C1A3A",
    borderColor: "#6C63FF",
  },
  typeToggleText: {
    color: "#8B8B98",
    fontSize: 14,
    fontWeight: "600",
  },
  typeToggleTextActive: {
    color: "#FFFFFF",
  },
  pillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#242633",
    backgroundColor: "#0E1016",
  },
  pillActive: {
    backgroundColor: "#1C1A3A",
    borderColor: "#6C63FF",
  },
  pillText: {
    color: "#D7D9E0",
    fontSize: 13,
    fontWeight: "500",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  sheetButtonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2A2D3A",
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#0E1016",
  },
  cancelButtonText: {
    color: "#A5A5B2",
    fontSize: 15,
    fontWeight: "600",
  },
  deleteButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,90,90,0.35)",
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,90,90,0.08)",
  },
  deleteButtonText: {
    color: "#FF6B6B",
    fontSize: 15,
    fontWeight: "700",
  },
  submitButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#6C63FF",
  },
  submitButtonOff: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
