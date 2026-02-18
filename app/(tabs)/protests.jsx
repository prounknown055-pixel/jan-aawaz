placeholderTextColor="#475569"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.tabsRow}>
        {[
          { key: 'all', label: '🌐 Sab' },
          { key: 'mine', label: '👤 Mere' },
          { key: 'joined', label: '✅ Joined' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={async () => { await playTap(); setActiveTab(tab.key); }}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
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
          data={filteredProtests}
          keyExtractor={item => item.id}
          renderItem={renderProtest}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>✊</Text>
              <Text style={styles.emptyText}>Koi protest nahi hai abhi</Text>
              <Text style={styles.emptySubText}>Pehle wale bano!</Text>
              <TouchableOpacity style={styles.emptyCreateBtn} onPress={handleCreateProtest}>
                <Text style={styles.emptyCreateBtnText}>+ Protest Group Banao</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#F1F5F9' },
  headerSub: { fontSize: 12, color: '#64748B' },
  createBtn: {
    backgroundColor: '#FF6B35', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20,
  },
  createBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  feeBanner: {
    backgroundColor: '#FF6B3510', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#FF6B3520',
  },
  feeBannerText: { fontSize: 12, color: '#FF6B35', textAlign: 'center' },
  searchContainer: { padding: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: '#1E293B', borderRadius: 16, paddingHorizontal: 16,
    paddingVertical: 12, color: '#F1F5F9', fontSize: 14,
    borderWidth: 1, borderColor: '#334155',
  },
  tabsRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8,
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 12,
    backgroundColor: '#1E293B', alignItems: 'center',
    borderWidth: 1, borderColor: '#334155',
  },
  tabActive: { backgroundColor: '#FF6B3520', borderColor: '#FF6B35' },
  tabText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  tabTextActive: { color: '#FF6B35', fontWeight: '700' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingTop: 4, paddingBottom: 20 },
  protestCard: {
    backgroundColor: '#1E293B', borderRadius: 16, marginBottom: 12,
    padding: 16, borderWidth: 1, borderColor: '#334155',
  },
  protestHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  protestTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  protestEmoji: { fontSize: 24 },
  adminBadge: {
    backgroundColor: '#FF6B3520', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, borderColor: '#FF6B3540',
  },
  adminBadgeText: { fontSize: 10, color: '#FF6B35', fontWeight: '700' },
  verifiedBadge: {
    backgroundColor: '#10B98120', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedBadgeText: { fontSize: 10, color: '#10B981', fontWeight: '700' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  protestTitle: { fontSize: 17, fontWeight: '800', color: '#F1F5F9', marginBottom: 6 },
  protestDesc: { fontSize: 13, color: '#94A3B8', lineHeight: 20, marginBottom: 8 },
  protestLocation: { marginBottom: 10 },
  locationText: { fontSize: 12, color: '#64748B' },
  protestFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  memberCount: {
    backgroundColor: '#0F172A', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10,
  },
  memberCountText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  protestMeta: {},
  joinTag: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  privateTag: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  joinBtn: {
    backgroundColor: '#FF6B35', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 16,
  },
  joinBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#64748B' },
  emptySubText: { fontSize: 14, color: '#475569', marginTop: 8, marginBottom: 20 },
  emptyCreateBtn: {
    backgroundColor: '#FF6B35', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 24,
  },
  emptyCreateBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
