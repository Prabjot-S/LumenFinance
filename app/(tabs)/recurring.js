import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const subscriptions = [
  {
    id: "1",
    name: "Spotify Premium",
    next: "Next: Apr 1",
    amount: "-$9.99",
    freq: "Monthly",
    icon: "musical-notes",
    iconBg: "rgba(108,99,255,0.12)",
    iconColor: "#6C63FF",
  },
  {
    id: "2",
    name: "Netflix",
    next: "Next: Apr 3",
    amount: "-$15.49",
    freq: "Monthly",
    icon: "play",
    iconBg: "rgba(248,113,113,0.12)",
    iconColor: "#f87171",
  },
  {
    id: "3",
    name: "iCloud Storage",
    next: "Next: Apr 5",
    amount: "-$2.99",
    freq: "Monthly",
    icon: "cloud",
    iconBg: "rgba(56,189,248,0.12)",
    iconColor: "#38bdf8",
  },
];

const bills = [
  {
    id: "4",
    name: "Rent",
    next: "Next: Apr 1",
    amount: "-$850.00",
    freq: "Monthly",
    icon: "home",
    iconBg: "rgba(251,191,36,0.12)",
    iconColor: "#fbbf24",
  },
  {
    id: "5",
    name: "ConEd Utility",
    next: "Next: Apr 11",
    amount: "-$110.00",
    freq: "Monthly",
    icon: "flash",
    iconBg: "rgba(74,222,128,0.12)",
    iconColor: "#4ade80",
  },
  {
    id: "6",
    name: "Internet",
    next: "Next: Apr 15",
    amount: "-$78.00",
    freq: "Monthly",
    icon: "wifi",
    iconBg: "rgba(56,189,248,0.12)",
    iconColor: "#38bdf8",
  },
];

export default function Recurring() {
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Recurring</Text>
            <Text style={styles.pageSubtitle}>$1,284/mo tracked</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Subscriptions</Text>
          <Text style={styles.sectionLink}>$246/mo</Text>
        </View>

        <View style={styles.recurList}>
          {subscriptions.map((item) => (
            <View key={item.id} style={styles.recurItem}>
              <View style={[styles.riIcon, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={15} color={item.iconColor} />
              </View>
              <View style={styles.riInfo}>
                <Text style={styles.riName}>{item.name}</Text>
                <Text style={styles.riNext}>{item.next}</Text>
              </View>
              <View style={styles.riRight}>
                <Text style={styles.riAmt}>{item.amount}</Text>
                <Text style={styles.riFreq}>{item.freq}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bills</Text>
          <Text style={styles.sectionLink}>$1,038/mo</Text>
        </View>

        <View style={styles.recurList}>
          {bills.map((item) => (
            <View key={item.id} style={styles.recurItem}>
              <View style={[styles.riIcon, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={15} color={item.iconColor} />
              </View>
              <View style={styles.riInfo}>
                <Text style={styles.riName}>{item.name}</Text>
                <Text style={styles.riNext}>{item.next}</Text>
              </View>
              <View style={styles.riRight}>
                <Text style={styles.riAmt}>{item.amount}</Text>
                <Text style={styles.riFreq}>{item.freq}</Text>
              </View>
            </View>
          ))}
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
  riFreq: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    marginTop: 2,
  },
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