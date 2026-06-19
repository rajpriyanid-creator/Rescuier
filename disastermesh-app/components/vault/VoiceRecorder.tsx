import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

interface Props { onRecordingComplete: (uri: string) => void; }

export function VoiceRecorder({ onRecordingComplete }: Props) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [loading, setLoading] = useState(false);

  const startRecording = async () => {
    setLoading(true);
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
    } finally { setLoading(false); }
  };

  const stopRecording = async () => {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    if (uri) { setRecordedUri(uri); onRecordingComplete(uri); }
  };

  const playback = async () => {
    if (!recordedUri) return;
    if (sound) { await sound.stopAsync(); await sound.unloadAsync(); setSound(null); setPlaying(false); return; }
    const { sound: s } = await Audio.Sound.createAsync({ uri: recordedUri }, { shouldPlay: true });
    setSound(s); setPlaying(true);
    s.setOnPlaybackStatusUpdate((st) => { if (st.isLoaded && st.didJustFinish) { setPlaying(false); setSound(null); } });
  };

  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator color={COLORS.danger} /> : recording ? (
        <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
          <Ionicons name="stop-circle" size={56} color={COLORS.danger} />
          <Text style={styles.label}>Recording... Tap to stop</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.recordBtn} onPress={startRecording}>
          <Ionicons name="mic-circle-outline" size={56} color={COLORS.muted} />
          <Text style={styles.label}>Tap to record</Text>
        </TouchableOpacity>
      )}
      {recordedUri && (
        <TouchableOpacity style={styles.playBtn} onPress={playback}>
          <Ionicons name={playing ? 'pause-circle' : 'play-circle'} size={36} color={COLORS.blue} />
          <Text style={styles.playLabel}>{playing ? 'Stop' : 'Preview'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 16 },
  recordBtn: { alignItems: 'center' }, stopBtn: { alignItems: 'center' },
  label: { color: COLORS.muted, fontSize: 13, marginTop: 8 },
  playBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  playLabel: { color: COLORS.blue, fontWeight: '600' },
});
