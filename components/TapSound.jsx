import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useRef } from 'react';
import { playTap } from '../lib/sounds';

export default function TapSound({
  children,
  onPress,
  style,
  activeOpacity = 0.85,
  scaleEffect = true,
  disabled = false,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = async () => {
    await playTap();

    if (scaleEffect) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95, duration: 80, useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1, duration: 80, useNativeDriver: true,
        }),
      ]).start();
    }

    onPress && onPress();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={activeOpacity}
        disabled={disabled}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}
