import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

export default function AdminProtests() {
  const router = useRouter();
  const [protests, setProtests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadProtests(); }, [filter]);

  const loadProtests = async () => {
    let query = supabase
      .from('protest_groups')
      .select(`*, users!protest_groups_created_by_fkey(id, name, username)`)
      .order('created_at', { ascending: false });
    if (filter === 'pending') query = query.eq('payment_verified', false).eq('is_admin_created', false);
    else if (filter === 'active') query = query.eq('is_active', true);
    else if (filter === 'inactive') query = query.eq('is_active', false);
    const { data } = await query.limit(50);
    setProtests(data || []);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProtests();
    setRefreshing(false);
  };

  const handleToggleActive = async (protest) => {
    await playTap();
    await supabase.from('protest_groups')
      .update({ is_active: !protest.is_active })
      .eq('id', protest.id);
    await loadProtests();
  };

  const handleDelete = async (protestId) => {
    await playTap();
    Alert.alert('Delete Karo?', 'Protest group permanently delete ho jayega.', [
      { text: 'Nahi', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('protest_groups').delete().eq('id', protestId);
          await loadProtests();
        },
      },
    ]);
  };

  const handleCreateAdminProtest = async () => {
    await playTap();
    router.push('/protest/create');
  };

  const renderProtest = ({ item }) => (
    <View style={styles.protestCard}>
      <View style={styles.protestHeader}>
        <View style={styles.protestBadges}>
          {item.is_admin_created && (
            <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>⚙️ Admin</Text></View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B98120' : '#EF444420' }]}>
            <Text style={[styles.statusText, { color: item.is_active ? '#10B981' : '#EF4444' }]}>
              {item.is_active ? '🟢 Active' : '🔴 Inactive'}
            </Text>
          </View>
          {!item.payment_verified && !item.is_admin_created && (
            <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>⏳ Payment Pending</Text></View>
          )}
        </View>
      </View>

      <Text style={styles.protestTitle}>{item.title}</Text>
      <Text style={styles.protestMeta}>
        By: @{item.users?.username} • 👥 {item.member_count || 0} members
      </Text>
      <Text style={styles.protestLocation}>
        📍 {[item.district, item.state].filter(Boolean).join(', ')}
      </Text>

      <View style={styles.protestActions}>
        <TouchableOpacity
          style={[styles.toggleBtn, item.is_active ? styles.deactivateBtn : styles.activateBtn]}
          onPress={() => handleToggleActive(item)}
        >
          <Text style={styles.toggleBtnText}>
            {item.is_active ? '⏸️ Deactivate' : '▶️ Activate'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={async () => { await playTap(); router.push(`/protest/${item.id}`); }}
        >
          <Text style={styles.viewBtnText}>👁️ View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
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
        <Text style={styles.headerTitle}>✊ Protests</Text>
        <TouchableOpacity style={styles.createBtn} onPress={handleCreateAdminProtest}>
          <Text style={styles.createBtnText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {['all', 'pending', 'active', 'inactive'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={async () => { await playTap(); setFilter(f); }}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? '🌐' : f === 'pending' ? '⏳' : f === 'active' ? '🟢' : '🔴'} {f}
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
          data={protests}
          keyExtractor={item => item.id}
          renderItem={renderProtest}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>✊</Text>
              <Text style={styles.emptyText}>Koi protest nahi</Text>
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
  createBtn: { backgroundColor: '#FF6B35', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  createBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  filterRow: { flexDirection: 'row', padding: 16, gap: 6 },
  filterBtn: {
    flex: 1, backgroundColor: '#1E293B', borderRadius: 10, paddingVertical: 8,
    alignItems: 'center', borderWidth: 1, borderColor: '#334155',
  },
  filterBtnActive: { backgroundColor: '#FF6B3520', borderColor: '#FF6B35' },
  filterText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  filterTextActive: { color: '#FF6B35' },
  list: { padding: 16, paddingTop: 0 },
  protestCard: {
    backgroundColor: '#1E293B', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
  },
  protestHeader: { marginBottom: 8 },
  protestBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  adminBadge: { backgroundColor: '#FF6B3520', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  adminBadgeText: { fontSize: 10, color: '#FF6B35', fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },
  pendingBadge: { backgroundColor: '#F59E0B20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pendingBadgeText: { fontSize: 10, color: '#F59E0B', fontWeight: '700' },
  protestTitle: { fontSize: 16, fontWeight: '800', color: '#F1F5F9', marginBottom: 4 },
  protestMeta: { fontSize: 12, color: '#64748B', marginBottom: 3 },
  protestLocation: { fontSize: 12, color: '#475569', marginBottom: 10 },
  protestActions: { flexDirection: 'row', gap: 8 },
  toggleBtn: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  activateBtn: { backgroundColor: '#10B98120', borderWidth: 1, borderColor: '#10B981' },
  deactivateBtn: { backgroundColor: '#F59E0B20', borderWidth: 1, borderColor: '#F59E0B' },
  toggleBtnText: { fontSize: 12, color: '#F1F5F9', fontWeight: '600' },
  viewBtn: {
    backgroundColor: '#3B82F620', borderWidth: 1, borderColor: '#3B82F6',
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center',
  },
  viewBtnText: { fontSize: 12, color: '#3B82F6', fontWeight: '600' },
  deleteBtn: {
    backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF4444',
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center',
  },
  deleteBtnText: { fontSize: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#64748B' },
});
