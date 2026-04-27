import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function Profile() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const stars = useMemo(() => buildStars(width, height), [width, height]);

  //name, initials
  const [fullName, setFullName] = useState("");
  const [initials, setInitials] = useState("");

  //grabbing email
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function fetchUserName() {
      // for name,initials - Step 1: ask Supabase who is currently logged in
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.log("Could not get logged-in user");
        return;
      }

      setEmail(user.email || "");

      // Step 2: use that auth user id to look up this user's row in UserInfo
      const { data, error } = await supabase
        .from("UserInfo")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.log("Could not fetch full name:", error.message);
        return;
      }

      // Step 3: save the full name into React state
      setFullName(data.full_name);

      // Step 4: turn the full name into initials
      const nameParts = data.full_name.trim().split(" ");

      // take the first letter of the first 2 name parts
      const userInitials = nameParts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");

      setInitials(userInitials);
    }

    fetchUserName();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.skyBg, { width }]} />

      {stars.map((star, index) => (
        <Star key={index} {...star} />
      ))}

      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        activeOpacity={0.5}
      >
        <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
        <Text style={styles.backLabel}>Back</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || "?"}</Text>
            </View>
          </View>
          <Text style={styles.heroName}>{fullName || "Loading..."}</Text>
          <Text style={styles.heroEmail}>{email || "Loading..."}</Text>
          <View style={styles.activeBadge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Active account</Text>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Active goals</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>62%</Text>
            <Text style={styles.statLabel}>Savings rate</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>Mar</Text>
            <Text style={styles.statLabel}>Member since</Text>
          </View>
        </View>

        {/* ── Account ── */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.menuGroup}>
          <MenuRow
            icon="person-outline"
            iconBg="#1C1A3A"
            iconColor="#8E6CFF"
            title="Personal information"
            subtitle="Name, email, phone"
            onPress={() => console.log("Personal info")}
          />
          <MenuRow
            icon="lock-closed-outline"
            iconBg="#112B1D"
            iconColor="#56D37F"
            title="Security"
            subtitle="Password, 2FA"
            onPress={() => console.log("Security")}
            isLast
          />
        </View>

        {/* ── Preferences ── */}
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.menuGroup}>
          <MenuRow
            icon="notifications-outline"
            iconBg="#2A2210"
            iconColor="#F4C542"
            title="Notifications"
            subtitle="Alerts and reminders"
            badge="3"
            badgeColor="#6C63FF"
            onPress={() => console.log("Notifications")}
          />
          <MenuRow
            icon="cash-outline"
            iconBg="#112531"
            iconColor="#5ED6FF"
            title="Currency"
            subtitle="USD — US Dollar"
            onPress={() => console.log("Currency")}
          />
          <MenuRow
            icon="sparkles-outline"
            iconBg="#1C1A3A"
            iconColor="#8E6CFF"
            title="AI Insights"
            subtitle="Monthly report enabled"
            badge="On"
            badgeColor="#56D37F"
            onPress={() => console.log("AI Insights")}
            isLast
          />
        </View>

        {/* ── Support ── */}
        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.menuGroup}>
          <MenuRow
            icon="help-circle-outline"
            iconBg="#2A2210"
            iconColor="#F4C542"
            title="Help & FAQ"
            onPress={() => console.log("Help")}
          />
          <MenuRow
            icon="document-text-outline"
            iconBg="#1B1C24"
            iconColor="#8B8B98"
            title="Privacy policy"
            onPress={() => console.log("Privacy")}
            isLast
          />
        </View>

        {/* -- Logout -- */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPressIn={() => console.log("logout")}
          onPress={handleLogout}
          activeOpacity={0.3}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ── Reusable menu row component ──
function MenuRow({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  badge,
  badgeColor,
  onPress,
  isLast,
}) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, isLast && styles.menuRowLast]}
      onPress={onPress}
      activeOpacity={0.5}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>

      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>

      {badge ? (
        <View
          style={[styles.menuBadge, { backgroundColor: badgeColor + "26" }]}
        >
          <Text style={[styles.menuBadgeText, { color: badgeColor }]}>
            {badge}
          </Text>
        </View>
      ) : null}

      <Ionicons
        name="chevron-forward"
        size={16}
        color="rgba(255,255,255,0.2)"
      />
    </TouchableOpacity>
  );
}

// ── Star animation (same as home.js) ──
function Star({ x, y, size, delay }) {
  const opacity = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    const loop = () =>
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 2000 + Math.random() * 1000,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.05,
          duration: 2000 + Math.random() * 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]).start(loop);

    loop();
  }, [delay, opacity]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#fff",
        opacity,
      }}
    />
  );
}

function buildStars(width, height) {
  const stars = [];
  for (let i = 0; i < 100; i += 1) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 1 + Math.random() * 2.5,
      delay: Math.random() * 2000,
    });
  }
  return stars;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0f0e28",
  },
  skyBg: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    backgroundColor: "#0f0e28",
  },

  // Back button
  backBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    left: 16,
    position: "absolute",
    top: 54,
    zIndex: 50,
  },
  backLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },

  // Scroll
  scroll: {
    flex: 1,
    marginTop: 44,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 40,
  },

  // Hero
  hero: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarRing: {
    alignItems: "center",
    borderColor: "rgba(108,99,255,0.45)",
    borderRadius: 46,
    borderWidth: 2,
    height: 92,
    justifyContent: "center",
    marginBottom: 14,
    width: 92,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#6C63FF",
    borderRadius: 38,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "500",
  },
  heroName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  heroEmail: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
  },
  activeBadge: {
    alignItems: "center",
    backgroundColor: "rgba(108,99,255,0.12)",
    borderColor: "rgba(108,99,255,0.28)",
    borderRadius: 20,
    borderWidth: 0.5,
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  badgeDot: {
    backgroundColor: "#6C63FF",
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  badgeText: {
    color: "rgba(108,99,255,0.9)",
    fontSize: 11,
    fontWeight: "500",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statBox: {
    alignItems: "center",
    backgroundColor: "#12131B",
    borderColor: "#242633",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 14,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 10,
  },

  // Section label
  sectionLabel: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: "uppercase",
  },

  // Menu group
  menuGroup: {
    backgroundColor: "#12131B",
    borderColor: "#242633",
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    overflow: "hidden",
  },
  menuRow: {
    alignItems: "center",
    borderBottomColor: "#1B1C24",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 13,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuIconWrap: {
    alignItems: "center",
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
  },
  menuSubtitle: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    marginTop: 2,
  },
  menuBadge: {
    borderRadius: 10,
    marginRight: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  menuBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },

  // Logout
  logoutBtn: {
    alignItems: "center",
    backgroundColor: "rgba(255,70,70,0.07)",
    borderColor: "rgba(255,80,80,0.22)",
    borderRadius: 16,
    borderWidth: 0.5,
    justifyContent: "center",
    paddingVertical: 16,
  },
  logoutText: {
    color: "rgba(255,100,100,0.88)",
    fontSize: 15,
    fontWeight: "500",
  },

  bottomSpacer: {
    height: 100,
  },
});
