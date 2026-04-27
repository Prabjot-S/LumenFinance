import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const periods = ["W", "M", "6M", "Y"];



const getBarHeight = (value, maxValue, maxHeightPixels = 85) => {  // Reduced from 100 to 85
  if (value === 0) return 4;  // Minimum height for visibility
  return Math.max(4, Math.min(maxHeightPixels, (value / maxValue) * maxHeightPixels));
};

export default function Analytics() {
  const [selectedPeriod, setSelectedPeriod] = useState("M");
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState({ income: 0, spent: 0, saved: 0, savingsRate: 0 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tooltip, setTooltip] = useState({ visible: false, value: "", type: "" });  

  useEffect(() => {
    fetchData(selectedPeriod);
  }, [selectedPeriod]);

  async function fetchData(period) {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Work out date range
      const now = new Date();
      let startDate = new Date();

      if (period === "W") startDate.setDate(now.getDate() - 7);
      else if (period === "M") startDate.setMonth(now.getMonth() - 1);
      else if (period === "6M") startDate.setMonth(now.getMonth() - 6);
      else if (period === "Y") startDate.setFullYear(now.getFullYear() - 1);

      const { data: txData, error } = await supabase
      .from("transactions")
      .select(`
        amount, 
        transaction_type, 
        transaction_date, 
        categories!category_id (name, color)
      `)
      .eq("user_id", session.user.id)
      .gte("transaction_date", startDate.toISOString().split("T")[0])
      .order("transaction_date", { ascending: true });

      console.log("RAW TRANSACTIONS:", JSON.stringify(txData));
      console.log("ERROR:", error);
      console.log("Categories breakdown:", txData?.map(t => t.categories?.name));

      if (!txData) return;

      // ── Build chart groups ──────────────────────────────────
      const grouped = groupByPeriod(txData, period);
      setChartData(grouped);

      // ── Build stats ─────────────────────────────────────────
      const totalIncome = txData
        .filter(t => t.transaction_type === "income")
        .reduce((s, t) => s + Number(t.amount), 0);
      const totalSpent = txData
        .filter(t => t.transaction_type === "expense")
        .reduce((s, t) => s + Number(t.amount), 0);
      const saved = totalIncome - totalSpent;
      const savingsRate = totalIncome > 0 ? (saved / totalIncome) * 100 : 0;

      setStats({ income: totalIncome, spent: totalSpent, saved, savingsRate });

      // ── Build category breakdown ────────────────────────────
      const catMap = {};
      txData
        .filter(t => t.transaction_type === "expense")
        .forEach(t => {
          const name = t.categories?.name || "Other";
          const color = t.categories?.color || "#95A5A6";
          if (!catMap[name]) catMap[name] = { name, color, amount: 0 };
          catMap[name].amount += Number(t.amount);
        });

      const catList = Object.values(catMap).sort((a, b) => b.amount - a.amount);
      const totalExp = catList.reduce((s, c) => s + c.amount, 0);
      const catWithPercent = catList.map(c => ({
        ...c,
        percent: totalExp > 0 ? ((c.amount / totalExp) * 100).toFixed(0) + "%" : "0%",
        width: totalExp > 0 ? ((c.amount / totalExp) * 100).toFixed(0) + "%" : "0%",
      }));

      setCategories(catWithPercent);

    } catch (err) {
      console.error("Analytics fetchData error:", err);
    } finally {
      setLoading(false);
    }
  }

function groupByPeriod(txData, period) {
  const groups = {};
  const today = new Date();
  
  if (period === "W") {
    // Show all 7 days of current week (Sun-Sat)
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      groups[dateStr] = {
        id: dateStr,
        label: days[i],
        income: 0,
        expenses: 0,
        net: 0,
        date: date
      };
    }
    
    // Fill in actual transaction data
    txData.forEach(t => {
      const dateStr = t.transaction_date;
      if (groups[dateStr]) {
        if (t.transaction_type === "income") {
          groups[dateStr].income += Number(t.amount);
        } else {
          groups[dateStr].expenses += Number(t.amount);
        }
        groups[dateStr].net = groups[dateStr].income - groups[dateStr].expenses;
      }
    });
  } 
  else if (period === "M") {
    // Show week ranges based on Sunday-Saturday weeks for current month
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Find the first Sunday of the month (or earlier)
    let currentDate = new Date(firstDayOfMonth);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0) {
      currentDate.setDate(currentDate.getDate() - dayOfWeek);
    }
    
    const weekRanges = [];
    
    while (currentDate <= lastDayOfMonth) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const startDay = Math.max(weekStart.getDate(), firstDayOfMonth.getDate());
      const endDay = Math.min(weekEnd.getDate(), lastDayOfMonth.getDate());
      
      if (startDay <= endDay) {
        const label = `${startDay}-${endDay}`;
        const key = `${year}-${month}-week${weekRanges.length + 1}`;
        
        weekRanges.push({
          key: key,
          label: label,
          startDate: new Date(weekStart),
          endDate: new Date(weekEnd)
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 7);
    }
    
    // Initialize all weeks with zero values
    weekRanges.forEach(range => {
      groups[range.key] = {
        id: range.key,
        label: range.label,
        income: 0,
        expenses: 0,
        net: 0
      };
    });
    
    // Fill in actual transaction data
    txData.forEach(t => {
      const txDate = new Date(t.transaction_date);
      for (const range of weekRanges) {
        if (txDate >= range.startDate && txDate <= range.endDate) {
          if (groups[range.key]) {
            if (t.transaction_type === "income") {
              groups[range.key].income += Number(t.amount);
            } else {
              groups[range.key].expenses += Number(t.amount);
            }
            groups[range.key].net = groups[range.key].income - groups[range.key].expenses;
          }
          break;
        }
      }
    });
  } 
  else if (period === "6M") {
    // Show last 6 COMPLETE months (not including current month)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Start from 6 months ago and go to last month
    for (let i = 6; i >= 1; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${month}`;
      const monthName = months[month];
      const yearSuffix = year !== today.getFullYear() ? ` ${year.toString().slice(-2)}` : '';
      
      groups[key] = { 
        id: key, 
        label: monthName + yearSuffix, 
        income: 0, 
        expenses: 0, 
        net: 0 
      };
    }
    
    // Fill in actual data
    txData.forEach(t => {
      const date = new Date(t.transaction_date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (groups[key]) {
        if (t.transaction_type === "income") {
          groups[key].income += Number(t.amount);
        } else {
          groups[key].expenses += Number(t.amount);
        }
        groups[key].net = groups[key].income - groups[key].expenses;
      }
    });
  } 
  else if (period === "Y") {
    // Show last 4 COMPLETE quarters (not including current quarter)
    const currentQuarter = Math.floor(today.getMonth() / 3);
    const currentYear = today.getFullYear();
    
    // Generate last 4 quarters
    for (let i = 4; i >= 1; i--) {
      let quarterNum = currentQuarter - i;
      let year = currentYear;
      
      if (quarterNum < 0) {
        quarterNum += 4;
        year--;
      }
      
      const quarterNames = ["Q1 (Jan-Mar)", "Q2 (Apr-Jun)", "Q3 (Jul-Sep)", "Q4 (Oct-Dec)"];
      const key = `${year}-Q${quarterNum + 1}`;
      const yearSuffix = year !== currentYear ? ` ${year}` : '';
      
      groups[key] = { 
        id: key, 
        label: quarterNames[quarterNum] + yearSuffix, 
        income: 0, 
        expenses: 0, 
        net: 0 
      };
    }
    
    // Fill in actual data
    txData.forEach(t => {
      const date = new Date(t.transaction_date);
      const quarter = Math.floor(date.getMonth() / 3);
      const year = date.getFullYear();
      const key = `${year}-Q${quarter + 1}`;
      
      if (groups[key]) {
        if (t.transaction_type === "income") {
          groups[key].income += Number(t.amount);
        } else {
          groups[key].expenses += Number(t.amount);
        }
        groups[key].net = groups[key].income - groups[key].expenses;
      }
    });
  }

  return Object.values(groups);
}
const getMaxValue = (data) => {
  let max = 0;
  data.forEach((item) => {
    if (item.income > max) max = item.income;
    if (item.expenses > max) max = item.expenses;
  });
  return max || 1;
};

const chartItems = chartData.length > 0 ? chartData : [{ id: "empty", label: "-", income: 0, expenses: 0, net: 0 }];
const maxValue = getMaxValue(chartItems);


  const statsCards = [
    { label: "Total income", value: `$${stats.income.toLocaleString()}`, change: "this period", trend: "up" },
    { label: "Total spent", value: `$${stats.spent.toLocaleString()}`, change: "this period", trend: "down" },
    { label: "Saved", value: `$${Math.max(stats.saved, 0).toLocaleString()}`, change: "this period", trend: "up" },
    { label: "Savings rate", value: `${stats.savingsRate.toFixed(0)}%`, change: stats.savingsRate >= 20 ? "On track" : "Below target", trend: stats.savingsRate >= 20 ? "up" : "down" },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Analytics</Text>
            <Text style={styles.pageSubtitle}>
              {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </Text>
          </View>
        </View>

        {/* Period Tabs */}
        <View style={styles.periodTabs}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodTab, period === selectedPeriod && styles.periodTabActive]}
              activeOpacity={0.7}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={period === selectedPeriod ? styles.periodTabLabelActive : styles.periodTabLabel}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart */}
        <View style={styles.chartSection}>
          {loading ? (
            <View style={styles.chartPlaceholder}>
              <Text style={styles.loadingText}>Loading chart...</Text>
            </View>
          ) : (
            <>
              {/* Global Tooltip - shows at top of chart */}
              {tooltip.visible && (
                <View style={styles.globalTooltip}>
                  <Text style={tooltip.type === 'income' ? styles.globalTooltipIncome : styles.globalTooltipExpense}>
                    {tooltip.type === 'income' ? 'Income: ' : 'Expenses: '}{tooltip.value}
                  </Text>
                </View>
              )}
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chartScrollContent}
              >
                <View style={styles.chartBars}>
                  {chartItems.map((item, index) => {
                    const incomeHeight = item.income > 0 ? Math.max(8, (item.income / maxValue) * 100) : 4;
                    const expenseHeight = item.expenses > 0 ? Math.max(8, (item.expenses / maxValue) * 100) : 4;
                    const netValue = item.net;
                    const isPositive = netValue >= 0;
                    
                    return (
                      <View key={item.id} style={styles.barColumn}>
                        <View style={styles.barGroup}>
                          {/* Income Bar (Purple) */}
                          <TouchableOpacity 
                            style={[styles.bar, styles.incomeBar, { height: incomeHeight }]}
                            activeOpacity={0.7}
                            onPress={() => {
                              setTooltip({
                                visible: true,
                                value: `$${item.income.toLocaleString()}`,
                                type: 'income'
                              });
                              setTimeout(() => setTooltip({ visible: false, value: "", type: "" }), 1500);
                            }}
                          />
                          
                          {/* Expense Bar (Grey) */}
                          <TouchableOpacity 
                            style={[styles.bar, styles.expenseBar, { height: expenseHeight }]}
                            activeOpacity={0.7}
                            onPress={() => {
                              setTooltip({
                                visible: true,
                                value: `$${item.expenses.toLocaleString()}`,
                                type: 'expense'
                              });
                              setTimeout(() => setTooltip({ visible: false, value: "", type: "" }), 1500);
                            }}
                          />
                        </View>
                        <Text style={styles.barLabel}>{item.label}</Text>
                        <Text style={[
                          styles.barUnit,
                          isPositive ? styles.positiveText : styles.negativeText
                        ]}>
                          {isPositive ? `+$${netValue.toLocaleString()}` : `-$${Math.abs(netValue).toLocaleString()}`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          )}

          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "rgba(108,99,255,0.7)" }]} />
              <Text style={styles.legendText}>Income (tap)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
              <Text style={styles.legendText}>Expenses (tap)</Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statsCards.map((item) => (
            <View key={item.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{item.label}</Text>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={item.trend === "up" ? [styles.statChange, styles.statChangeUp] : [styles.statChange, styles.statChangeDown]}>
                {item.change}
              </Text>
            </View>
          ))}
        </View>

        {/* Category Breakdown */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>By category</Text>
        </View>

        <View style={styles.categoryList}>
          {categories.length === 0 ? (
            <Text style={styles.emptyText}>No expense data for this period.</Text>
          ) : (
            categories.map((category) => (
              <View key={category.name} style={styles.categoryItem}>
                <View style={styles.categoryRow}>
                  <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryAmount}>${category.amount.toLocaleString()}</Text>
                  <Text style={styles.categoryPercent}>{category.percent}</Text>
                </View>
                <View style={styles.categoryBarBackground}>
                  <View style={[styles.categoryBarFill, { width: category.width, backgroundColor: category.color }]} />
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity style={styles.addButton} activeOpacity={0.3}>
        <Ionicons name="add" color="#FFFFFF" size={32} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "transparent" },
  contentContainer: { paddingHorizontal: 16, paddingTop: 48 },
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  pageTitle: { color: "#FFFFFF", fontSize: 28, fontWeight: "700" },
  pageSubtitle: { color: "#A5A5B2", marginTop: 4, fontSize: 13 },
  periodTabs: { flexDirection: "row", gap: 8, marginTop: 12, marginBottom: 20, padding: 4, backgroundColor: "#12131B", borderRadius: 12 },
  periodTab: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#12131B" },
  periodTabActive: { backgroundColor: "#6C63FF" },
  periodTabLabel: { color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: "500" },
  periodTabLabelActive: { color: "#FFFFFF", fontSize: 12, fontWeight: "500" },
chartSection: { 
  marginTop: 0, 
  marginBottom: 4,
  minHeight: 260,
},
chartScrollContent: {
  paddingHorizontal: 8,
  minHeight: 180,
},
chartBars: { 
  flexDirection: "row", 
  alignItems: "flex-end", 
  gap: 16,
  paddingHorizontal: 8,
  paddingVertical: 4,
  marginBottom: 8,
  minHeight: 160,
},
barColumn: { 
  alignItems: "center", 
  justifyContent: "flex-end", 
  width: 100,  
  height: 100,
},
barGroup: { 
  flexDirection: "row", 
  alignItems: "flex-end", 
  justifyContent: "center", 
  gap: 6, 
  height: 100,
  width: "100%",
  marginTop: 20,
},
bar: { 
  width: 26, 
  borderRadius: 6, 
  minHeight: 4,
  maxHeight: 100,
},
incomeBar: { 
  backgroundColor: "rgba(108,99,255,0.7)" 
},
expenseBar: { 
  backgroundColor: "rgba(255,255,255,0.15)" 
},
barLabel: { 
  marginTop: 10, 
  fontSize: 12, 
  fontWeight: "600", 
  color: "rgba(255,255,255,0.7)" 
},
barUnit: { 
  marginTop: 4, 
  fontSize: 10, 
  fontWeight: "500",
  color: "rgba(255,255,255,0.6)" 
},
positiveText: { 
  color: "#4ECDC4"
},
negativeText: { 
  color: "#FF6B6B"
},
barColumn: { 
  flex: 1, 
  alignItems: "center", 
  justifyContent: "flex-end", 
  height: 130, 
},
barGroup: { 
  flexDirection: "row", 
  alignItems: "flex-end", 
  justifyContent: "center", 
  gap: 4, 
  height: 100,  // Fixed height for bars container
  width: "100%",
},
bar: { 
  width: 28,  // Fixed width instead of percentage
  borderRadius: 6, 
  minHeight: 4,
  maxHeight: 100,
},
incomeBar: { 
  backgroundColor: "rgba(108,99,255,0.7)" 
},
expenseBar: { 
  backgroundColor: "rgba(255,255,255,0.15)" 
},
barLabel: { 
  marginTop: 8,  // Reduced from 10
  fontSize: 11, 
  fontWeight: "600", 
  color: "rgba(255,255,255,0.7)" 
},
barUnit: { 
  marginTop: 2,  // Reduced from 4
  fontSize: 9, 
  color: "rgba(255,255,255,0.4)" 
},
barWithValue: {
  position: 'relative',
},
barTooltip: {
  position: 'absolute',
  bottom: '100%',
  backgroundColor: '#2C3E50',
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
  marginBottom: 4,
},
barTooltipText: {
  color: '#fff',
  fontSize: 10,
},
tooltip: {
  position: 'absolute',
  bottom: '100%',
  left: '50%',
  transform: [{ translateX: -30 }],
  backgroundColor: '#2C3E50',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 8,
  marginBottom: 8,
  minWidth: 80,
  alignItems: 'center',
  zIndex: 1000,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 3,
},
tooltipText: {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '600',
},
tooltipIncomeText: {
  color: '#4ECDC4',
  fontSize: 12,
  fontWeight: '600',
},
tooltipExpenseText: {
  color: '#FF6B6B',
  fontSize: 12,
  fontWeight: '600',
},
floatingTooltip: {
  position: 'absolute',
  top: '40%',
  left: '50%',
  transform: [{ translateX: -70 }],
  backgroundColor: '#2C3E50',
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 12,
  alignItems: 'center',
  zIndex: 1000,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 5,
},
floatingTooltipText: {
  color: '#4ECDC4',
  fontSize: 14,
  fontWeight: '700',
},
globalTooltip: {
  backgroundColor: '#2C3E50',
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 12,
  marginBottom: 12,
  marginTop: 0,
  alignSelf: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 3,
},
globalTooltipIncome: {
  color: '#4ECDC4',
  fontSize: 14,
  fontWeight: '700',
  textAlign: 'center',
},
globalTooltipExpense: {
  color: '#FF6B6B',
  fontSize: 14,
  fontWeight: '700',
  textAlign: 'center',
},
chartLegend: { flexDirection: "row", gap: 14, marginTop: 14, marginHorizontal: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { color: "rgba(255,255,255,0.6)", fontSize: 11 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10, marginTop: 18 },
  statCard: { backgroundColor: "#12131B", borderRadius: 20, borderWidth: 1, borderColor: "#242633", padding: 14, width: "48%" },
  statLabel: { fontSize: 12, color: "#A5A5B2", marginBottom: 8 },
  statValue: { fontSize: 19, fontWeight: "700", color: "#FFFFFF", fontFamily: "monospace" },
  statChange: { marginTop: 6, fontSize: 11 },
  statChangeUp: { color: "#4ade80" },
  statChangeDown: { color: "#f87171" },
  sectionHeader: { marginTop: 24, marginBottom: 10 },
  sectionTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  categoryList: { paddingHorizontal: 4 },
  categoryItem: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.06)" },
  categoryRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 8 },
  categoryDot: { width: 9, height: 9, borderRadius: 3, flexShrink: 0 },
  categoryName: { flex: 1, color: "rgba(255,255,255,0.82)", fontSize: 13 },
  categoryAmount: { color: "rgba(255,255,255,0.95)", fontSize: 13, fontFamily: "monospace" },
  categoryPercent: { color: "rgba(255,255,255,0.35)", fontSize: 11 },
  categoryBarBackground: { height: 4, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" },
  categoryBarFill: { height: "100%", borderRadius: 2 },
  emptyText: { color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 8 },
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
  }
});