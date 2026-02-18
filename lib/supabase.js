import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ============================================================
// USER FUNCTIONS
// ============================================================

export const getUser = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
};

export const updateUser = async (userId, updates) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  return { data, error };
};

export const getUserByUsername = async (username) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();
  return { data, error };
};

export const searchUsers = async (query) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, username, avatar_url, role, leader_type, leader_area, leader_badge_color, leader_verified, follower_count, popularity_score')
    .or(`username.ilike.%${query}%, name.ilike.%${query}%`)
    .eq('is_blocked', false)
    .order('follower_count', { ascending: false })
    .limit(20);
  return { data, error };
};

export const getLeaders = async ({ state, district, area } = {}) => {
  let query = supabase
    .from('users')
    .select('*')
    .eq('role', 'leader')
    .eq('leader_verified', true)
    .eq('is_blocked', false)
    .order('popularity_score', { ascending: false });

  if (state) query = query.eq('leader_state', state);
  if (district) query = query.eq('leader_district', district);
  if (area) query = query.ilike('leader_area', `%${area}%`);

  const { data, error } = await query;
  return { data, error };
};

// ============================================================
// PROBLEMS FUNCTIONS
// ============================================================

export const getProblems = async ({ district, state, category, trending } = {}) => {
  let query = supabase
    .from('problems')
    .select(`
      *,
      users!problems_user_id_fkey(id, username, avatar_url, role, leader_verified)
    `)
    .eq('is_removed', false)
    .order('created_at', { ascending: false });

  if (district) query = query.eq('district', district);
  if (state) query = query.eq('state', state);
  if (category) query = query.eq('category', category);
  if (trending) query = query.eq('is_trending', true);

  const { data, error } = await query.limit(50);
  return { data, error };
};

export const addProblem = async (problem) => {
  const { data, error } = await supabase
    .from('problems')
    .insert(problem)
    .select()
    .single();
  return { data, error };
};

export const upvoteProblem = async (problemId, userId) => {
  const { data: existing } = await supabase
    .from('problem_upvotes')
    .select('id')
    .eq('problem_id', problemId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('problem_upvotes')
      .delete()
      .eq('problem_id', problemId)
      .eq('user_id', userId);
    return { data: { action: 'removed' }, error };
  } else {
    const { error } = await supabase
      .from('problem_upvotes')
      .insert({ problem_id: problemId, user_id: userId });
    return { data: { action: 'added' }, error };
  }
};

