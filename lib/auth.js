import { supabase } from './supabase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const ADMIN_EMAIL = 'prounknown055@gmail.com';

export const configureGoogleSignin = () => {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    scopes: ['profile', 'email'],
  });
};

export const signInWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const { idToken } = userInfo;

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) return { data: null, error };

    const user = data.user;

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!existingUser) {
      const isAdmin = user.email === ADMIN_EMAIL;
      await supabase.from('users').insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name,
        avatar_url: user.user_metadata?.avatar_url,
        google_id: user.user_metadata?.sub,
        role: isAdmin ? 'admin' : 'citizen',
        is_guest: false,
        profile_setup_done: false,
      });
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    await GoogleSignin.signOut();
    await supabase.auth.signOut();
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null };

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  return { data };
};

export const isAdmin = (user) => {
  return user?.email === ADMIN_EMAIL || user?.role === 'admin';
};
