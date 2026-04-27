import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Easing,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from "react-native";
import { supabase } from "../lib/supabase";

// ── Twinkling star ────────────────────────────────────────────────────────────
function Star({ x, y, size, delay }) {
  const opacity = useRef(new Animated.Value(0.15)).current;
  useEffect(() => {
    const loop = () =>
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 1000 + Math.random() * 800,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.15,
          duration: 1000 + Math.random() * 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]).start(loop);
    loop();
  }, []);
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

function buildStars(w) {
  return [
    { x: w * 0.01, y: 55, size: 2.6, delay: 0 },
    { x: w * 0.16, y: 30, size: 1.8, delay: 300 },
    { x: w * 0.29, y: 65, size: 2, delay: 600 },
    { x: w * 0.41, y: 22, size: 1.6, delay: 150 },
    { x: w * 0.5, y: 40, size: 2.2, delay: 900 },
    { x: w * 0.61, y: 18, size: 1.6, delay: 450 },
    { x: w * 0.73, y: 55, size: 2, delay: 750 },
    { x: w * 0.83, y: 32, size: 1.8, delay: 200 },
    { x: w * 0.93, y: 65, size: 2.6, delay: 550 },
    { x: w * 0.11, y: 90, size: 1.4, delay: 800 },
    { x: w * 0.77, y: 88, size: 1.4, delay: 100 },
    { x: w * 0.23, y: 110, size: 1.2, delay: 650 },
    { x: w * 0.65, y: 105, size: 1.2, delay: 350 },
    { x: w * 0.35, y: 140, size: 1.0, delay: 500 },
    { x: w * 0.88, y: 125, size: 1.0, delay: 720 },
  ];
}

// ── Moon logo from asset ──────────────────────────────────────────────────────
function CrescentMoon() {
  return (
    <Image
      source={require("../assets/images/moon.png")}
      style={{ width: 160, height: 160 }}
      resizeMode="contain"
    />
  );
}

// ── Verify email screen ───────────────────────────────────────────────────────
export default function VerifyEmail() {
  const { width } = useWindowDimensions();
  const stars = buildStars(width);
  const router = useRouter();
  const { data } = useLocalSearchParams();

  const hasHandledVerification = useRef(false);

  const [loading, setLoading] = useState(false);
  const [signupData, setSignupData] = useState(null);


  useEffect(() => {
    if (data) {
      setSignupData(JSON.parse(data));
    }
  }, [data]);

  useEffect(() => {
    // Listen for auth state changes (email verification)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user?.email_confirmed_at) {
          // Email verified, insert UserInfo
          if (signupData) {
            if (hasHandledVerification.current) return;
            hasHandledVerification.current = true;
            const phoneDigits = signupData.phone.replace(/\D/g, "");

            const { error } = await supabase.from("UserInfo").upsert({
              user_id: session.user.id,
              full_name: signupData.fullName.trim(),
              phone_num: phoneDigits ? parseInt(phoneDigits, 10) : null,
              email: signupData.email.trim(),
            });

            if (error) {
              Alert.alert("Error", "Profile setup failed: " + error.message);
              return;
            }

            //insert for accounts table
            const { error: accountError } = await supabase
              .from("accounts")
              .upsert({
                user_id: session.user.id,
                is_active: true,
                net_worth: null,
              });

            if (accountError) {
              Alert.alert(
                "Error: accountError",
                "Profile setup failed: " + accountError.message,
              );
              return;
            }

            console.log("ACCOUNT INSERT ERROR:", accountError);

            Alert.alert("Success", "Account verified and profile created!");
          }
        }
      },
    );

    return () => authListener.subscription.unsubscribe();
  }, [signupData, router]);

  const handleResend = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: signupData?.email,
    });
    setLoading(false);
    if (error) Alert.alert("Error", error.message);
    else Alert.alert("Success", "Verification email resent!");
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Full-width sky background */}
      <View style={[s.skyBg, { width }]} />

      {/* Stars */}
      {stars.map((st, i) => (
        <Star key={i} {...st} />
      ))}

      {/* Halo */}
      <View style={s.halo} />

      {/* Moon */}
      <Animated.View style={[s.moonWrap]}>
        <CrescentMoon />
      </Animated.View>

      {/* Title */}
      <View style={s.titleBlock}>
        <Text style={s.appName}>LUMEN</Text>
        <Text style={s.appSub}>Check Your Email</Text>
      </View>

      {/* Panel */}
      <View style={s.panel}>
        <Text style={s.heading}>Verify Your Email</Text>
        <Text style={s.subheading}>
          We've sent a verification link to {signupData?.email || "your email"}.
          Click the link to complete your signup.
        </Text>

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleResend}
          disabled={loading}
          activeOpacity={0.82}
        >
          <Text style={s.btnText}>{loading ? "Sending…" : "Resend Email"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/login")}
          style={s.linkRow}
        >
          <Text style={s.linkGray}>Already verified? </Text>
          <Text style={s.linkPurple}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#07070f",
    alignSelf: "stretch",
  },
  skyBg: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 340,
    backgroundColor: "#0f0e28",
  },
  halo: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#6C63FF",
    opacity: 0.08,
  },
  moonWrap: {
    position: "absolute",
    top: 55,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  titleBlock: {
    position: "absolute",
    top: 212,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  appName: {
    fontSize: 40,
    fontWeight: "800",
    color: "#dcd6ff",
    letterSpacing: 4,
    fontFamily: "Arial",
  },
  appSub: {
    fontSize: 10,
    color: "#7b74b8",
    letterSpacing: 3.5,
    marginTop: 5,
  },
  panel: {
    position: "absolute",
    top: 325,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#07070f",
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#dcd6ff",
    marginBottom: 3,
  },
  subheading: {
    fontSize: 13,
    color: "#5c567a",
    marginBottom: 24,
    lineHeight: 18,
  },
  btn: {
    backgroundColor: "#6C63FF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    alignSelf: "stretch",
    marginTop: 4,
    marginBottom: 18,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  btnDisabled: { backgroundColor: "#3d3880", shadowOpacity: 0.2 },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  linkGray: { color: "#5c567a", fontSize: 14 },
  linkPurple: { color: "#9d97e8", fontSize: 14, fontWeight: "600" },
});
