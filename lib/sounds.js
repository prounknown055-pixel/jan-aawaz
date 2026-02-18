import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { supabase } from './supabase';

let tapSound = null;
let bgMusic = null;
let soundEnabled = true;
let musicEnabled = true;

export const loadSounds = async () => {
  try {
    const { data: settings } = await supabase
      .from('app_settings')
      .select('tap_sound_enabled, background_music_enabled')
      .single();

    soundEnabled = settings?.tap_sound_enabled ?? true;
    musicEnabled = settings?.background_music_enabled ?? true;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    if (soundEnabled) {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/tap.mp3'),
        { shouldPlay: false, volume: 0.5 }
      );
      tapSound = sound;
    }
  } catch (error) {
    console.log('Sound load error:', error);
  }
};

export const playTap = async () => {
  try {
    if (!soundEnabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (tapSound) {
      await tapSound.setPositionAsync(0);
      await tapSound.playAsync();
    }
  } catch (error) {}
};

export const unloadSounds = async () => {
  try {
    if (tapSound) await tapSound.unloadAsync();
    if (bgMusic) await bgMusic.unloadAsync();
  } catch (error) {}
};
