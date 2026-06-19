import { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

interface Props {
  onSend: (text: string, type: string) => void;
  onTypeSelect: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onTypeSelect, disabled }: Props) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim(), 'text');
    setText('');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.typeBtn} onPress={onTypeSelect}>
        <Ionicons name="add-circle-outline" size={24} color={COLORS.muted} />
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="Message..."
        placeholderTextColor={COLORS.muted}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={500}
        editable={!disabled}
      />
      <TouchableOpacity
        style={[styles.sendBtn, (!text.trim() || disabled) && styles.sendDisabled]}
        onPress={handleSend}
        disabled={!text.trim() || disabled}
      >
        <Ionicons name="send" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', padding: 8, borderTopWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.panel },
  typeBtn: { padding: 8 },
  input: { flex: 1, color: '#fff', backgroundColor: '#1a2744', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { backgroundColor: COLORS.blue, borderRadius: 20, padding: 9, marginLeft: 6 },
  sendDisabled: { backgroundColor: COLORS.border },
});
