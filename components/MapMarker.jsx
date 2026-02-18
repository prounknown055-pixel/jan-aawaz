import { View, Text, StyleSheet } from 'react-native';

const CATEGORY_COLORS = {
  roads: '#F59E0B', water: '#3B82F6', electricity: '#EAB308',
  corruption: '#EF4444', women_safety: '#EC4899', health: '#10B981',
  education: '#8B5CF6', crime: '#F97316', political: '#6366F1',
  environment: '#84CC16', scam: '#EF4444', general: '#94A3B8', other: '#94A3B8',
};

const CATEGORY_ICONS = {
  roads: '🛣️', water: '💧', electricity: '⚡', corruption: '💰',
  women_safety: '🛡️', health: '🏥', education: '📚', crime: '🚨',
  political: '🏛️', environment: '🌿', scam: '💸', general: '📌', other: '📌',
};

export default function MapMarker({ category, isTrending, upvoteCount, type = 'problem' }) {
  if (type === 'leader') {
    return (
      <View style={styles.leaderMarker}>
        <Text style={styles.leaderIcon}>👑</Text>
      </View>
    );
  }

  const color = CATEGORY_COLORS[category] || '#94A3B8';
  const icon = CATEGORY_ICONS[category] || '📌';

  return (
    <View style={[
      styles.marker,
      { backgroundColor: color },
      isTrending && styles.markerTrending,
    ]}>
      <Text style={styles.markerIcon}>{icon}</Text>
      {upvoteCount > 0 && (
        <View style={styles.upvoteBadge}>
          <Text style={styles.upvoteBadgeText}>{upvoteCount > 99 ? '99+' : upvoteCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
    position: 'relative',
  },
  markerTrending: {
    width: 44, height: 44, borderRadius: 22,
    borderColor: '#FF6B35', borderWidth: 3,
  },
  markerIcon: { fontSize: 16 },
  upvoteBadge: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#FF6B35', borderRadius: 8,
    paddingHorizontal: 4, paddingVertical: 1,
    borderWidth: 1, borderColor: '#fff',
  },
  upvoteBadgeText: { fontSize: 8, color: '#fff', fontWeight: '900' },
  leaderMarker: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FF6B35',
    shadowColor: '#FF6B35', shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 }, elevation: 6,
  },
  leaderIcon: { fontSize: 22 },
});
