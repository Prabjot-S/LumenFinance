import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const goals = [
  {
    id: "1",
    name: "Emergency fund",
    icon: "🏠",
    pct: "76%",
    width: "76%",
    bgColor: "rgba(74,222,128,0.12)",
    badgeColor: "rgba(74,222,128,0.9)",
    fillColor: "#4ade80",
    saved: "$3,800",
    eta: "On track · Est. May 2026",
    target: "of $5,000",
  },
  {
    id: "2",
    name: "Vacation fund",
    icon: "✈️",
    pct: "40%",
    width: "40%",
    bgColor: "rgba(251,191,36,0.12)",
    badgeColor: "rgba(251,191,36,0.9)",
    fillColor: "#fbbf24",
    saved: "$800",
    eta: "On track · Est. Aug 2026",
    target: "of $2,000",
  },
  {
    id: "3",
    name: "Investment portfolio",
    icon: "📈",
    pct: "29%",
    width: "29%",
    bgColor: "rgba(108,99,255,0.12)",
    badgeColor: "rgba(108,99,255,0.9)",
    fillColor: "#6C63FF",
    saved: "$1,450",
    eta: "Behind · Est. Feb 2027",
    target: "of $5,000",
  },
];

export default function Goals() {
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Goals</Text>
            <Text style={styles.pageSubtitle}>3 active goals</Text>
          </View>
        </View>

        <View style={styles.goalsList}>
          {goals.map((goal) => (
            <View key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <View style={[styles.goalIcon, { backgroundColor: goal.bgColor }]}>
                  <Text style={{ fontSize: 16 }}>{goal.icon}</Text>
                </View>
                <Text style={styles.goalName}>{goal.name}</Text>
                <View style={[styles.goalPctBadge, { backgroundColor: goal.bgColor }]}>
                  <Text style={[styles.goalPctText, { color: goal.badgeColor }]}>{goal.pct}</Text>
                </View>
              </View>
              <View style={styles.goalBarBg}>
                <View style={[styles.goalBarFill, { width: goal.width, backgroundColor: goal.fillColor }]} />
              </View>
              <View style={styles.goalFooter}>
                <View>
                  <Text style={styles.goalSaved}>
                    Saved <Text style={styles.goalSavedSpan}>{goal.saved}</Text>
                  </Text>
                  <Text style={styles.goalEta}>{goal.eta}</Text>
                </View>
                <Text style={styles.goalTarget}>{goal.target}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.setNewGoal} activeOpacity={0.7}>
            <Ionicons name="add" size={16} color="rgba(108,99,255,0.8)" />
            <Text style={styles.setNewGoalText}>Set new goal</Text>
          </TouchableOpacity>
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
  goalsList: {
    paddingHorizontal: 8,
    marginTop: 4,
  },
  goalCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  goalIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  goalName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
    flex: 1,
  },
  goalPctBadge: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 20,
  },
  goalPctText: {
    fontSize: 11,
    fontWeight: "500",
  },
  goalBarBg: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  goalBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  goalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  goalSaved: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
  goalSavedSpan: {
    color: "#FFFFFF",
    fontFamily: "monospace",
    fontSize: 13,
  },
  goalEta: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    marginTop: 4,
  },
  goalTarget: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
  },
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
  setNewGoalText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
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