import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, Alert, ActivityIndicator
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState(null);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadSettings()]);
    setLoading(false);
  };

  const loadStats = async () => {
    const [
      { count: totalUsers },
      { count: totalProblems },
      { count: totalProtests },
      { count: pendingLeaders },
      { count: pendingPayments },
      { count: pendingReports },
      { count: totalMessages },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('problems').select('*', { count: 'exact', head: true }).eq('is_removed', false),
      supabase.from('protest_groups').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('leader_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('world_chat').select('*', { count: 'exact', head: true }).eq('is_removed', false),
    ]);
    setStats({
      totalUsers, totalProblems, totalProtests,
      pendingLeaders, pendingPayments, pendingReports, totalMessages,
    });
  };

  const loadSettings = async () => {
    const { data } = await supabase.from('app_settings').select('*').single();
    setSettings(data);
  };

  const toggleMaintenance = async () => {
    await playTap();
    setTogglingMaintenance(true);
    const newVal = !settings?.maintenance_mode;
    await supabase.from('app_settings').update({ maintenance_mode: newVal }).eq('id', settings.id);
    setSettings(prev => ({ ...prev, maintenance_mode: newVal }));
    Alert.alert(
      newVal ? '🔧 Maintenance Mode ON' : '✅ App Live Hai',
      newVal ? 'App ab sirf admin ke liye accessible hai.' : 'App ab sab ke liye accessible hai.'
    );
    setTogglingMaintenance(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const adminMenuItems = [
    { icon: '👥', label: 'Users', sub: `${stats.totalUsers || 0} total`, route: '/admin/users', color: '#3B82F6' },
    { icon: '👑', label: 'Leader Requests', sub: `${stats.pendingLeaders || 0} pending`, route: '/admin/leaders', color: '#F59E0B', alert: stats.pendingLeaders > 0 },
    { icon: '💳', label: 'Payments', sub: `${stats.pendingPayments || 0} pending`, route: '/admin/payments', color: '#10B981', alert: stats.pendingPayments > 0 },
    { icon: '🚩', label: 'Reports', sub: `${stats.pendingReports || 0} pending`, route: '/admin/reports', color: '#EF4444', alert: stats.pendingReports > 0 },
    { icon: '✊', label: 'Protests', sub: `${stats.totalProtests || 0} active`, route: '/admin/protests-admin', color: '#8B5CF6' },
    { icon: '🔥', label: 'Trending', sub: 'Topics manage karo', route: '/admin/trending', color: '#FF6B35' },
    { icon: '📢', label: 'Ads', sub: 'Ads manage karo', route: '/admin/ads', color: '#EC4899' },
    { icon: '⚙️', label: 'Settings', sub: 'App settings', route: '/admin/settings', color: '#64748B' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>⚙️ Admin Panel</Text>
          <Text style={styles.headerSub}>Jan Aawaz Control Center</Text>
        </View>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={async () => { await playTap(); router.back(); }}
        >
          <Text style={styles.backBtnText}>← App</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Maintenance Toggle */}
        <View style={[styles.maintenanceCard, settings?.maintenance_mode && styles.maintenanceCardActive]}>
          <View style={styles.maintenanceLeft}>
            <Text style={styles.maintenanceIcon}>🔧</Text>
            <View>
              <Text style={styles.maintenanceTitle}>Maintenance Mode</Text>
              <Text style={styles.maintenanceSub}>
                {settings?.maintenance_mode ? '⚠️ App band hai sabke liye' : '✅ App live hai'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.toggleBtn, settings?.maintenance_mode && styles.toggleBtnActive]}
            onPress={toggleMaintenance}
            disabled={togglingMaintenance}
          >
            {togglingMaintenance ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.toggleBtnText}>
                {settings?.maintenance_mode ? 'ON' : 'OFF'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statNum}>{stats.totalUsers || 0}</Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📋</Text>
            <Text style={styles.statNum}>{stats.totalProblems || 0}</Text>
            <Text style={styles.statLabel}>Problems</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>✊</Text>
            <Text style={styles.statNum}>{stats.totalProtests || 0}</Text>
            <Text style={styles.statLabel}>Protests</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💬</Text>
            <Text style={styles.statNum}>{stats.totalMessages || 0}</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </View>
        </View>

        {/* Quick Alerts */}
        {(stats.pendingLeaders > 0 || stats.pendingPayments > 0 || stats.pendingReports > 0) && (
          <View style={styles.alertsSection}>
            <Text style={styles.sectionTitle}>🚨 Pending Actions</Text>
            {stats.pendingLeaders > 0 && (
              <TouchableOpacity
                style={styles.alertCard}
                onPress={async () => { await playTap(); router.push('/admin/leaders'); }}
              >
                <Text style={styles.alertIcon}>👑</Text>
                <Text style={styles.alertText}>{stats.pendingLeaders} leader badge requests pending</Text>
                <Text style={styles.alertArrow}>→</Text>
              </TouchableOpacity>
            )}
            {stats.pendingPayments > 0 && (
              <TouchableOpacity
                style={styles.alertCard}
                onPress={async () => { await playTap(); router.push('/admin/payments'); }}
              >
                <Text style={styles.alertIcon}>💳</Text>
                <Text style={styles.alertText}>{stats.pendingPayments} payments verify pending</Text>
                <Text style={styles.alertArrow}>→</Text>
              </TouchableOpacity>
            )}
            {stats.pendingReports > 0 && (
              <TouchableOpacity
                style={styles.alertCard}
                onPress={async () => { await playTap(); router.push('/admin/reports'); }}
              >
                <Text style={styles.alertIcon}>🚩</Text>
                <Text style={styles.alertText}>{stats.pendingReports} reports review pending</Text>
                <Text style={styles.alertArrow}>→</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Menu */}
        <Text style={styles.sectionTitle}>📋 Admin Menu</Text>
        <View style={styles.menuGrid}>
          {adminMenuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.menuCard}
              onPress={async () => { await playTap(); router.push(item.route); }}
              activeOpacity={0.85}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: item.color + '20' }]}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuSub}>{item.sub}</Text>
              {item.alert && <View style={styles.alertDot} />}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingContainer: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#FF6B35' },
  headerSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  backBtn: { backgroundColor: '#334155', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  backBtnText: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  maintenanceCard: {
    backgroundColor: '#1E293B', margin: 16, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#334155',
  },
  maintenanceCardActive: { borderColor: '#F59E0B', backgroundColor: '#F59E0B08' },
  maintenanceLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  maintenanceIcon: { fontSize: 28 },
  maintenanceTitle: { fontSize: 15, fontWeight: '700', color: '#F1F5F9' },
  maintenanceSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  toggleBtn: {
    backgroundColor: '#334155', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, minWidth: 60, alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: '#F59E0B' },
  toggleBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10,
  },
  statCard: {
    backgroundColor: '#1E293B', borderRadius: 14, padding: 16,
    alignItems: 'center', width: '47%', borderWidth: 1, borderColor: '#334155',
  },
  statIcon: { fontSize: 28, marginBottom: 6 },
  statNum: { fontSize: 24, fontWeight: '900', color: '#F1F5F9' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 2 },
  alertsSection: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#F1F5F9', paddingHorizontal: 16, marginBottom: 12, marginTop: 8 },
  alertCard: {
    backgroundColor: '#EF444410', borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#EF444430',
  },
  alertIcon: { fontSize: 20 },
  alertText: { flex: 1, fontSize: 13, color: '#FCA5A5', fontWeight: '600' },
  alertArrow: { fontSize: 16, color: '#EF4444' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 },
  menuCard: {
    backgroundColor: '#1E293B', borderRadius: 16, padding: 16,
    width: '47%', borderWidth: 1, borderColor: '#334155',
    position: 'relative',
  },
  menuIconCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  menuIcon: { fontSize: 24 },
  menuLabel: { fontSize: 14, fontWeight: '700', color: '#F1F5F9', marginBottom: 2 },
  menuSub: { fontSize: 11, color: '#64748B' },
  alertDot: {
    position: 'absolute', top: 12, right: 12,
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444',
  },
});
