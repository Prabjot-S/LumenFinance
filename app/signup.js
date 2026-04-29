import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from "react-native";
import { supabase } from "../lib/supabase";

// ── Twinkling star ────────────────────────────────────────────────────────────
function Star({ x, y, size, delay }) {
  const opacity = useRef(new Animated.Value(0.15)).current;
  useEffect(() => {
    const loop = () =>
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 1000 + Math.random() * 800, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.15, duration: 1000 + Math.random() * 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]).start(loop);
    loop();
  }, []);
  return <Animated.View style={{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: "#fff", opacity }} />;
}

function buildStars(w) {
  return [
    { x: w * 0.01,  y: 55,  size: 2.6, delay: 0   },
    { x: w * 0.16,  y: 30,  size: 1.8, delay: 300 },
    { x: w * 0.29,  y: 65,  size: 2,   delay: 600 },
    { x: w * 0.41,  y: 22,  size: 1.6, delay: 150 },
    { x: w * 0.50,  y: 40,  size: 2.2, delay: 900 },
    { x: w * 0.61,  y: 18,  size: 1.6, delay: 450 },
    { x: w * 0.73,  y: 55,  size: 2,   delay: 750 },
    { x: w * 0.83,  y: 32,  size: 1.8, delay: 200 },
    { x: w * 0.93,  y: 65,  size: 2.6, delay: 550 },
    { x: w * 0.11,  y: 90,  size: 1.4, delay: 800 },
    { x: w * 0.77,  y: 88,  size: 1.4, delay: 100 },
    { x: w * 0.23,  y: 110, size: 1.2, delay: 650 },
    { x: w * 0.65,  y: 105, size: 1.2, delay: 350 },
    { x: w * 0.35,  y: 140, size: 1.0, delay: 500 },
    { x: w * 0.88,  y: 125, size: 1.0, delay: 720 },
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

// ── Signup screen ─────────────────────────────────────────────────────────────
export default function Signup() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const stars = buildStars(width);

  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName]               = useState("");
  const [phone, setPhone]                     = useState("");
  const [loading, setLoading]                 = useState(false);
  const [focused, setFocused]                 = useState(null);
  const [errors, setErrors]                   = useState({});
  const clearError = (field) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const moonY   = useRef(new Animated.Value(-100)).current;
  const moonOp  = useRef(new Animated.Value(0)).current;
  const moonFlt = useRef(new Animated.Value(0)).current;
  const titleY  = useRef(new Animated.Value(24)).current;
  const titleOp = useRef(new Animated.Value(0)).current;
  const formY   = useRef(new Animated.Value(50)).current;
  const formOp  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(160, [
      Animated.parallel([
        Animated.timing(moonY,  { toValue: 0, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(moonOp, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleY,  { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(titleOp, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(formY,  { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(formOp, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    ]).start();

    const float = () =>
      Animated.sequence([
        Animated.timing(moonFlt, { toValue: -10, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(moonFlt, { toValue: 0,   duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]).start(float);
    const t = setTimeout(float, 1000);
    return () => clearTimeout(t);
  }, []);

  async function handleSignup() {
    const newErrors = {};
    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!phone.trim()) newErrors.phone = "Phone is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    if (!password.trim()) newErrors.password = "Password is required";
    if (!confirmPassword.trim()) newErrors.confirmPassword = "Confirm password is required";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      Alert.alert("Error", error.message);
      return;
    }
    
    // Navigate to verification page with signup data
    const signupData = { fullName, phone, email, userId: data.user.id };
    router.push({
      pathname: '/verify-email',
      params: { data: JSON.stringify(signupData) }
    });
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={10}
    >
      {/* Full-width sky background */}
      <View style={[s.skyBg, { width }]} />

      {/* Stars */}
      {stars.map((st, i) => <Star key={i} {...st} />)}

      {/* Halo */}
      <View style={s.halo} />

      {/* Moon */}
      <Animated.View style={[s.moonWrap, { opacity: moonOp, transform: [{ translateY: moonY }, { translateY: moonFlt }] }]}>
        <CrescentMoon />
      </Animated.View>

      {/* Title */}
      <Animated.View style={[s.titleBlock, { opacity: titleOp, transform: [{ translateY: titleY }] }]}>
        <Text style={s.appName}>LUMEN</Text>
        <Text style={s.appSub}>Your Finances, Illuminated</Text>
      </Animated.View>

      {/* Form panel — left/right/bottom anchored so it fills the screen width exactly */}
      <Animated.View style={[s.panel, { opacity: formOp, transform: [{ translateY: formY }] }]}>
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.heading}>Create Account</Text>
          <Text style={s.subheading}>Join Lumen today</Text>

          {/* Full Name */}
          <View style={[s.inputBox, focused === "name" && s.inputBoxFocused]}>
            <Text style={s.fieldLabel}>FULL NAME</Text>
            <TextInput
              style={s.input}
              placeholder="John Doe"
              placeholderTextColor="#4a4570"
              value={fullName}
              onChangeText={(text) => { setFullName(text); clearError('fullName'); }}
              autoCapitalize="words"
              onFocus={() => setFocused("name")}
              onBlur={() => setFocused(null)}
            />
          </View>
          {errors.fullName && <Text style={s.errorText}>{errors.fullName}</Text>}

          {/* Phone */}
          <View style={[s.inputBox, focused === "phone" && s.inputBoxFocused]}>
            <Text style={s.fieldLabel}>PHONE</Text>
            <TextInput
              style={s.input}
              placeholder="(123) 456-7890"
              placeholderTextColor="#4a4570"
              value={phone}
              onChangeText={(text) => { setPhone(text); clearError('phone'); }}
              keyboardType="phone-pad"
              onFocus={() => setFocused("phone")}
              onBlur={() => setFocused(null)}
            />
          </View>
          {errors.phone && <Text style={s.errorText}>{errors.phone}</Text>}

          {/* Email */}
          <View style={[s.inputBox, focused === "email" && s.inputBoxFocused]}>
            <Text style={s.fieldLabel}>EMAIL</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor="#4a4570"
              value={email}
              onChangeText={(text) => { setEmail(text); clearError('email'); }}
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
            />
          </View>
          {errors.email && <Text style={s.errorText}>{errors.email}</Text>}

          {/* Password */}
          <View style={[s.inputBox, focused === "pw" && s.inputBoxFocused]}>
            <Text style={s.fieldLabel}>PASSWORD</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor="#4a4570"
              value={password}
              onChangeText={(text) => { setPassword(text); clearError('password'); }}
              secureTextEntry
              onFocus={() => setFocused("pw")}
              onBlur={() => setFocused(null)}
            />
          </View>
          {errors.password && <Text style={s.errorText}>{errors.password}</Text>}

          {/* Confirm password */}
          <View style={[s.inputBox, focused === "cpw" && s.inputBoxFocused]}>
            <Text style={s.fieldLabel}>CONFIRM PASSWORD</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor="#4a4570"
              value={confirmPassword}
              onChangeText={(text) => { setConfirmPassword(text); clearError('confirmPassword'); }}
              secureTextEntry
              onFocus={() => setFocused("cpw")}
              onBlur={() => setFocused(null)}
            />
          </View>
          {errors.confirmPassword && <Text style={s.errorText}>{errors.confirmPassword}</Text>}

          {/* Button */}
          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.82}
          >
            <Text style={s.btnText}>{loading ? "Creating account…" : "Sign Up"}</Text>
          </TouchableOpacity>

          {/* Link */}
          <TouchableOpacity onPress={() => router.replace("/login")} style={s.linkRow}>
            <Text style={s.linkGray}>Already have an account? </Text>
            <Text style={s.linkPurple}>Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
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
  scrollContent: {
    paddingBottom: 300,
  },
  heading: { fontSize: 22, fontWeight: "700", color: "#dcd6ff", marginBottom: 3 },
  subheading: { fontSize: 13, color: "#5c567a", marginBottom: 24 },
  inputBox: {
    backgroundColor: "#0e0c22",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1e1b3a",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: 12,
    // stretch to fill panel width
    alignSelf: "stretch",
  },
  inputBoxFocused: {
    borderColor: "#6C63FF",
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#6C63FF",
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  input: {
    color: "#dcd6ff",
    fontSize: 16,
    padding: 0,
    width: "100%",
  },
  btn: {
    backgroundColor: "#6C63FF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    // stretch to fill panel width
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
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.6 },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  linkGray: { color: "#5c567a", fontSize: 14 },
  linkPurple: { color: "#9d97e8", fontSize: 14, fontWeight: "600" },
  errorText: {
    color: "#ff6b6b",
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
});
