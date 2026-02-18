import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

export default function AdminPayments() {
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('pending');

  useEffect(() => { loadPayments(); }, [filter]);

  const loadPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select(`
        *,
        users!payments_user_id_fkey(id, name, username, email),
        protest_groups!payments_protest_id_fkey(id, title)
      `)
      .eq('status', filter)
      .order('created_at', { ascending: false });
    setPayments(data || []);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  const handleVerify = async (payment) => {
    await playTap();
    Alert.alert(
      '✅ Payment Verify Karo?',
      `₹${payment.amount / 100} - ${payment.users?.name}`,
      [
        { text: 'Nahi', style: 'cancel' },
        {
          text: 'Verify',
          onPress: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('payments').update({
              status: 'verified',
              verified_by: user.id,
              verified_at: new Date().toISOString(),
            }).eq('id', payment.id);

            if (payment.purpose === 'protest_creation' && payment.protest_id) {
              await supabase.from('protest_groups').update({
                payment_verified: true,
                is_active: true,
              }).eq('id', payment.protest_id);

              await supabase.from('notifications').insert({
                user_id: payment.user_id,
                title: '✅ Payment Verify Ho Gayi!',
                body: 'Aapka protest group ab active hai.',
                type: 'payment_verified',
              });
            }

            await loadPayments();
            Alert.alert('✅ Verified!', 'Payment verify ho gayi aur protest group active ho gaya.');
          },
        },
      ]
    );
  };

  const handleReject = async (payment) => {
    await playTap();
    Alert.alert(
      '❌ Payment Reject Karo?',
      'Fake ya wrong payment hai?',
      [
        { text: 'Nahi', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('payments').update({ status: 'rejected' }).eq('id', payment.id);
            await supabase.from('notifications').insert({
              user_id: payment.user_id,
              title: '❌ Payment Reject Hui',
              body: 'Aapki payment reject ho gayi. Sahi transaction ID ke saath dobara try karo.',
              type: 'payment_rejected',
            });
            await loadPayments();
          },
        },
      ]
    );
  };

  const renderPayment = ({ item }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View>
          <Text style={styles.paymentUser}>{item.users?.name}</Text>
          <Text style={styles.paymentHandle}>@{item.users?.username}</Text>
          <Text style={styles.paymentEmail}>{item.users?.email}</Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.amountText}>₹{(item.amount / 100).toFixed(0)}</Text>
          <Text style={styles.purposeText}>{item.purpose}</Text>
        </View>
      </View>

      <View style={styles.paymentDetails}>
        <Text style={styles.detailRow}>🔑 TXN ID: <Text style={styles.detailValue}>{item.upi_transaction_id || 'N/A'}</Text></Text>
        {item.protest_groups && (
          <Text style={styles.detailRow}>✊ Protest: <Text style={styles.detailValue}>{item.protest_groups?.title}</Text></Text>
        )}
        <Text style={styles.detailRow}>📅 Date: <Text style={styles.detailValue}>{new Date(item.created_at).toLocaleDateString('hi-IN')}</Text></Text>
      </View>

      {filter === 'pending' && (
        <View style={styles.paymentActions}>
          <TouchableOpacity style={styles.verifyBtn} onPress={() => handleVerify(item)}>
            <Text style={styles.verifyBtnText}>✅ Verify</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item)}>
            <Text style={styles.rejectBtnText}>❌ Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {filter !== 'pending' && (
        <View style={[styles.statusBox, {
          backgroundColor: filter === 'verified' ? '#10B98110' : '#EF444410'
        }]}>
          <Text style={[styles.statusText, { color: filter === 'verified' ? '#10B981' : '#EF4444' }]}>
            {filter === 'verified' ? '✅ Verified' : '❌ Rejected'}
          </Text>
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
        <Text style={styles.headerTitle}>💳 Payments</Text>
        <Text style={styles.countText}>{payments.length}</Text>
      </View>

      <View style={styles.filterRow}>
        {['pending', 'verified', 'rejected'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={async () => { await playTap(); setFilter(f); }}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'pending' ? '⏳' : f === 'verified' ? '✅' : '❌'} {f}
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
          data={payments}
          keyExtractor={item => item.id}
          renderItem={renderPayment}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💳</Text>
              <Text style={styles.emptyText}>Koi {filter} payment nahi</Text>
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
  filterText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  filterTextActive: { color: '#FF6B35' },
  list: { padding: 16, paddingTop: 0 },
  paymentCard: {
    backgroundColor: '#1E293B', borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
  },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  paymentUser: { fontSize: 15, fontWeight: '700', color: '#F1F5F9' },
  paymentHandle: { fontSize: 12, color: '#64748B' },
  paymentEmail: { fontSize: 11, color: '#475569' },
  amountBox: { alignItems: 'flex-end' },
  amountText: { fontSize: 22, fontWeight: '900', color: '#FF6B35' },
  purposeText: { fontSize: 11, color: '#64748B' },
  paymentDetails: { backgroundColor: '#0F172A', borderRadius: 10, padding: 10, marginBottom: 10 },
  detailRow: { fontSize: 12, color: '#64748B', marginBottom: 3 },
  detailValue: { color: '#94A3B8', fontWeight: '600' },
  paymentActions: { flexDirection: 'row', gap: 10 },
  verifyBtn: {
    flex: 1, backgroundColor: '#10B98120', borderWidth: 1, borderColor: '#10B981',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  verifyBtnText: { fontSize: 13, color: '#10B981', fontWeight: '700' },
  rejectBtn: {
    flex: 1, backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF4444',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
  },
  rejectBtnText: { fontSize: 13, color: '#EF4444', fontWeight: '700' },
  statusBox: { borderRadius: 10, padding: 10 },
  statusText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#64748B' },
});
