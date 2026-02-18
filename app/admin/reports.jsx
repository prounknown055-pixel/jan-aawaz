import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

export default function AdminReports() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('pending');

  useEffect(() => { loadReports(); }, [filter]);

  const loadReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select(`*, users!reports_reporter_id_fkey(id, name, username)`)
      .eq('status', filter)
      .order('created_at', { ascending: false });
    setReports(data || []);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const handleAction = async (report, action) => {
    await playTap();
    if (action === 'remove_content') {
      Alert.alert('Content Remove Karo?', 'Reported content hata doge?', [
        { text: 'Nahi', style: 'cancel' },
        {
          text: 'Haan Remove Karo',
          style: 'destructive',
          onPress: async () => {
            const table = report.content_type === 'problem' ? 'problems'
              : report.content_type === 'world_chat' ? 'world_chat'
              : report.content_type === 'protest_chat' ? 'protest_chat'
              : null;
            if (table) {
              await supabase.from(table).update({ is_removed: true }).eq('id', report.content_id);
            }
            await supabase.from('reports').update({ status: 'resolved', admin_note: 'Content removed' }).eq('id', report.id);
            await loadReports();
            Alert.alert('✅ Done', 'Content remove kar diya gaya.');
          },
        },
      ]);
    } else if (action === 'dismiss') {
      await supabase.from('reports').update({ status: 'dismissed', admin_note: 'Dismissed by admin' }).eq('id', report.id);
      await loadReports();
    }
  };

  const renderReport = ({ item }) => (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.content_type) + '20' }]}>
          <Text style={[styles.typeBadgeText, { color: getTypeColor(item.content_type) }]}>
            {item.content_type}
          </Text>
        </View>
        <Text style={styles.reportDate}>{new Date(item.created_at).toLocaleDateString('hi-IN')}</Text>
      </View>

      <Text style={styles.reportReason}>{item.reason}</Text>
      <Text style={styles.reportBy}>
        Reported by: @{item.users?.username || 'Unknown'}
      </Text>
      <Text style={styles.contentId}>Content ID: {item.content_id}</Text>

      {filter === 'pending' && (
        <View style={styles.reportActions}>
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => handleAction(item, 'remove_content')}
          >
            <Text style={styles.removeBtnText}>🗑️ Content Hatao</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={() => handleAction(item, 'dismiss')}
          >
            <Text style={styles.dismissBtnText}>✕ Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {filter !== 'pending' && (
        <View style={[styles.statusBox, {
          backgroundColor: filter === 'resolved' ? '#10B98110' : '#64748B10'
        }]}>
          <Text style={[styles.statusText, {
            color: filter === 'resolved' ? '#10B981' : '#64748B'
          }]}>
            {filter === 'resolved' ? '✅ Resolved' : '✕ Dismissed'}
          </Text>
          {item.admin_note && <Text style={styles.adminNote}>{item.admin_note}</Text>}
        </View>
      )}
    </View>
  );

  const getTypeColor = (type) => {
    const colors = {
      problem: '#F59E0B', world_chat: '#3B82F6',
      protest_chat: '#8B5CF6', user: '#EF4444',
      protest_group: '#10B981',
    };
    return colors[type] || '#94A3B8';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={async () => { await playTap(); router.back(); }}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🚩 Reports</Text>
        <Text style={styles.countText}>{reports.length}</Text>
      </View>

      <View style={styles.filterRow}>
        {['pending', 'resolved', 'dismissed'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={async () => { await playTap(); setFilter(f); }}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'pending' ? '⏳' : f === 'resolved' ? '✅' : '✕'} {f}
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
          data={reports}
          keyExtractor={item => item.id}
          renderItem={renderReport}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🚩</Text>
              <Text style={styles.emptyText}>Koi {filter} report nahi</Text>
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
  countText: { fontSize: 14, color: '#64748B' },
  filterRow: { flexDirection: 'row', padding: 16, gap: 8 },
  filterBtn: {
    flex: 1, backgroundColor: '#1E293B', borderRadius: 10, paddingVertical: 8,
    alignItems: 'center', borderWidth: 1, borderColor: '#334155',
  },
  filterBtnActive: { backgroundColor: '#FF6B3520', borderColor: '#FF6B35' },
  filterText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  filterTextActive: { color: '#FF6B35' },
  list: { padding: 16, paddingTop: 0 },
  reportCard: {
    backgroundColor: '#1E293B', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
  },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  reportDate: { fontSize: 11, color: '#475569' },
  reportReason: { fontSize: 14, color: '#E2E8F0', marginBottom: 6, fontWeight: '600' },
  reportBy: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  contentId: { fontSize: 10, color: '#334155', marginBottom: 10 },
  reportActions: { flexDirection: 'row', gap: 10 },
  removeBtn: {
    flex: 1, backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF4444',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  removeBtnText: { fontSize: 13, color: '#EF4444', fontWeight: '700' },
  dismissBtn: {
    flex: 1, backgroundColor: '#33415520', borderWidth: 1, borderColor: '#475569',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  dismissBtnText: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  statusBox: { borderRadius: 10, padding: 10 },
  statusText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  adminNote: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#64748B' },
});
