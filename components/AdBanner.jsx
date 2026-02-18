import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Linking, Animated
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { playTap } from '../lib/sounds';

export default function AdBanner({ type = 'banner', screen = '' }) {
  const [ad, setAd] = useState(null);
  const [visible, setVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAd();
  }, []);

  const loadAd = async () => {
    const { data: settings } = await supabase
      .from('app_settings')
      .select('ads_enabled')
      .single();

    if (!settings?.ads_enabled) return;

    const { data } = await supabase
      .from('ads')
      .select('*')
      .eq('is_active', true)
      .eq('ad_type', type)
      .single();

    if (data) {
      setAd(data);
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 500, useNativeDriver: true,
      }).start();
      await supabase.from('ads')
        .update({ impression_count: (data.impression_count || 0) + 1 })
        .eq('id', data.id);
    }
  };

  const handleAdPress = async () => {
    await playTap();
    if (ad?.redirect_url) {
      Linking.openURL(ad.redirect_url);
      await supabase.from('ads')
        .update({ click_count: (ad.click_count || 0) + 1 })
        .eq('id', ad.id);
    }
  };

  if (!ad || !visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <TouchableOpacity onPress={handleAdPress} activeOpacity={0.9}>
        {ad.image_url ? (
          <Image source={{ uri: ad.image_url }} style={styles.adImage} />
        ) : (
          <View style={styles.adPlaceholder}>
            <Text style={styles.adPlaceholderText}>📢 {ad.title}</Text>
          </View>
        )}
        <View style={styles.adLabel}>
          <Text style={styles.adLabelText}>Ad</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16, marginVertical: 8,
    borderRadius: 12, overflow: 'hidden',
    position: 'relative',
  },
  adImage: { width: '100%', height: 80, borderRadius: 12 },
  adPlaceholder: {
    backgroundColor: '#1E293B', height: 60, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#334155',
  },
  adPlaceholderText: { color: '#64748B', fontSize: 13 },
  adLabel: {
    position: 'absolute', top: 4, right: 6,
    backgroundColor: '#00000060', paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 4,
  },
  adLabelText: { fontSize: 9, color: '#fff', fontWeight: '600' },
});
