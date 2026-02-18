import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl, ScrollView
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

export default function AdminTrending() {
  const router = useRouter();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadTopics(); }, []);

  const loadTopics = async () => {
    const { data } = await supabase
      .from('trending_topics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setTopics(data || []);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTopics();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    await playTap();
    if (!title.trim()) { Alert.alert('Error', 'Title likhna zaroori hai.'); return; }
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('trending_topics').insert({
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      image_url: imageUrl.trim() || null,
      source_url: sourceUrl.trim() || null,
      is_active: true,
      created_by: user.id,
    });
    setTitle(''); setDescription(''); setCategory('');
    setImageUrl(''); setSourceUrl('');
    setShowCreate(false);
    await loadTopics();
    Alert.alert('✅ Trending Topic Add Ho Gaya!');
    setCreating(false);
  };

  const handleToggle = async (topic) => {
    await playTap();
    await supabase.from('trending_topics')
      .update({ is_active: !topic.is_active })
      .eq('id', topic.id);
    await loadTopics();
  };

  const handleDelete = async (id) => {
    await playTap();
    Alert.alert('Delete Karo?', 'Topic delete karna chahte ho?', [
      { text: 'Nahi', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('trending_topics').delete().eq('id', id);
          await loadTopics();
        },
      },
    ]);
  };

  const renderTopic = ({ item }) => (
    <View style={styles.topicCard}>
      <View style={styles.topicHeader}>
        <Text style={styles.topicTitle} numberOfLines={2}>{item.title}</Text>
        <View style={[styles.statusDot, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]} />
      </View>
      {item.description && (
        <Text style={styles.topicDesc} numberOfLines={2}>{item.description}</Text>
      )}
      {item.category && (
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      )}
      <Text style={styles.topicDate}>{new Date(item.created_at).toLocaleDateString('hi-IN')}</Text>
      <View style={styles.topicActions}>
        <TouchableOpacity
          style={[styles.toggleBtn, item.is_active ? styles.offBtn : styles.onBtn]}
          onPress={() => handleToggle(item)}
        >
          <Text style={styles.toggleBtnText}>{item.is_active ? '⏸️ Hide' : '▶️ Show'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
          <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
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
        <Text style={styles.headerTitle}>🔥 Trending</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={async () => { await playTap(); setShowCreate(!showCreate); }}
        >
          <Text style={styles.createBtnText}>{showCreate ? '✕' : '+ Add'}</Text>
        </TouchableOpacity>
      </View>

      {showCreate && (
        <ScrollView style={styles.createForm} keyboardShouldPersistTaps="handled">
          <Text style={styles.createTitle}>Naya Trending Topic</Text>
          <TextInput style={styles.input} placeholder="Title *" placeholderTextColor="#475569" value={title} onChangeText={setTitle} />
          <TextInput style={[styles.input, styles.textArea]} placeholder="Description..." placeholderTextColor="#475569" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
          <TextInput style={styles.input} placeholder="Category (Jaise: Politics, Economy...)" placeholderTextColor="#475569" value={category} onChangeText={setCategory} />
          <TextInput style={styles.input} placeholder="Image URL (optional)" placeholderTextColor="#475569" value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Source URL (optional)" placeholderTextColor="#475569" value={sourceUrl} onChangeText={setSourceUrl} autoCapitalize="none" />
          <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={creating}>
            {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>🔥 Add Karo</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <FlatList
          data={topics}
          keyExtractor={item => item.id}
          renderItem={renderTopic}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔥</Text>
              <Text style={styles.emptyText}>Koi trending topic nahi</Text>
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
  createForm: {
    backgroundColor: '#1E293B', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#334155', maxHeight: 420,
  },
  createTitle: { fontSize: 16, fontWeight: '800', color: '#F1F5F9', marginBottom: 12 },
  input: {
    backgroundColor: '#0F172A', borderRadius: 10, padding: 12, color: '#F1F5F9',
    fontSize: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 10,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: '#FF6B35', borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', marginBottom: 16,
  },
  submitBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  list: { padding: 16, paddingTop: 8 },
  topicCard: {
    backgroundColor: '#1E293B', borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#334155',
  },
  topicHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  topicTitle: { fontSize: 15, fontWeight: '700', color: '#F1F5F9', flex: 1, marginRight: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  topicDesc: { fontSize: 13, color: '#64748B', marginBottom: 6 },
  categoryBadge: {
    backgroundColor: '#FF6B3520', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 8, alignSelf: 'flex-start', marginBottom: 6,
  },
  categoryText: { fontSize: 11, color: '#FF6B35', fontWeight: '700' },
  topicDate: { fontSize: 11, color: '#475569', marginBottom: 10 },
  topicActions: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  onBtn: { backgroundColor: '#10B98120', borderWidth: 1, borderColor: '#10B981' },
  offBtn: { backgroundColor: '#F59E0B20', borderWidth: 1, borderColor: '#F59E0B' },
  toggleBtnText: { fontSize: 12, color: '#F1F5F9', fontWeight: '600' },
  deleteBtn: {
    backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF4444',
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center',
  },
  deleteBtnText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#64748B' },
});
