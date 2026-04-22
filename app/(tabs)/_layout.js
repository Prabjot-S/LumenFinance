import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";

export default function TabLayout() {
  const { width, height } = useWindowDimensions();
  const stars = useMemo(() => buildStars(width, height), [width, height]);

  return (
    <View style={styles.root}>

      {/* Background — renders once, persists across all tabs */}
      <View style={[styles.skyBg, { width, height }]} />
      {stars.map((star, index) => (
        <Star key={index} {...star} />
      ))}

      {/* Tab screens render on top */}
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#6C63FF",
          tabBarInactiveTintColor: "rgba(255,255,255,0.4)",
          tabBarStyle: {
            backgroundColor: "#0a0a0f",
            borderTopColor: "rgba(255,255,255,0.07)",
            borderTopWidth: 0.5,
            height: 78,
            paddingBottom: 12,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "500",
          },
          headerShown: false,
          // This is critical — makes each screen background transparent
          // so the shared background shows through
          tabBarBackground: () => null,
          sceneStyle: { backgroundColor: "transparent" },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <Ionicons name="home-outline" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: "Analytics",
            tabBarIcon: ({ color }) => (
              <Ionicons name="pie-chart-outline" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="goals"
          options={{
            title: "Goals",
            tabBarIcon: ({ color }) => (
              <Ionicons name="flag-outline" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="recurring"
          options={{
            title: "Recurring",
            tabBarIcon: ({ color }) => (
              <Ionicons name="repeat-outline" size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            title: "Insights",
            tabBarIcon: ({ color }) => (
              <Ionicons name="sparkles-outline" size={22} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

// --- Copy these exactly from your home.js ---

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
  for (let i = 0; i < 100; i++) {
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
  root: {
    flex: 1,
    backgroundColor: "#0f0e28",
  },
  skyBg: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#0f0e28",
  },
});