import {
  View, Text, StyleSheet, TouchableOpacity, Animated
} from 'react-native';
import { useRef } from 'react';
import { useRouter } from 'expo-router';
import { playTap } from '../lib/sounds';

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

export default function ProblemCard({ problem, onUpvote, hasUpvoted }) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const catColor = CATEGORY_COLORS[problem.category] || '#94A3B8';
  const catIcon = CATEGORY_ICONS[problem.category] || '📌';

  const handlePress = async () => {
    await playTap();
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    router.push(`/problem/${problem.id}`);
  };

  const getTimeAgo = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor(diff / 60000);
    if (days > 0) return `${days}d`;
    if (hrs > 0) return `${hrs}h`;
    if (mins > 0) return `${mins}m`;
    return 'Abhi';
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={1}>
        <View style={styles.header}>
          <View style={[styles.catBadge, { backgroundColor: catColor + '25' }]}>
            <Text style={styles.catIcon}>{catIcon}</Text>
            <Text style={[styles.catText, { color: catColor }]}>{problem.category}</Text>
          </View>
          <View style={styles.headerRight}>
            {problem.is_trending && (
              <View style={styles.trendingBadge}>
                <Text style={styles.trendingText}>🔥</Text>
              </View>
            )}
            {problem.is_anonymous && (
              <View style={styles.anonBadge}>
                <Text style={styles.anonText}>🎭</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>{problem.title}</Text>

        {problem.description && (
          <Text style={styles.desc} numberOfLines={2}>{problem.description}</Text>
        )}

        {problem.ai_summary && (
          <View style={styles.aiBox}>
            <Text style={styles.aiIcon}>🤖</Text>
            <Text style={styles.aiText} numberOfLines={2}>{problem.ai_summary}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.location} numberOfLines={1}>
            📍 {[problem.village, problem.district, problem.state].filter(Boolean).join(', ')}
          </Text>
          <View style={styles.footerRight}>
            <TouchableOpacity
              style={[styles.upvoteBtn, hasUpvoted && styles.upvoteBtnActive]}
              onPress={async (e) => {
                e.stopPropagation();
                await playTap();
                onUpvote && onUpvote(problem.id);
              }}
            >
              <Text style={styles.upvoteIcon}>👍</Text>
              <Text style={[styles.upvoteCount, hasUpvoted && { color: '#10B981' }]}>
                {problem.upvote_count || 0}
              </Text>
            </TouchableOpacity>
            <Text style={styles.time}>{getTimeAgo(problem.created_at)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B', borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  catIcon: { fontSize: 12 },
  catText: { fontSize: 11, fontWeight: '700' },
  headerRight: { flexDirection: 'row', gap: 6 },
  trendingBadge: { backgroundColor: '#FF6B3520', borderRadius: 8, padding: 4 },
  trendingText: { fontSize: 12 },
  anonBadge: { backgroundColor: '#7C3AED20', borderRadius: 8, padding: 4 },
  anonText: { fontSize: 12 },
  title: { fontSize: 15, fontWeight: '700', color: '#F1F5F9', marginBottom: 4, lineHeight: 22 },
  desc: { fontSize: 13, color: '#94A3B8', lineHeight: 18, marginBottom: 6 },
  aiBox: {
    flexDirection: 'row', backgroundColor: '#0F172A', borderRadius: 8,
    padding: 8, marginBottom: 8, gap: 6,
    borderLeftWidth: 2, borderLeftColor: '#6366F1',
  },
  aiIcon: { fontSize: 12 },
  aiText: { fontSize: 11, color: '#C7D2FE', flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  location: { fontSize: 11, color: '#64748B', flex: 1, marginRight: 8 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  upvoteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#0F172A', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#334155',
  },
  upvoteBtnActive: { borderColor: '#10B981', backgroundColor: '#10B98110' },
  upvoteIcon: { fontSize: 13 },
  upvoteCount: { fontSize: 12, color: '#94A3B8', fontWeight: '700' },
  time: { fontSize: 11, color: '#475569' },
});
