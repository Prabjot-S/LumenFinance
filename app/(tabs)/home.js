import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
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

const formatDisplayDate = (date) => {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTransactionDateLabel = (dateString) => {
  const inputDate = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay =
    inputDate.getFullYear() === today.getFullYear() &&
    inputDate.getMonth() === today.getMonth() &&
    inputDate.getDate() === today.getDate();

  const isYesterday =
    inputDate.getFullYear() === yesterday.getFullYear() &&
    inputDate.getMonth() === yesterday.getMonth() &&
    inputDate.getDate() === yesterday.getDate();

  if (isSameDay) return "Today";
  if (isYesterday) return "Yesterday";

  return inputDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const getCategoryVisuals = (categoryName, categoryColor, transactionType) => {
  const icon = CATEGORY_ICON_MAP[categoryName] || "pricetag-outline";

  return {
    icon,
    iconColor:
      transactionType === "income" ? "#56D37F" : categoryColor || "#95A5A6",
    iconBackground:
      transactionType === "income"
        ? "#11281D"
        : `${categoryColor || "#95A5A6"}22`,
  };
};

const getSignedTransactionAmount = (type, amount) => {
  const numericAmount = Number(amount || 0);
  return type === "income" ? numericAmount : -numericAmount;
};

const alertNegativeNetWorth = () =>
  Alert.alert("Invalid transaction", "This would make your net worth negative.");

const confirmBudgetOver = (willGoOver, onContinue) => {
  if (!willGoOver) return onContinue();
  Alert.alert("Budget warning", "This transaction will put you over budget.", [
    { text: "Cancel", style: "cancel" },
    { text: "Continue", onPress: onContinue },
  ]);
};

export default function Home() {
  //make numbers have commas
  const formatCurrency = (value) => {
    const num = Number(value || 0);
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  //make numbers smaller
  const formatCompactCurrency = (value) => {
    const num = Number(value || 0);

    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(num);
  };

  const formatSignedCurrency = (value) => {
    const num = Number(value || 0);
    const sign = num < 0 ? "-" : "+";
    return `${sign}$${formatCurrency(Math.abs(num))}`;
  };

  const formatSignedCompactCurrency = (value) => {
    const num = Number(value || 0);
    const sign = num < 0 ? "-" : "";
    return `${sign}$${formatCompactCurrency(Math.abs(num))}`;
  };

  const router = useRouter();
  const [fullName, setFullName] = useState(""); // stores the user's real name from supabase
  const [initials, setInitials] = useState(""); // stores initials like PS

  const [netWorth, setNetWorth] = useState(null); // stores saved net worth from DB
  const [showNetWorthModal, setShowNetWorthModal] = useState(false); // controls popup
  const [netWorthInput, setNetWorthInput] = useState(""); // what user types
  const [monthlyIncomeInput, setMonthlyIncomeInput] = useState("");
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);

  const [monthlyIncome, setMonthlyIncome] = useState(null); //used for projected value
  const [monthlyBudget, setMonthlyBudget] = useState(null);

  //add transaction bottom sheet states
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState("expense");
  const [transactionName, setTransactionName] = useState("");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [transactionDateValue, setTransactionDateValue] = useState(new Date());
  const [countTowardBudget, setCountTowardBudget] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categories, setCategories] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [addTransactionLoading, setAddTransactionLoading] = useState(false);
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false);
  const [editingTransactionOriginal, setEditingTransactionOriginal] =
    useState(null);
  const [monthlyTotals, setMonthlyTotals] = useState({
    income: 0,
    expense: 0,
    budgetExpense: 0,
    saved: 0,
  });

  const [editingTransactionId, setEditingTransactionId] = useState(null); //edit transactions

  useFocusEffect(
    useCallback(() => {
      fetchHomeInfo();
      // fetchHomeInfo should run fresh whenever this tab is focused.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  async function fetchHomeInfo() {
    // Step 1: ask Supabase who is currently logged in
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log("Could not get logged-in user");
      return;
    }

    //--------grab the networth
    const { data: accountData, error: accountError } = await supabase
      .from("accounts")
      .select("net_worth, monthly_income, monthly_budget")
      .eq("user_id", user.id)
      .single();

    if (accountError) {
      console.log("Could not account data:", accountError.message);
      return;
    }

    //save account info into states
    setNetWorth(accountData.net_worth);
    setMonthlyIncome(accountData.monthly_income);
    setMonthlyBudget(accountData.monthly_budget);

    //--------grab the networth

    // use that auth user id to look up this user's row in UserInfo
    const { data, error: nameError } = await supabase
      .from("UserInfo")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    if (nameError) {
      console.log("Could not fetch full name:", nameError.message);
      return;
    }

    // save the full name into React state
    setFullName(data.full_name);

    // turn the full name into initials
    const nameParts = data.full_name.trim().split(" ");

    // take the first letter of the first 2 name parts
    const userInitials = nameParts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");

    setInitials(userInitials);

    // grab categories for add transaction
    const { data: categoryData, error: categoryError } = await supabase
      .from("categories")
      .select("id, name, color")
      .order("name", { ascending: true });

    if (categoryError) {
      console.log("Could not fetch categories:", categoryError.message);
    } else {
      setCategories(categoryData || []);
    }

    // grab this month's totals for home cards
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const { data: monthlyTransactionData, error: monthlyTransactionError } =
      await supabase
        .from("transactions")
        .select("amount, transaction_type, transaction_date, exclude_from_budget")
        .eq("user_id", user.id)
        .gte("transaction_date", toSqlDate(startOfMonth))
        .lt("transaction_date", toSqlDate(startOfNextMonth));

    if (monthlyTransactionError) {
      console.log(
        "Could not fetch monthly totals:",
        monthlyTransactionError.message,
      );
    } else {
      const incomeTotal = (monthlyTransactionData || [])
        .filter((tx) => tx.transaction_type === "income")
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      const expenseTotal = (monthlyTransactionData || [])
        .filter((tx) => tx.transaction_type === "expense")
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      const budgetExpenseTotal = (monthlyTransactionData || [])
        .filter(
          (tx) =>
            tx.transaction_type === "expense" && !tx.exclude_from_budget,
        )
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      setMonthlyTotals({
        income: incomeTotal,
        expense: expenseTotal,
        budgetExpense: budgetExpenseTotal,
        saved: incomeTotal - expenseTotal,
      });
    }

    // grab recent transactions
    const { data: transactionData, error: transactionError } = await supabase
      .from("transactions")
      .select(
        `
        id,
        category_id,
        recurring_transaction_id,
        exclude_from_budget,
        amount,
        transaction_type,
        transaction_name,
        transaction_date,
        categories!category_id (name, color)
      `,
      )
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .limit(5);

    if (transactionError) {
      console.log("Could not fetch transactions:", transactionError.message);
    } else {
      const mappedTransactions = (transactionData || []).map((tx) => {
        const categoryName = tx.categories?.name || "Other";
        const categoryColor = tx.categories?.color || "#95A5A6";
        const visuals = getCategoryVisuals(
          categoryName,
          categoryColor,
          tx.transaction_type,
        );

        return {
          id: tx.id,
          title: tx.transaction_name || "Untitled",
          category: categoryName,
          date: formatTransactionDateLabel(tx.transaction_date),
          amount: `${tx.transaction_type === "income" ? "+" : "-"}$${formatCurrency(tx.amount)}`,
          icon: visuals.icon,
          iconColor: visuals.iconColor,
          iconBackground: visuals.iconBackground,
          isIncome: tx.transaction_type === "income",
          rawAmount: Number(tx.amount),
          rawType: tx.transaction_type,
          rawName: tx.transaction_name || "",
          rawDate: tx.transaction_date,
          rawCategoryId: tx.category_id,
          isRecurring: Boolean(tx.recurring_transaction_id),
          excludesBudget: Boolean(tx.exclude_from_budget),
        };
      });

      setRecentTransactions(mappedTransactions);
    }
  }

  //BUDGET CARD HANDLE
  const spentThisMonth = monthlyTotals.budgetExpense;

  const remainingBudget =
    monthlyBudget !== null ? Math.max(monthlyBudget - spentThisMonth, 0) : null;

  const budgetUsedPercent =
    monthlyBudget && monthlyBudget > 0
      ? Math.min((spentThisMonth / monthlyBudget) * 100, 100)
      : 0;
  const budgetColor =
    budgetUsedPercent >= 100
      ? "#FF6B6B"
      : budgetUsedPercent >= 80
        ? "#F59E0B"
        : "#F4C542";

  //for total in, out, saved
  const savedAmount = monthlyTotals.saved;

  const summaryCards = [
    {
      label: "Total in",
      value: formatSignedCompactCurrency(monthlyTotals.income).replace("+", ""),
      color: "#56D37F",
    },
    {
      label: "Total out",
      value: `$${formatCompactCurrency(monthlyTotals.expense)}`,
      color: "#FF6B7A",
    },
    {
      label: "Saved",
      value: formatSignedCompactCurrency(savedAmount),
      color: "#FFFFFF",
    },
  ];

  const openAddTransactionModal = () => {
    setShowQuickAddMenu(false);
    setEditingTransactionId(null);
    setTransactionType("expense");
    setTransactionName("");
    setTransactionAmount("");
    setSelectedCategoryId(null);
    setTransactionDateValue(new Date());
    setCountTowardBudget(true);
    setShowDatePicker(false);
    setShowAddTransactionModal(true);
  };

  const closeAddTransactionModal = () => {
    setShowAddTransactionModal(false);
    setShowDatePicker(false);
    setEditingTransactionId(null);
    setEditingTransactionOriginal(null);
  };

  const toggleQuickAddMenu = () => {
    setShowQuickAddMenu((prev) => !prev);
  };

  const closeQuickAddMenu = () => {
    setShowQuickAddMenu(false);
  };

  const handleQuickAddGoal = () => {
    closeQuickAddMenu();
    router.push("/(tabs)/goals");
  };

  const handleQuickAddRecurring = () => {
    closeQuickAddMenu();
    router.push("/(tabs)/recurring");
  };

  const openSetupModal = () => {
    setNetWorthInput(netWorth !== null ? String(netWorth) : "");
    setMonthlyIncomeInput(monthlyIncome !== null ? String(monthlyIncome) : "");
    setMonthlyBudgetInput(monthlyBudget !== null ? String(monthlyBudget) : "");
    setShowNetWorthModal(true);
  };

  const closeSetupModal = () => {
    setShowNetWorthModal(false);
  };

  const openEditTransactionModal = (transaction) => {
    setEditingTransactionId(transaction.id);
    setEditingTransactionOriginal({
      amount: transaction.rawAmount,
      type: transaction.rawType,
      excludesBudget: transaction.excludesBudget,
    });
    setTransactionType(transaction.rawType);
    setTransactionName(transaction.rawName);
    setTransactionAmount(String(transaction.rawAmount));
    setSelectedCategoryId(transaction.rawCategoryId);
    setTransactionDateValue(new Date(`${transaction.rawDate}T00:00:00`));
    setCountTowardBudget(!transaction.excludesBudget);
    setShowDatePicker(false);
    setShowAddTransactionModal(true);
  };

  const handleDateChange = (_event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setTransactionDateValue(selectedDate);
    }
  };

  const handleAddTransaction = async () => {
    const cleanedAmount = transactionAmount.replace(/[^0-9.]/g, "");
    const parsedAmount = parseFloat(cleanedAmount);

    if (!transactionName.trim()) {
      Alert.alert("Missing info", "Please enter a transaction name.");
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert("Missing info", "Please choose a category.");
      return;
    }

    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }

    const willGoOver =
      transactionType === "expense" &&
      countTowardBudget &&
      monthlyBudget &&
      spentThisMonth + parsedAmount > monthlyBudget;

    confirmBudgetOver(willGoOver, () => saveTransaction(parsedAmount));
  };

  const saveTransaction = async (parsedAmount) => {
    setAddTransactionLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Not authenticated");

      const nextNetWorth =
        Number(netWorth || 0) +
        getSignedTransactionAmount(transactionType, parsedAmount);

      if (nextNetWorth < 0) {
        alertNegativeNetWorth();
        return;
      }

      const { error: insertError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          category_id: selectedCategoryId,
          amount: parsedAmount,
          transaction_type: transactionType,
          transaction_name: transactionName.trim(),
          transaction_date: toSqlDate(transactionDateValue),
          exclude_from_budget: !countTowardBudget,
        });

      if (insertError) throw insertError;

      const { error: accountUpdateError } = await supabase
        .from("accounts")
        .update({
          net_worth: nextNetWorth,
        })
        .eq("user_id", user.id);

      if (accountUpdateError) throw accountUpdateError;

      closeAddTransactionModal();
      await fetchHomeInfo();
    } catch (err) {
      Alert.alert("Error", err.message || "Could not add transaction.");
    } finally {
      setAddTransactionLoading(false);
    }
  };

  const handleUpdateTransaction = async () => {
    const cleanedAmount = transactionAmount.replace(/[^0-9.]/g, "");
    const parsedAmount = parseFloat(cleanedAmount);

    if (!transactionName.trim()) {
      Alert.alert("Missing info", "Please enter a transaction name.");
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert("Missing info", "Please choose a category.");
      return;
    }

    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }

    if (!editingTransactionId) return;

    const previousBudgetAmount =
      editingTransactionOriginal?.type === "expense" &&
      !editingTransactionOriginal?.excludesBudget
        ? Number(editingTransactionOriginal.amount)
        : 0;
    const nextBudgetAmount =
      transactionType === "expense" && countTowardBudget ? parsedAmount : 0;
    const willGoOver =
      monthlyBudget &&
      spentThisMonth - previousBudgetAmount + nextBudgetAmount > monthlyBudget;

    confirmBudgetOver(willGoOver, () => updateTransaction(parsedAmount));
  };

  const updateTransaction = async (parsedAmount) => {
    setAddTransactionLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Not authenticated");

      const previousSignedAmount = editingTransactionOriginal
        ? getSignedTransactionAmount(
            editingTransactionOriginal.type,
            editingTransactionOriginal.amount,
          )
        : 0;

      const nextSignedAmount = getSignedTransactionAmount(
        transactionType,
        parsedAmount,
      );

      const nextNetWorth =
        Number(netWorth || 0) + (nextSignedAmount - previousSignedAmount);

      if (nextNetWorth < 0) {
        alertNegativeNetWorth();
        return;
      }

      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          category_id: selectedCategoryId,
          amount: parsedAmount,
          transaction_type: transactionType,
          transaction_name: transactionName.trim(),
          transaction_date: toSqlDate(transactionDateValue),
          exclude_from_budget: !countTowardBudget,
        })
        .eq("id", editingTransactionId);

      if (updateError) throw updateError;

      const { error: accountUpdateError } = await supabase
        .from("accounts")
        .update({
          net_worth: nextNetWorth,
        })
        .eq("user_id", user.id);

      if (accountUpdateError) throw accountUpdateError;

      closeAddTransactionModal();
      await fetchHomeInfo();
    } catch (err) {
      Alert.alert("Error", err.message || "Could not update transaction.");
    } finally {
      setAddTransactionLoading(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!editingTransactionId) return;

    Alert.alert(
      "Delete transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const {
                data: { user },
                error: userError,
              } = await supabase.auth.getUser();

              if (userError) throw userError;
              if (!user) throw new Error("Not authenticated");

              const signedAmountToRemove = editingTransactionOriginal
                ? getSignedTransactionAmount(
                    editingTransactionOriginal.type,
                    editingTransactionOriginal.amount,
                  )
                : 0;

              const nextNetWorth =
                Number(netWorth || 0) - signedAmountToRemove;

              if (nextNetWorth < 0) {
                alertNegativeNetWorth();
                return;
              }

              const { error: deleteError } = await supabase
                .from("transactions")
                .delete()
                .eq("id", editingTransactionId);

              if (deleteError) throw deleteError;

              const { error: accountUpdateError } = await supabase
                .from("accounts")
                .update({
                  net_worth: nextNetWorth,
                })
                .eq("user_id", user.id);

              if (accountUpdateError) throw accountUpdateError;

              closeAddTransactionModal();
              await fetchHomeInfo();
            } catch (err) {
              Alert.alert(
                "Error",
                err.message || "Could not delete transaction.",
              );
            }
          },
        },
      ],
    );
  };

  const handleUpdateSetup = async () => {
    const cleanedNetWorth = parseFloat(netWorthInput.replace(/[^0-9.]/g, ""));
    const cleanedMonthlyIncome = parseFloat(
      monthlyIncomeInput.replace(/[^0-9.]/g, ""),
    );
    const cleanedMonthlyBudget = parseFloat(
      monthlyBudgetInput.replace(/[^0-9.]/g, ""),
    );

    if (Number.isNaN(cleanedNetWorth)) {
      Alert.alert("Invalid amount", "Please enter a valid net worth.");
      return;
    }

    if (Number.isNaN(cleanedMonthlyIncome)) {
      Alert.alert("Invalid amount", "Please enter a valid monthly income.");
      return;
    }

    if (Number.isNaN(cleanedMonthlyBudget)) {
      Alert.alert("Invalid amount", "Please enter a valid monthly budget.");
      return;
    }

    setSetupLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("accounts")
        .update({
          net_worth: cleanedNetWorth,
          monthly_income: cleanedMonthlyIncome,
          monthly_budget: cleanedMonthlyBudget,
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      closeSetupModal();
      await fetchHomeInfo();
    } catch (err) {
      Alert.alert("Error", err.message || "Could not update financial setup.");
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      {/* —— Header —— */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name}>{fullName || "Loading..."}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/profile")}
          activeOpacity={0.5}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || "?"}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* —— Net Worth Hero Card —— */}
      <TouchableOpacity
        style={styles.netWorthCard}
        activeOpacity={0.85}
        onPress={openSetupModal}
      >
        {/* Decorative inner glow circle */}
        <View style={styles.netWorthGlow} />

        <Text style={styles.netWorthLabel}>TOTAL BALANCE</Text>
        <Text style={styles.netWorthAmount}>${formatCurrency(netWorth)}</Text>
        <Text
          style={[
            styles.netWorthSub,
            monthlyTotals.saved < 0 && styles.netWorthSubNegative,
          ]}
        >
          {`${formatSignedCurrency(monthlyTotals.saved)} this month`}
        </Text>
      </TouchableOpacity>

      {/* —— Monthly Summary Row —— */}
      <View style={styles.summaryRow}>
        {summaryCards.map((card) => (
          <View key={card.label} style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{card.label}</Text>
            <Text
              style={[
                styles.summaryValue,
                card.label === "Saved" && styles.summaryValueSaved,
                { color: card.color },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {card.value}
            </Text>
            <Text style={styles.summaryCaption}>this month</Text>
          </View>
        ))}
      </View>

      {/* —— Budget Bar —— */}
      <View
        style={[
          styles.budgetCard,
          budgetUsedPercent >= 100 && styles.budgetCardDanger,
        ]}
      >
        <View style={styles.budgetHeader}>
          <Text style={styles.sectionLabel}>Monthly budget</Text>
          <Text style={[styles.budgetPercent, { color: budgetColor }]}>
            {monthlyBudget !== null
              ? `${Math.round(budgetUsedPercent)}% used`
              : "Loading..."}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${budgetUsedPercent}%`, backgroundColor: budgetColor },
            ]}
          />
        </View>
        <View style={styles.budgetFooter}>
          <Text style={styles.mutedText}>
            ${formatCurrency(spentThisMonth)} spent
          </Text>

          <Text style={styles.mutedText}>
            {remainingBudget !== null
              ? `$${formatCurrency(remainingBudget)} remaining`
              : "Loading..."}
          </Text>
        </View>
      </View>

      {/* —— Recent Transactions —— */}
      <View style={styles.transactionsHeader}>
        <Text style={styles.sectionTitle}>Recent transactions</Text>
        <TouchableOpacity onPress={() => router.replace("/analytics")}>
          <Text style={styles.link}>See all</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        <FlatList
          data={recentTransactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TransactionRow
              transaction={item}
              onPress={() => openEditTransactionModal(item)}
            />
          )}
          contentContainerStyle={styles.transactionList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyTransactionsText}>
              No transactions yet.
            </Text>
          }
        />
      </View>

      {/* —— FAB —— */}
      <TouchableOpacity
        style={styles.addButton}
        activeOpacity={0.3}
        onPress={toggleQuickAddMenu}
      >
        <Ionicons
          name={showQuickAddMenu ? "close" : "add"}
          color="#FFFFFF"
          size={32}
        />
      </TouchableOpacity>

      {showQuickAddMenu ? (
        <Pressable style={styles.quickAddBackdrop} onPress={closeQuickAddMenu}>
          <View style={styles.quickAddMenu}>
            <TouchableOpacity
              style={styles.quickAddItem}
              activeOpacity={0.85}
              onPress={openAddTransactionModal}
            >
              <View style={[styles.quickAddIconWrap, styles.quickAddTxIcon]}>
                <Ionicons
                  name="swap-horizontal-outline"
                  size={18}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.quickAddLabel}>Add transaction</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAddItem}
              activeOpacity={0.85}
              onPress={handleQuickAddRecurring}
            >
              <View
                style={[styles.quickAddIconWrap, styles.quickAddRecurringIcon]}
              >
                <Ionicons name="repeat-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.quickAddLabel}>Add recurring</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAddItem}
              activeOpacity={0.85}
              onPress={handleQuickAddGoal}
            >
              <View style={[styles.quickAddIconWrap, styles.quickAddGoalIcon]}>
                <Ionicons name="flag-outline" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.quickAddLabel}>Add goal</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      ) : null}

      <Modal
        visible={showNetWorthModal}
        transparent
        animationType="slide"
        onRequestClose={closeSetupModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeSetupModal} />

          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>Edit Financial Setup</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.sheetField}>
                <Text style={styles.sheetLabel}>Net Worth</Text>
                <TextInput
                  style={styles.sheetInput}
                  placeholder="0.00"
                  placeholderTextColor="#6F707C"
                  keyboardType="decimal-pad"
                  value={netWorthInput}
                  onChangeText={setNetWorthInput}
                />
              </View>

              <View style={styles.sheetField}>
                <Text style={styles.sheetLabel}>Monthly Income</Text>
                <TextInput
                  style={styles.sheetInput}
                  placeholder="0.00"
                  placeholderTextColor="#6F707C"
                  keyboardType="decimal-pad"
                  value={monthlyIncomeInput}
                  onChangeText={setMonthlyIncomeInput}
                />
              </View>

              <View style={styles.sheetField}>
                <Text style={styles.sheetLabel}>Monthly Budget</Text>
                <TextInput
                  style={styles.sheetInput}
                  placeholder="0.00"
                  placeholderTextColor="#6F707C"
                  keyboardType="decimal-pad"
                  value={monthlyBudgetInput}
                  onChangeText={setMonthlyBudgetInput}
                />
              </View>
            </ScrollView>

            <View style={styles.sheetButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeSetupModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleUpdateSetup}
                disabled={setupLoading}
              >
                <Text style={styles.submitButtonText}>
                  {setupLoading ? "Saving..." : "Save Setup"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showAddTransactionModal}
        transparent
        animationType="slide"
        onRequestClose={closeAddTransactionModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={closeAddTransactionModal}
          />

          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>
              {editingTransactionId ? "Edit Transaction" : "Add Transaction"}
            </Text>

            <View style={styles.typeToggleRow}>
              <TouchableOpacity
                style={[
                  styles.typeToggleButton,
                  transactionType === "expense" &&
                    styles.typeToggleButtonActive,
                ]}
                onPress={() => setTransactionType("expense")}
              >
                <Text
                  style={[
                    styles.typeToggleText,
                    transactionType === "expense" &&
                      styles.typeToggleTextActive,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeToggleButton,
                  transactionType === "income" && styles.typeToggleButtonActive,
                ]}
                onPress={() => setTransactionType("income")}
              >
                <Text
                  style={[
                    styles.typeToggleText,
                    transactionType === "income" && styles.typeToggleTextActive,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetContent}
            >
              <View style={styles.sheetField}>
                <Text style={styles.sheetLabel}>Transaction Name</Text>
                <TextInput
                  style={styles.sheetInput}
                  placeholder="e.g. Chipotle, Paycheck"
                  placeholderTextColor="#6F707C"
                  value={transactionName}
                  onChangeText={setTransactionName}
                />
              </View>

              <View style={styles.sheetField}>
                <Text style={styles.sheetLabel}>Amount</Text>
                <TextInput
                  style={styles.sheetInput}
                  placeholder="0.00"
                  placeholderTextColor="#6F707C"
                  keyboardType="decimal-pad"
                  value={transactionAmount}
                  onChangeText={setTransactionAmount}
                />
              </View>

              <View style={styles.sheetField}>
                <Text style={styles.sheetLabel}>Date</Text>
                <TouchableOpacity
                  style={styles.sheetInput}
                  activeOpacity={0.8}
                  onPress={() => setShowDatePicker((prev) => !prev)}
                >
                  <Text style={styles.datePickerText}>
                    {formatDisplayDate(transactionDateValue)}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <View style={styles.datePickerWrap}>
                    <DateTimePicker
                      value={transactionDateValue}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      themeVariant="dark"
                      onChange={handleDateChange}
                    />
                  </View>
                )}
              </View>

              <View style={styles.sheetField}>
                <Text style={styles.sheetLabel}>Category</Text>
                <View style={styles.categoryPillWrap}>
                  {categories.map((category) => {
                    const isSelected = selectedCategoryId === category.id;

                    return (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryPill,
                          isSelected && {
                            borderColor: category.color,
                            backgroundColor: `${category.color}22`,
                          },
                        ]}
                        onPress={() => setSelectedCategoryId(category.id)}
                      >
                        <Text
                          style={[
                            styles.categoryPillText,
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

              <TouchableOpacity
                style={styles.budgetToggleRow}
                activeOpacity={0.75}
                onPress={() => setCountTowardBudget((prev) => !prev)}
              >
                <View
                  style={[
                    styles.budgetToggleIcon,
                    countTowardBudget && styles.budgetToggleIconActive,
                  ]}
                >
                  {countTowardBudget ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : null}
                </View>
                <View style={styles.budgetToggleTextWrap}>
                  <Text style={styles.budgetToggleTitle}>
                    Count toward budget
                  </Text>
                  <Text style={styles.budgetToggleSubtitle}>
                    Turn off for transfers or one-time exceptions.
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.sheetButtonRow}>
              {editingTransactionId ? (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeleteTransaction}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeAddTransactionModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.submitButton}
                onPress={
                  editingTransactionId
                    ? handleUpdateTransaction
                    : handleAddTransaction
                }
                disabled={addTransactionLoading}
              >
                <Text style={styles.submitButtonText}>
                  {addTransactionLoading
                    ? editingTransactionId
                      ? "Saving..."
                      : "Adding..."
                    : editingTransactionId
                      ? "Save Changes"
                      : "Add Transaction"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function TransactionRow({ transaction, onPress }) {
  return (
    <TouchableOpacity
      style={styles.transactionRow}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View
        style={[
          styles.transactionIcon,
          { backgroundColor: transaction.iconBackground },
        ]}
      >
        <Ionicons
          name={transaction.icon}
          color={transaction.iconColor}
          size={20}
        />
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionTitle}>{transaction.title}</Text>
        <Text style={styles.transactionSubtitle}>
          {transaction.category} · {transaction.date}
        </Text>
        {transaction.isRecurring ? (
          <View style={styles.recurringBadge}>
            <Ionicons name="repeat-outline" size={11} color="#8E6CFF" />
            <Text style={styles.recurringBadgeText}>Recurring</Text>
          </View>
        ) : null}
        {transaction.excludesBudget ? (
          <View style={styles.noBudgetBadge}>
            <Ionicons name="wallet-outline" size={11} color="#F4C542" />
            <Text style={styles.noBudgetBadgeText}>Not budgeted</Text>
          </View>
        ) : null}
      </View>
      <Text
        style={[
          styles.transactionAmount,
          transaction.isIncome && styles.incomeAmount,
        ]}
      >
        {transaction.amount}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingTop: 42,
  },

  // Header
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  greeting: {
    marginTop: 15,
    color: "#8B8B98",
    fontSize: 14,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#6C63FF",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // Net Worth Hero Card
  netWorthCard: {
    backgroundColor: "#12131B",
    borderColor: "#2a2860",
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
    paddingBottom: 18,
    paddingHorizontal: 20,
    paddingTop: 20,
    position: "relative",
  },
  netWorthGlow: {
    backgroundColor: "#6C63FF",
    borderRadius: 200,
    height: 200,
    opacity: 0.07,
    position: "absolute",
    right: -60,
    top: -80,
    width: 200,
  },
  netWorthLabel: {
    color: "#6B6B7E",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
    marginBottom: 10,
  },
  netWorthAmount: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -1,
    marginBottom: 8,
  },
  netWorthSub: {
    color: "#56D37F",
    fontSize: 13,
    fontWeight: "500",
  },
  netWorthSubNegative: {
    color: "#FF6B6B",
  },

  // Summary row
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: "#12131B",
    borderColor: "#242633",
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  summaryLabel: {
    color: "#A5A5B2",
    fontSize: 12,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  summaryValueSaved: {
    fontSize: 15,
  },
  summaryCaption: {
    color: "#6F707C",
    fontSize: 11,
    marginTop: 4,
  },

  // Budget card
  budgetCard: {
    backgroundColor: "#12131B",
    borderColor: "#242633",
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    padding: 14,
  },
  budgetCardDanger: {
    borderColor: "rgba(255,107,107,0.65)",
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  budgetPercent: {
    color: "#F4C542",
    fontSize: 13,
    fontWeight: "700",
  },
  progressTrack: {
    backgroundColor: "#2B2C35",
    borderRadius: 8,
    height: 6,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: "#F4C542",
    borderRadius: 8,
    height: "100%",
  },
  budgetFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  mutedText: {
    color: "#8B8B98",
    fontSize: 12,
  },

  // Transactions
  transactionsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  link: {
    color: "#8E6CFF",
    fontSize: 13,
  },
  listContainer: {
    flex: 1,
  },
  transactionList: {
    paddingBottom: 100,
  },
  emptyTransactionsText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 13,
    marginTop: 10,
  },
  transactionRow: {
    alignItems: "center",
    borderBottomColor: "#1B1C24",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingVertical: 14,
  },
  transactionIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    marginRight: 12,
    width: 42,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  transactionSubtitle: {
    color: "#7C7D88",
    fontSize: 12,
    marginTop: 3,
  },
  recurringBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(108,99,255,0.12)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  recurringBadgeText: {
    color: "#8E6CFF",
    fontSize: 10,
    fontWeight: "600",
  },
  noBudgetBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(244,197,66,0.12)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  noBudgetBadgeText: {
    color: "#F4C542",
    fontSize: 10,
    fontWeight: "600",
  },
  transactionAmount: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  incomeAmount: {
    color: "#56D37F",
  },

  // Add transaction modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  quickAddBackdrop: {
  ...StyleSheet.absoluteFillObject,
  justifyContent: "flex-end",
  alignItems: "center",
  paddingBottom: 92,
  backgroundColor: "rgba(3,4,10,0.22)",
},
  quickAddMenu: {
    gap: 10,
    alignItems: "center",
  },
  quickAddItem: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  backgroundColor: "#12131B",
  borderWidth: 1,
  borderColor: "#2B2E3B",
  borderRadius: 999,
  paddingVertical: 10,
  paddingLeft: 12,
  paddingRight: 18,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.25,
  shadowRadius: 14,
  elevation: 8,
},
  quickAddIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  quickAddTxIcon: {
    backgroundColor: "#2B235A",
  },
  quickAddRecurringIcon: {
    backgroundColor: "#16324F",
  },
  quickAddGoalIcon: {
    backgroundColor: "#153B2B",
  },
  quickAddLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
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
    maxHeight: "82%",
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
  categoryPillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#242633",
    backgroundColor: "#0E1016",
  },
  categoryPillText: {
    color: "#D7D9E0",
    fontSize: 13,
    fontWeight: "500",
  },
  budgetToggleRow: {
    alignItems: "center",
    backgroundColor: "#0E1016",
    borderColor: "#242633",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
    padding: 14,
  },
  budgetToggleIcon: {
    alignItems: "center",
    borderColor: "#3A3D4A",
    borderRadius: 10,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  budgetToggleIconActive: {
    backgroundColor: "#6C63FF",
    borderColor: "#6C63FF",
  },
  budgetToggleTextWrap: {
    flex: 1,
  },
  budgetToggleTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  budgetToggleSubtitle: {
    color: "#7C7D88",
    fontSize: 11,
    marginTop: 3,
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
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  // FAB
  addButton: {
    alignItems: "center",
    backgroundColor: "#6C63FF",
    borderRadius: 28,
    bottom: 20,
    height: 50,
    justifyContent: "center",
    marginLeft: -25,
    position: "absolute",
    right: 185,
    width: 50,
  },
});