export const checkWeeklyProblemLimit = async (userId) => {
  const now = new Date();
  const weekNumber = Math.ceil((now - new Date(now.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000));
  const year = now.getFullYear();

  const { data } = await supabase
    .from('problem_week_tracker')
    .select('problem_count')
    .eq('user_id', userId)
    .eq('week_number', weekNumber)
    .eq('year', year)
    .single();

  return data?.problem_count >= 1;
};

export const incrementWeeklyProblemCount = async (userId) => {
  const now = new Date();
  const weekNumber = Math.ceil((now - new Date(now.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000));
  const year = now.getFullYear();

  await supabase.from('problem_week_tracker').upsert({
    user_id: userId,
    week_number: weekNumber,
    year: year,
    problem_count: 1,
  }, { onConflict: 'user_id,week_number,year' });
};

// ============================================================
// WORLD CHAT FUNCTIONS
// ============================================================

export const getWorldChat = async () => {
  const { data, error } = await supabase
    .from('world_chat')
    .select(`
      *,
      users!world_chat_user_id_fkey(id, username, avatar_url, role, leader_type, leader_badge_color, leader_verified)
    `)
    .eq('is_removed', false)
    .order('created_at', { ascending: false })
    .limit(100);
  return { data, error };
};

export const sendWorldChat = async (userId, message) => {
  const today = new Date().toISOString().split('T')[0];

  const { data: dailyData } = await supabase
    .from('world_chat_daily')
    .select('message_count')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (dailyData && dailyData.message_count >= 5) {
    return { data: null, error: { message: 'Aaj ki 5 messages ki limit ho gayi!' } };
  }

  const { data, error } = await supabase
    .from('world_chat')
    .insert({ user_id: userId, message })
    .select()
    .single();

  if (!error) {
    await supabase.from('world_chat_daily').upsert({
      user_id: userId,
      date: today,
      message_count: (dailyData?.message_count || 0) + 1,
    }, { onConflict: 'user_id,date' });
  }

  return { data, error };
};

// ============================================================
// PERSONAL CHAT FUNCTIONS
// ============================================================

export const getPersonalChat = async (userId, otherId) => {
  const { data, error } = await supabase
    .from('personal_chats')
    .select(`
      *,
      sender:users!personal_chats_sender_id_fkey(id, username, avatar_url),
      receiver:users!personal_chats_receiver_id_fkey(id, username, avatar_url)
    `)
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
    .eq('is_removed', false)
    .order('created_at', { ascending: true });
  return { data, error };
};

export const sendPersonalChat = async (senderId, receiverId, message) => {
  const { data: receiver } = await supabase
    .from('users')
    .select('role')
    .eq('id', receiverId)
    .single();

  if (receiver?.role === 'leader') {
    return { data: null, error: { message: 'Leader ko direct message nahi kar sakte. World Chat use karo.' } };
  }

  const { data, error } = await supabase
    .from('personal_chats')
    .insert({ sender_id: senderId, receiver_id: receiverId, message })
    .select()
    .single();
  return { data, error };
};

// ============================================================
// PROTEST FUNCTIONS
// ============================================================

export const getProtests = async ({ state, district } = {}) => {
  let query = supabase
    .from('protest_groups')
    .select(`
      *,
      users!protest_groups_created_by_fkey(id, username, avatar_url)
    `)
    .eq('is_active', true)
    .order('member_count', { ascending: false });

  if (state) query = query.eq('state', state);
  if (district) query = query.eq('district', district);

  const { data, error } = await query.limit(50);
  return { data, error };
};

export const getProtestChat = async (protestId, userId) => {
  const { data: member } = await supabase
    .from('protest_members')
    .select('role, is_approved')
    .eq('protest_id', protestId)
    .eq('user_id', userId)
    .single();

  let query = supabase
    .from('protest_chat')
    .select(`
      *,
      users!protest_chat_user_id_fkey(id, username, avatar_url, role)
    `)
    .eq('protest_id', protestId)
    .eq('is_removed', false)
    .order('created_at', { ascending: true });

  if (!member?.is_approved) {
    query = query.eq('is_public', true);
  }

  const { data, error } = await query;
  return { data, error };
};

export const joinProtest = async (protestId, userId) => {
  const { data: protest } = await supabase
    .from('protest_groups')
    .select('is_public_join')
    .eq('id', protestId)
    .single();

  const { data, error } = await supabase
    .from('protest_members')
    .insert({
      protest_id: protestId,
      user_id: userId,
      role: 'member',
      is_approved: protest?.is_public_join ? true : false,
    })
    .select()
    .single();
  return { data, error };
};

// ============================================================
// FOLLOW FUNCTIONS
// ============================================================

export const followUser = async (followerId, followingId) => {
  const { data: existing } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    return { data: { action: 'unfollowed' }, error };
  } else {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId });
    return { data: { action: 'followed' }, error };
  }
};

// ============================================================
// APP SETTINGS
// ============================================================

export const getAppSettings = async () => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .single();
  return { data, error };
};

export const updateAppSettings = async (updates) => {
  const { data: existing } = await supabase
    .from('app_settings')
    .select('id')
    .single();

  const { data, error } = await supabase
    .from('app_settings')
    .update(updates)
    .eq('id', existing.id)
    .select()
    .single();
  return { data, error };
};

// ============================================================
// VOTING FUNCTIONS
// ============================================================

export const castAnnualVote = async (voterId, leaderId, voteType) => {
  const year = new Date().getFullYear();
  const { data, error } = await supabase
    .from('annual_votes')
    .upsert({
      voter_id: voterId,
      leader_id: leaderId,
      vote_type: voteType,
      year,
    }, { onConflict: 'voter_id,leader_id,year' })
    .select()
    .single();
  return { data, error };
};

export const getLeaderVoteStats = async (leaderId) => {
  const year = new Date().getFullYear();
  const { data, error } = await supabase
    .from('annual_votes')
    .select('vote_type')
    .eq('leader_id', leaderId)
    .eq('year', year);

  if (data) {
    const positive = data.filter(v => v.vote_type === 'positive').length;
    const negative = data.filter(v => v.vote_type === 'negative').length;
    return { data: { positive, negative, total: data.length }, error };
  }
  return { data: null, error };
};

// ============================================================
// NOTIFICATIONS
// ============================================================

export const getNotifications = async (userId) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  return { data, error };
};

export const markNotificationRead = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  return { error };
};

// ============================================================
// REALTIME SUBSCRIPTIONS
// ============================================================

export const subscribeWorldChat = (callback) => {
  return supabase
    .channel('world_chat_channel')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'world_chat',
    }, callback)
    .subscribe();
};

export const subscribePersonalChat = (userId, callback) => {
  return supabase
    .channel(`personal_chat_${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'personal_chats',
      filter: `receiver_id=eq.${userId}`,
    }, callback)
    .subscribe();
};

export const subscribeProtestChat = (protestId, callback) => {
  return supabase
    .channel(`protest_chat_${protestId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'protest_chat',
      filter: `protest_id=eq.${protestId}`,
    }, callback)
    .subscribe();
};
