import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";

const MESSAGES = [
  "Setting up your profile...",
  "Crunching your numbers...",
  "Personalising your dashboard...",
  "Almost there...",
  "Welcome to Lumen ✦",
];

const STEP_DURATION = 1000; // ms per message

export default function LoadingScreen() {
  const router = useRouter();
  const [messageIndex, setMessageIndex] = useState(0);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate progress bar across full duration
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: MESSAGES.length * STEP_DURATION,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    // Cycle through messages
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current < MESSAGES.length) {
        // Fade out → update → fade in
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setMessageIndex(current);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        });
      } else {
        clearInterval(interval);
        setTimeout(() => router.replace("/(tabs)/home"), 600);
      }
    }, STEP_DURATION);

    return () => clearInterval(interval);
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Text style={styles.logo}>lumen</Text>

      {/* Glow orb */}
      <View style={styles.orbWrap}>
        <View style={styles.orb} />
        <Image
          source={require("../assets/images/moon.png")}
          style={styles.moon}
          resizeMode="contain"
        />
      </View>

      {/* Message */}
      <Animated.Text style={[styles.message, { opacity: fadeAnim }]}>
        {MESSAGES[messageIndex]}
      </Animated.Text>

      {/* Progress bar */}
      <View style={styles.trackOuter}>
        <Animated.View style={[styles.trackInner, { width: progressWidth }]} />
      </View>

      <Text style={styles.tagline}>Bringing clarity to your finances.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d1a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  logo: {
    color: "#a78bfa",
    fontSize: 18,
    letterSpacing: 6,
    textTransform: "uppercase",
  },
  orb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#a78bfa",
    opacity: 0.12,
    marginBottom: 48,
    // soft glow effect via shadow
    shadowColor: "#a78bfa",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
  },
  message: {
    color: "#f0f0ff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 32,
    minHeight: 28,
  },
  trackOuter: {
    width: "100%",
    height: 4,
    backgroundColor: "#1e1b3a",
    borderRadius: 99,
    overflow: "hidden",
    marginBottom: 24,
  },
  trackInner: {
    height: "100%",
    backgroundColor: "#a78bfa",
    borderRadius: 99,
  },
  tagline: {
    color: "#444",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  orbWrap: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 48,
  },
  orb: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#a78bfa",
    opacity: 0.12,
    shadowColor: "#a78bfa",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
  },
  moon: {
    width: 90,
    height: 90,
  },
});
