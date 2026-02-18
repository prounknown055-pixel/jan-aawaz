import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { playTap } from '../../lib/sounds';

const TabIcon = ({ focused, icon, label }) => (
  <View style={[styles.tabItem, focused && styles.tabItemActive]}>
    <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
    <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    {focused && <View style={styles.tabIndicator} />}
  </View>
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
      screenListeners={{
        tabPress: async () => { await playTap(); },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="🏠" label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="🗺️" label="Map" />
          ),
        }}
      />
      <Tabs.Screen
        name="world-chat"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="💬" label="Chat" />
          ),
        }}
      />
      <Tabs.Screen
        name="protests"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="✊" label="Protest" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="👤" label="Profile" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    height: 65,
    paddingBottom: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    width: 60,
  },
  tabItemActive: {},
  tabIcon: { fontSize: 22, opacity: 0.5 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 10, color: '#475569', marginTop: 2 },
  tabLabelActive: { color: '#FF6B35', fontWeight: '700' },
  tabIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF6B35',
  },
});
