import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadUsers(); }, [filter]);

  const loadUsers = async () => {
    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (filter === 'leaders') query = query.eq('role', 'leader');
    else if (filter === 'blocked') query = query.eq('is_blocked', true);
    const { data } = await query;
    setUsers(data || []);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const handleBlock = async (userId, isBlocked) => {
    await playTap();
    Alert.alert(
      isBlocked ? 'Unblock Karo?' : 'Block Karo?',
      isBlocked ? 'User ko unblock karna chahte ho?' : 'User ko block karna chahte ho?',
      [
        { text: 'Nahi', style: 'cancel' },
        {
          text: 'Haan',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('users').update({ is_blocked: !isBlocked }).eq('id', userId);
            await loadUsers();
          },
        },
      ]
    );
  };

  const handleRoleChange = async (userId, currentRole) => {
    await playTap();
    const roles = ['citizen', 'leader', 'admin'];
    Alert.alert(
      'Role Change Karo',
      'Naya role select karo:',
      roles.map(role => ({
        text: role.charAt(0).toUpperCase() + role.slice(1),
        onPress: async () => {
          await supabase.from('users').update({ role }).eq('id', userId);
          await loadUsers();
        },
      })).concat([{ text: 'Cancel', style: 'cancel' }])
    );
  };

  const handleDeleteUser = async (userId) => {
    await playTap();
    Alert.alert(
      'User Delete Karo?',
      'Ye permanent hai. Confirm karo.',
      [
        { text: 'Nahi', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('users').delete().eq('id', userId);
            await loadUsers();
          },
        },
      ]
    );
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.username?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q);
  });

  const renderUser = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name || 'No Name'}</Text>
          <Text style={styles.userHandle}>@{item.username || 'no-username'}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userId}>ID: {item.id}</Text>
        </View>
      </View>

      <View style={styles.userBadges}>
        <View style={[styles.roleBadge, {
          backgroundColor: item.role === 'admin' ? '#FF6B35' :
            item.role === 'leader' ? '#F59E0B' : '#334155'
        }]}>
          <Text style={styles.roleBadgeText}>{item.role}</Text>
        </View>
        {item.is_blocked && (
          <View style={styles.blockedBadge}>
            <Text style={styles.blockedBadgeText}>🚫 Blocked</Text>
          </View>
        )}
        {item.leader_verified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedBadgeText}>✅ Verified</Text>
          </View>
        )}
      </View>

      <View style={styles.userStats}>
        <Text style={styles.userStat}>👥 {item.follower_count || 0} followers</Text>
        <Text style={styles.userStat}>📋 Problems posted</Text>
        <Text style={styles.userStat}>⭐ {item.popularity_score || 0} score</Text>
      </View>

      <View style={styles.userActions}>
        <TouchableOpacity
          style={[styles.actionBtn, item.is_blocked ? styles.unblockBtn : styles.blockBtn]}
          onPress={() => handleBlock(item.id, item.is_blocked)}
        >
          <Text style={styles.actionBtnText}>{item.is_blocked ? '✅ Unblock' : '🚫 Block'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.roleBtn}
          onPress={() => handleRoleChange(item.id, item.role)}
        >
          <Text style={styles.roleBtnText}>👑 Role</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeleteUser(item.id)}
        >
          <Text style={styles.deleteBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={async () => { await playTap(); router.back(); }}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>👥 Users</Text>
        <Text style={styles.countText}>{filtered.length}</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="🔍 User dhundho..."
        placeholderTextColor="#475569"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.filterRow}>
        {['all', 'leaders', 'blocked'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={async () => { await playTap(); setFilter(f); }}
          >
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
              {f === 'all' ? '🌐 Sab' : f === 'leaders' ? '👑 Leaders' : '🚫 Blocked'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Koi user nahi mila</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  backBtn: { fontSize: 14, color: '#FF6B35', fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#F1F5F9' },
  countText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  searchInput: {
    backgroundColor: '#1E293B', margin: 16, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12, color: '#F1F5F9',
    fontSize: 14, borderWidth: 1, borderColor: '#334155',
  },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterBtn: {
    flex: 1, backgroundColor: '#1E293B', borderRadius: 10, paddingVertical: 8,
    alignItems: 'center', borderWidth: 1, borderColor: '#334155',
  },
  filterBtnActive: { backgroundColor: '#FF6B3520', borderColor: '#FF6B35' },
  filterBtnText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  filterBtnTextActive: { color: '#FF6B35' },
  list: { padding: 16, paddingTop: 4 },
  userCard: {
    backgroundColor: '#1E293B', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
  },
  userTop: { flexDirection: 'row', marginBottom: 10 },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#334155',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#F1F5F9' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: '#F1F5F9' },
  userHandle: { fontSize: 12, color: '#64748B' },
  userEmail: { fontSize: 11, color: '#475569', marginTop: 2 },
  userId: { fontSize: 9, color: '#334155', marginTop: 2 },
  userBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  blockedBadge: { backgroundColor: '#EF444420', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  blockedBadgeText: { fontSize: 10, color: '#EF4444', fontWeight: '700' },
  verifiedBadge: { backgroundColor: '#10B98120', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  verifiedBadgeText: { fontSize: 10, color: '#10B981', fontWeight: '700' },
  userStats: { flexDirection: 'row', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
  userStat: { fontSize: 11, color: '#64748B' },
  userActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  blockBtn: { backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF4444' },
  unblockBtn: { backgroundColor: '#10B98120', borderWidth: 1, borderColor: '#10B981' },
  actionBtnText: { fontSize: 12, color: '#F1F5F9', fontWeight: '600' },
  roleBtn: {
    backgroundColor: '#F59E0B20', borderWidth: 1, borderColor: '#F59E0B',
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center',
  },
  roleBtnText: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  deleteBtn: {
    backgroundColor: '#334155', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center',
  },
  deleteBtnText: { fontSize: 14 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#64748B' },
});
