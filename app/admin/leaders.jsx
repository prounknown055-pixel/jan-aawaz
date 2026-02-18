import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, TextInput, ScrollView
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

export default function AdminLeaders() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [adminNote, setAdminNote] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => { loadRequests(); }, [filter]);

  const loadRequests = async () => {
    const { data } = await supabase
      .from('leader_requests')
      .select(`*, users!leader_requests_user_id_fkey(id, name, username, email, avatar_url)`)
      .eq('status', filter)
      .order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleApprove = async (request) => {
    await playTap();
    Alert.alert(
      '✅ Approve Karo?',
      `${request.users?.name} ko ${request.leader_type} badge dena chahte ho?`,
      [
        { text: 'Nahi', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            await supabase.from('leader_requests').update({
              status: 'approved',
              admin_note: adminNote || 'Approved by admin',
            }).eq('id', request.id);

            await supabase.from('users').update({
              role: 'leader',
              leader_type: request.leader_type,
              leader_area: request.area,
              leader_state: request.state,
              leader_district: request.district,
              leader_block: request.block,
              leader_verified: true,
              leader_badge_color: request.badge_color,
              leader_insta_handle: request.insta_username,
              leader_verified: true,
            }).eq('id', request.user_id);

            await supabase.from('notifications').insert({
              user_id: request.user_id,
              title: '✅ Leader Badge Mila!',
              body: `Aapko ${request.leader_type} badge mil gaya. Ab aap leader profile use kar sakte ho.`,
              type: 'leader_approved',
            });

            await loadRequests();
            Alert.alert('✅ Approved!', 'Leader badge de diya gaya.');
          },
        },
      ]
    );
  };

  const handleReject = async (request) => {
    await playTap();
    Alert.alert(
      '❌ Reject Karo?',
      'Is request ko reject karna chahte ho?',
      [
        { text: 'Nahi', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('leader_requests').update({
              status: 'rejected',
              admin_note: adminNote || 'Rejected by admin',
            }).eq('id', request.id);

            await supabase.from('notifications').insert({
              user_id: request.user_id,
              title: '❌ Leader Request Reject Hui',
              body: 'Aapki leader badge request reject ho gayi. Instagram verification sahi nahi tha.',
              type: 'leader_rejected',
            });

            await loadRequests();
            Alert.alert('Rejected', 'Request reject kar di gayi.');
          },
        },
      ]
    );
  };

  const renderRequest = ({ item }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.users?.name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{item.users?.name}</Text>
            <Text style={styles.userHandle}>@{item.users?.username}</Text>
            <Text style={styles.userEmail}>{item.users?.email}</Text>
          </View>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: item.badge_color || '#6B7280' }]}>
          <Text style={styles.typeBadgeText}>{item.leader_type}</Text>
        </View>
      </View>

      <View style={styles.requestDetails}>
        <Text style={styles.detailRow}>📍 Area: <Text style={styles.detailValue}>{item.area}</Text></Text>
        {item.state && <Text style={styles.detailRow}>🗺️ State: <Text style={styles.detailValue}>{item.state}</Text></Text>}
        {item.district && <Text style={styles.detailRow}>🏙️ District: <Text style={styles.detailValue}>{item.district}</Text></Text>}
        <Text style={styles.detailRow}>📸 Instagram: <Text style={[styles.detailValue, { color: '#E1306C' }]}>@{item.insta_username}</Text></Text>
        {item.insta_post_url && (
          <Text style={styles.detailRow}>🔗 Post: <Text style={[styles.detailValue, { color: '#60A5FA' }]}>{item.insta_post_url}</Text></Text>
        )}
      </View>

      {filter === 'pending' && (
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={styles.approveBtn}
            onPress={() => handleApprove(item)}
          >
            <Text style={styles.approveBtnText}>✅ Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => handleReject(item)}
          >
            <Text style={styles.rejectBtnText}>❌ Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {filter !== 'pending' && (
        <View style={[styles.statusBox, {
          backgroundColor: filter === 'approved' ? '#10B98110' : '#EF444410'
        }]}>
          <Text style={[styles.statusText, { color: filter === 'approved' ? '#10B981' : '#EF4444' }]}>
            {filter === 'approved' ? '✅ Approved' : '❌ Rejected'}
          </Text>
          {item.admin_note && <Text style={styles.adminNote}>{item.admin_note}</Text>}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={async () => { await playTap(); router.back(); }}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>👑 Leader Requests</Text>
        <Text style={styles.countText}>{requests.length}</Text>
      </View>

      <View style={styles.filterRow}>
        {['pending', 'approved', 'rejected'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={async () => { await playTap(); setFilter(f); }}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'pending' ? '⏳ Pending' : f === 'approved' ? '✅ Approved' : '❌ Rejected'}
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
          data={requests}
          keyExtractor={item => item.id}
          renderItem={renderRequest}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>👑</Text>
              <Text style={styles.emptyText}>Koi {filter} request nahi hai</Text>
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
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#F1F5F9' },
  countText: { fontSize: 14, color: '#64748B' },
  filterRow: { flexDirection: 'row', padding: 16, gap: 8 },
  filterBtn: {
    flex: 1, backgroundColor: '#1E293B', borderRadius: 10, paddingVertical: 8,
    alignItems: 'center', borderWidth: 1, borderColor: '#334155',
  },
  filterBtnActive: { backgroundColor: '#FF6B3520', borderColor: '#FF6B35' },
  filterText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  filterTextActive: { color: '#FF6B35' },
  list: { padding: 16, paddingTop: 0 },
  requestCard: {
    backgroundColor: '#1E293B', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#334155',
  },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#334155',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#F1F5F9' },
  userName: { fontSize: 14, fontWeight: '700', color: '#F1F5F9' },
  userHandle: { fontSize: 12, color: '#64748B' },
  userEmail: { fontSize: 11, color: '#475569' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start' },
  typeBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  requestDetails: { backgroundColor: '#0F172A', borderRadius: 10, padding: 12, marginBottom: 12 },
  detailRow: { fontSize: 13, color: '#64748B', marginBottom: 4 },
  detailValue: { color: '#94A3B8', fontWeight: '600' },
  requestActions: { flexDirection: 'row', gap: 10 },
  approveBtn: {
    flex: 1, backgroundColor: '#10B98120', borderWidth: 1, borderColor: '#10B981',
    borderRadius: 12, paddingVertical: 12, alignItems: 'center',
  },
  approveBtnText: { fontSize: 14, color: '#10B981', fontWeight: '700' },
  rejectBtn: {
    flex: 1, backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF4444',
    borderRadius: 12, paddingVertical: 12, alignItems: 'center',
  },
  rejectBtnText: { fontSize: 14, color: '#EF4444', fontWeight: '700' },
  statusBox: { borderRadius: 10, padding: 10 },
  statusText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  adminNote: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#64748B' },
});
