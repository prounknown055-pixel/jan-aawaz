import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

let tapSound = null;
let soundEnabled = true;

export const loadSounds = async () => {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      require('../assets/tap.mp3'),
      { shouldPlay: false, volume: 0.5 }
    );
    tapSound = sound;
  } catch (e) {
    tapSound = null;
  }
};

export const playTap = async () => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (soundEnabled && tapSound) {
      await tapSound.setPositionAsync(0);
      await tapSound.playAsync();
    }
  } catch (e) {}
};

export const unloadSounds = async () => {
  try {
    if (tapSound) {
      await tapSound.unloadAsync();
      tapSound = null;
    }
  } catch (e) {}
};

export const setSoundEnabled = (enabled) => {
  soundEnabled = enabled;
};
