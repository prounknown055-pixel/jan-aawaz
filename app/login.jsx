import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Animated, Dimensions, ActivityIndicator, Alert
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { signInWithGoogle } from '../lib/auth';
import { playTap } from '../lib/sounds';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flagAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkSession();
    startAnimations();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: user } = await supabase
        .from('users')
        .select('profile_setup_done')
        .eq('id', session.user.id)
        .single();
      if (user?.profile_setup_done) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/setup-profile');
      }
    }
  };

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 1000, useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 800, useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(flagAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(flagAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  };

  const handleGoogleLogin = async () => {
    await playTap();
    setLoading(true);
    try {
      const { data, error } = await signInWithGoogle();
      if (error) {
        Alert.alert('Login Error', 'Google login mein problem aayi. Dobara try karo.');
        setLoading(false);
        return;
      }
      if (data) {
        const { data: user } = await supabase
          .from('users')
          .select('profile_setup_done')
          .eq('id', data.user.id)
          .single();
        if (!user?.profile_setup_done) {
          router.replace('/setup-profile');
        } else {
          router.replace('/(tabs)/home');
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Kuch galat hua. Dobara try karo.');
    }
    setLoading(false);
  };

  const flagRotate = flagAnim.interpolate({
    inputRange: [0, 1], outputRange: ['-3deg', '3deg'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.bgGradient} />
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgCircle3} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        <Animated.View style={[styles.logoContainer, { transform: [{ rotate: flagRotate }] }]}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🇮🇳</Text>
          </View>
          <View style={styles.ashokChakra}>
            <Text style={styles.chakraText}>☸</Text>
          </View>
        </Animated.View>

        <Text style={styles.appName}>जन आवाज़</Text>
        <Text style={styles.appNameEn}>JAN AAWAZ</Text>
        <Text style={styles.tagline}>Awaaz Uthao, Badlaav Lao</Text>
        <Text style={styles.subTagline}>आवाज़ उठाओ, बदलाव लाओ</Text>

        <View style={styles.divider} />

        <View style={styles.featuresContainer}>
          {[
            { icon: '🗺️', text: 'Apne area ki problems map par dikhao' },
            { icon: '👤', text: 'Neta ko anonymously jawabdeh karo' },
            { icon: '✊', text: 'Online protest groups join karo' },
            { icon: '🗳️', text: 'Neta ko vote do har saal' },
            { icon: '💬', text: 'World chat mein awaaz uthao' },
          ].map((f, i) => (
            <Animated.View key={i} style={[styles.featureRow, { opacity: fadeAnim }]}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </Animated.View>
          ))}
        </View>

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleBtnText}>Google se Login Karo</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.privacyText}>
          Login karke aap hamare{' '}
          <Text style={styles.privacyLink}>Privacy Policy</Text> aur{' '}
          <Text style={styles.privacyLink}>Terms of Service</Text> se agree karte ho
        </Text>

        <Text style={styles.madeInIndia}>🇮🇳 Made for Bharat</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  bgGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.5,
    backgroundColor: '#1E293B',
  },
  bgCircle1: {
    position: 'absolute', top: -100, right: -100,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: '#FF6B3520',
  },
  bgCircle2: {
    position: 'absolute', top: 200, left: -80,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#138808' + '15',
  },
  bgCircle3: {
    position: 'absolute', bottom: 100, right: -60,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: '#FF993320',
  },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28, paddingTop: 60,
  },
  logoContainer: { alignItems: 'center', marginBottom: 8 },
  logoCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#1E293B',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FF6B35',
    shadowColor: '#FF6B35', shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 20,
    elevation: 10,
  },
  logoEmoji: { fontSize: 52 },
  ashokChakra: { marginTop: 4 },
  chakraText: { fontSize: 24, color: '#4169E1' },
  appName: {
    fontSize: 36, fontWeight: '900', color: '#FF6B35',
    letterSpacing: 2, marginTop: 8,
  },
  appNameEn: {
    fontSize: 14, fontWeight: '700', color: '#94A3B8',
    letterSpacing: 8, marginTop: 2,
  },
  tagline: {
    fontSize: 16, color: '#E2E8F0', marginTop: 8,
    fontStyle: 'italic',
  },
  subTagline: {
    fontSize: 13, color: '#64748B', marginTop: 4,
  },
  divider: {
    width: 60, height: 3, backgroundColor: '#FF6B35',
    borderRadius: 2, marginVertical: 20,
  },
  featuresContainer: { width: '100%', marginBottom: 28 },
  featureRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 10, paddingHorizontal: 8,
  },
  featureIcon: { fontSize: 20, marginRight: 12 },
  featureText: { fontSize: 14, color: '#CBD5E1', flex: 1 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FF6B35', paddingVertical: 16, paddingHorizontal: 48,
    borderRadius: 50, width: width - 56,
    shadowColor: '#FF6B35', shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 16,
    elevation: 8,
  },
  googleIcon: {
    fontSize: 20, fontWeight: '900', color: '#fff', marginRight: 12,
  },
  googleBtnText: {
    fontSize: 17, fontWeight: '700', color: '#fff',
  },
  privacyText: {
    fontSize: 11, color: '#475569', textAlign: 'center',
    marginTop: 16, lineHeight: 18, paddingHorizontal: 16,
  },
  privacyLink: { color: '#FF6B35' },
  madeInIndia: {
    fontSize: 13, color: '#334155', marginTop: 20, marginBottom: 16,
  },
});
