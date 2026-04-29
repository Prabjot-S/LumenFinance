import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

const FREQUENCIES = ["Weekly", "Bi-weekly", "Monthly"];
const RECURRING_FREQ = {
  Weekly: "weekly",
  "Bi-weekly": "biweekly",
  Monthly: "monthly",
};

const toSqlDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function WelcomeSetup() {
  const router = useRouter();

  const [netWorth, setNetWorth] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [incomeFreq, setIncomeFreq] = useState("Monthly");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const parseMoney = (value) => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const toMonthly = (amount, freq) => {
    if (amount === null) return null;
    if (freq === "Weekly") return (amount * 52) / 12;
    if (freq === "Bi-weekly") return (amount * 26) / 12;
    return amount;
  };

  const handleContinue = async () => {
    setError("");

    const parsedNetWorth = parseMoney(netWorth);
    const parsedIncome = parseMoney(monthlyIncome);
    const parsedBudget = parseMoney(monthlyBudget);

    if (
      parsedNetWorth === null ||
      parsedIncome === null ||
      parsedBudget === null
    ) {
      setError("Please enter valid amounts in all fields.");
      return;
    }

    const monthlyIncomeNormalized = toMonthly(parsedIncome, incomeFreq);

    setLoading(true);

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
          net_worth: parsedNetWorth,
          monthly_income: monthlyIncomeNormalized,
          income_frequency: incomeFreq,
          monthly_budget: parsedBudget,
          is_active: true,
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      const { data: salaryCategory } = await supabase
        .from("categories")
        .select("id")
        .eq("name", "Salary")
        .single();
      if (salaryCategory) {
        const today = toSqlDate(new Date());
        const { error: recurringError } = await supabase
          .from("recurring_transactions")
          .insert({
            user_id: user.id,
            category_id: salaryCategory.id,
            name: "Paycheck",
            amount: parsedIncome,
            transaction_type: "income",
            frequency: RECURRING_FREQ[incomeFreq],
            start_date: today,
            next_due_date: today,
            is_active: true,
          });
        if (recurringError) throw recurringError;
      }

      router.replace("/loading");
    } catch (err) {
      if (err.message?.includes("User from sub claim in JWT does not exist")) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>lumen</Text>
          <Text style={styles.title}>Let&apos;s set up your finances</Text>
          <Text style={styles.subtitle}>
            This helps us personalize your dashboard.
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Net Worth</Text>
          <Text style={styles.hint}>Your total assets minus liabilities</Text>
          <View style={styles.inputRow}>
            <Text style={styles.prefix}>$</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#555"
              keyboardType="decimal-pad"
              value={netWorth}
              onChangeText={setNetWorth}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Income</Text>
          <Text style={styles.hint}>How much do you earn per pay period?</Text>
          <View style={styles.inputRow}>
            <Text style={styles.prefix}>$</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#555"
              keyboardType="decimal-pad"
              value={monthlyIncome}
              onChangeText={setMonthlyIncome}
            />
          </View>

          <View style={styles.freqRow}>
            {FREQUENCIES.map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.freqBtn,
                  incomeFreq === f && styles.freqBtnActive,
                ]}
                onPress={() => setIncomeFreq(f)}
              >
                <Text
                  style={[
                    styles.freqText,
                    incomeFreq === f && styles.freqTextActive,
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Monthly Budget Limit</Text>
          <Text style={styles.hint}>Max you want to spend per month</Text>
          <View style={styles.inputRow}>
            <Text style={styles.prefix}>$</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#555"
              keyboardType="decimal-pad"
              value={monthlyBudget}
              onChangeText={setMonthlyBudget}
            />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0d0d1a" />
          ) : (
            <Text style={styles.btnText}>Get Started</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d1a",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 40,
  },
  logo: {
    color: "#a78bfa",
    fontSize: 16,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  title: {
    color: "#f0f0ff",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#777",
    fontSize: 14,
  },
  fieldGroup: {
    marginBottom: 32,
  },
  label: {
    color: "#f0f0ff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  hint: {
    color: "#555",
    fontSize: 12,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161628",
    borderWidth: 1,
    borderColor: "#2a2a45",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  prefix: {
    color: "#777",
    fontSize: 18,
    marginRight: 6,
  },
  input: {
    flex: 1,
    color: "#f0f0ff",
    fontSize: 18,
  },
  freqRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2a45",
    alignItems: "center",
    backgroundColor: "#161628",
  },
  freqBtnActive: {
    borderColor: "#a78bfa",
    backgroundColor: "#1e1b3a",
  },
  freqText: {
    color: "#555",
    fontSize: 13,
    fontWeight: "500",
  },
  freqTextActive: {
    color: "#a78bfa",
  },
  error: {
    color: "#f87171",
    fontSize: 13,
    marginBottom: 16,
    textAlign: "center",
  },
  btn: {
    backgroundColor: "#a78bfa",
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnText: {
    color: "#0d0d1a",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
