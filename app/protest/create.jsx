import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { playTap } from '../../lib/sounds';

export default function CreateProtest() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');
  const [village, setVillage] = useState('');
  const [block, setBlock] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [isPublicJoin, setIsPublicJoin] = useState(true);
  const [upiTxnId, setUpiTxnId] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [step, setStep] = useState(1);

  useState(() => {
    supabase.from('app_settings')
      .select('protest_creation_fee, upi_id, upi_qr_url, protest_creation_enabled')
      .single()
      .then(({ data }) => setSettings(data));
  });

  const handleNext = async () => {
    await playTap();
    if (!title.trim()) { Alert.alert('Error', 'Title likhna zaroori hai.'); return; }
    if (!district.trim() || !state.trim()) { Alert.alert('Error', 'District aur State likhna zaroori hai.'); return; }
    setStep(2);
  };

  const handleSubmit = async () => {
    await playTap();
    if (!upiTxnId.trim()) { Alert.alert('Error', 'UPI Transaction ID likhna zaroori hai.'); return; }

    const { data: existing } = await supabase
      .from('protest_groups')
      .select('id')
      .ilike('title', title.trim())
      .single();

    if (existing) {
      Alert.alert(
        'Pehle Se Hai!',
        'Is naam ka protest group pehle se bana hua hai.',
        [
          { text: 'Use Join Karo', onPress: () => { router.replace(`/protest/${existing.id}`); } },
          { text: 'Wapas Jao', style: 'cancel', onPress: () => setStep(1) },
        ]
      );
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: protest, error } = await supabase.from('protest_groups').insert({
      created_by: user.id,
      title: title.trim(),
      description: description.trim(),
      topic: topic.trim(),
      village: village.trim(),
      block: block.trim(),
      district: district.trim(),
      state: state.trim(),
      country: 'India',
      is_public_join: isPublicJoin,
      is_admin_created: false,
      payment_verified: false,
      payment_amount: settings?.protest_creation_fee || 100000,
      upi_transaction_id: upiTxnId.trim(),
    }).select().single();

    if (error) {
      Alert.alert('Error', 'Protest group nahi bana. Dobara try karo.');
      setLoading(false);
      return;
    }

    await supabase.from('protest_members').insert({
      protest_id: protest.id, user_id: user.id, role: 'owner', is_approved: true,
    });

    await supabase.from('payments').insert({
      user_id: user.id,
      purpose: 'protest_creation',
      amount: settings?.protest_creation_fee || 100000,
      upi_transaction_id: upiTxnId.trim(),
      status: 'pending',
      protest_id: protest.id,
    });

    Alert.alert(
      '✅ Protest Group Bana!',
      'Payment verify hone ke baad group activate ho jayega.',
      [{ text: 'Theek Hai', onPress: () => router.replace(`/protest/${protest.id}`) }]
    );
    setLoading(false);
  };

  const fee = ((settings?.protest_creation_fee || 100000) / 100).toFixed(0);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={async () => { await playTap(); step === 2 ? setStep(1) : router.back(); }}>
            <Text style={styles.backBtn}>← Wapas</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Protest Group Banao</Text>
          <Text style={styles.stepText}>{step}/2</Text>
        </View>

        {step === 1 && (
          <View style={styles.stepContent}>
            <View style={styles.header}>
              <Text style={styles.headerIcon}>✊</Text>
              <Text style={styles.headerTitle}>Protest Group Details</Text>
            </View>

            <View style={styles.fieldBox}>
              <Text style={styles.label}>Protest Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Jaise: Sadak Sudharo Andolan"
                placeholderTextColor="#475569"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </View>

            <View style={styles.fieldBox}>
              <Text style={styles.label}>Topic</Text>
              <TextInput
                style={styles.input}
                placeholder="Jaise: Roads, Paani, Bijli..."
                placeholderTextColor="#475569"
                value={topic}
                onChangeText={setTopic}
              />
            </View>

            <View style={styles.fieldBox}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Protest ke baare mein batao..."
                placeholderTextColor="#475569"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.fieldBox}>
              <Text style={styles.label}>Location</Text>
              <View style={styles.locationFields}>
                <View style={styles.halfField}>
                  <Text style={styles.subLabel}>Village/Ward</Text>
                  <TextInput style={styles.inputSmall} placeholder="Village..." placeholderTextColor="#475569" value={village} onChangeText={setVillage} />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.subLabel}>Block</Text>
                  <TextInput style={styles.inputSmall} placeholder="Block..." placeholderTextColor="#475569" value={block} onChangeText={setBlock} />
                </View>
              </View>
              <View style={styles.locationFields}>
                <View style={styles.halfField}>
                  <Text style={styles.subLabel}>District *</Text>
                  <TextInput style={styles.inputSmall} placeholder="District..." placeholderTextColor="#475569" value={district} onChangeText={setDistrict} />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.subLabel}>State *</Text>
                  <TextInput style={styles.inputSmall} placeholder="State..." placeholderTextColor="#475569" value={state} onChangeText={setState} />
                </View>
              </View>
            </View>

            <View style={styles.fieldBox}>
              <Text style={styles.label}>Join Setting</Text>
              <View style={styles.joinOptions}>
                <TouchableOpacity
                  style={[styles.joinOption, isPublicJoin && styles.joinOptionActive]}
                  onPress={async () => { await playTap(); setIsPublicJoin(true); }}
                >
                  <Text style={styles.joinOptionIcon}>🔓</Text>
                  <Text style={[styles.joinOptionText, isPublicJoin && styles.joinOptionTextActive]}>Open Join</Text>
                  <Text style={styles.joinOptionSub}>Koi bhi join kar sakta hai</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.joinOption, !isPublicJoin && styles.joinOptionActive]}
                  onPress={async () => { await playTap(); setIsPublicJoin(false); }}
                >
                  <Text style={styles.joinOptionIcon}>🔒</Text>
                  <Text style={[styles.joinOptionText, !isPublicJoin && styles.joinOptionTextActive]}>Permission</Text>
                  <Text style={styles.joinOptionSub}>Aap approve karoge</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>Payment Ki Taraf →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContent}>
            <View style={styles.header}>
              <Text style={styles.headerIcon}>💳</Text>
              <Text style={styles.headerTitle}>Payment Karo</Text>
            </View>

            <View style={styles.paymentCard}>
              <Text style={styles.paymentAmount}>₹{fee}</Text>
              <Text style={styles.paymentLabel}>Protest Group Fee</Text>
              <View style={styles.divider} />
              <Text style={styles.upiLabel}>UPI ID par bhejo:</Text>
              <Text style={styles.upiId}>{settings?.upi_id || 'prounknown055@upi'}</Text>
              <Text style={styles.paymentNote}>
                💡 Transaction complete karne ke baad neeche Transaction ID daalo
              </Text>
            </View>

            <View style={styles.fieldBox}>
              <Text style={styles.label}>UPI Transaction ID *</Text>
              <TextInput
                style={styles.input}
                placeholder="Transaction ID yahan likho..."
                placeholderTextColor="#475569"
                value={upiTxnId}
                onChangeText={setUpiTxnId}
              />
              <Text style={styles.hint}>
                💡 Payment app mein transaction history mein milegi
              </Text>
            </View>

            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>⚠️ Dhyan Do</Text>
              <Text style={styles.warningText}>
                • Admin payment verify karega manually{'\n'}
                • Verify hone ke baad group activate hoga{'\n'}
                • Fake payment karoge to account ban ho sakta hai{'\n'}
                • Same naam ka group pehle se hai to join karo
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>✅ Submit Karo</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  backBtn: { fontSize: 14, color: '#FF6B35', fontWeight: '600' },
  topBarTitle: { fontSize: 17, fontWeight: '800', color: '#F1F5F9' },
  stepText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  stepContent: { padding: 16 },
  header: { alignItems: 'center', marginBottom: 20, paddingTop: 8 },
  headerIcon: { fontSize: 48, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#F1F5F9' },
  fieldBox: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '700', color: '#94A3B8', marginBottom: 8 },
  subLabel: { fontSize: 12, color: '#64748B', marginBottom: 6 },
  input: {
    backgroundColor: '#1E293B', borderRadius: 12, padding: 14,
    color: '#F1F5F9', fontSize: 15, borderWidth: 1, borderColor: '#334155',
  },
  inputSmall: {
    backgroundColor: '#1E293B', borderRadius: 10, padding: 12,
    color: '#F1F5F9', fontSize: 14, borderWidth: 1, borderColor: '#334155',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  locationFields: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  halfField: { flex: 1 },
  joinOptions: { flexDirection: 'row', gap: 10 },
  joinOption: {
    flex: 1, backgroundColor: '#1E293B', borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#334155',
  },
  joinOptionActive: { borderColor: '#FF6B35', backgroundColor: '#FF6B3510' },
  joinOptionIcon: { fontSize: 24, marginBottom: 4 },
  joinOptionText: { fontSize: 13, color: '#94A3B8', fontWeight: '700' },
  joinOptionTextActive: { color: '#FF6B35' },
  joinOptionSub: { fontSize: 11, color: '#475569', textAlign: 'center', marginTop: 2 },
  nextBtn: {
    backgroundColor: '#FF6B35', borderRadius: 20, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#FF6B35', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  nextBtnText: { fontSize: 17, color: '#fff', fontWeight: '700' },
  paymentCard: {
    backgroundColor: '#1E293B', borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#334155',
  },
  paymentAmount: { fontSize: 48, fontWeight: '900', color: '#FF6B35' },
  paymentLabel: { fontSize: 14, color: '#64748B', marginBottom: 16 },
  divider: { width: '100%', height: 1, backgroundColor: '#334155', marginBottom: 16 },
  upiLabel: { fontSize: 13, color: '#94A3B8', marginBottom: 6 },
  upiId: { fontSize: 18, fontWeight: '700', color: '#60A5FA', marginBottom: 12 },
  paymentNote: { fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 18 },
  hint: { fontSize: 12, color: '#475569', marginTop: 6 },
  warningBox: {
    backgroundColor: '#F59E0B10', borderRadius: 14, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#F59E0B30',
  },
  warningTitle: { fontSize: 13, fontWeight: '700', color: '#F59E0B', marginBottom: 8 },
  warningText: { fontSize: 12, color: '#D97706', lineHeight: 22 },
  submitBtn: {
    backgroundColor: '#FF6B35', borderRadius: 20, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#FF6B35', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 17, color: '#fff', fontWeight: '700' },
});
