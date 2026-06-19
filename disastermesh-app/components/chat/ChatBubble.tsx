import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

interface Message {
  _id: string; senderId: string; senderName: string; senderRole: string;
  senderDisasterId?: string; type: string; text: string;
  latitude?: number; longitude?: number; isAdminMessage?: boolean;
  isPinned?: boolean; createdAt: string;
}

interface Props { message: Message; currentUserId: string; onTTS?: (text: string) => void; }

const TYPE_ICON: Record<string, string> = {
  location: '📍', medical_need: '🩸', resource: '🍱', shelter: '🏠',
  missing: '🔍', sos: '🆘', text: '',
};

export function ChatBubble({ message: msg, currentUserId, onTTS }: Props) {
  const isOwn = msg.senderId === currentUserId;
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const roleColor = msg.isAdminMessage ? '#dc2626' : msg.senderRole === 'responder' ? '#f59e0b' : COLORS.muted;
  const icon = TYPE_ICON[msg.type] ?? '';

  return (
    <View style={[styles.wrapper, isOwn && styles.ownWrapper]}>
      {msg.isPinned && <Text style={styles.pinLabel}>📌 Pinned</Text>}
      <View style={[
        styles.bubble,
        isOwn ? styles.ownBubble : styles.otherBubble,
        msg.isAdminMessage && styles.adminBubble,
      ]}>
        {!isOwn && (
          <View style={styles.header}>
            <Text style={[styles.sender, { color: roleColor }]}>
              {msg.isAdminMessage ? '🛡️ ' : ''}{msg.senderName}
            </Text>
            {msg.senderDisasterId && (
              <Text style={styles.disasterId}>{msg.senderDisasterId}</Text>
            )}
          </View>
        )}
        <Text style={styles.text}>{icon ? icon + ' ' : ''}{msg.text}</Text>
        <View style={styles.footer}>
          <Text style={styles.time}>{time}</Text>
          {onTTS && (
            <TouchableOpacity onPress={() => onTTS(msg.text)} style={styles.ttsBtn}>
              <Ionicons name="volume-medium-outline" size={14} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginVertical: 3, paddingHorizontal: 12, alignItems: 'flex-start' },
  ownWrapper: { alignItems: 'flex-end' },
  pinLabel: { color: '#f59e0b', fontSize: 10, marginBottom: 3 },
  bubble: { maxWidth: '82%', borderRadius: 16, padding: 10, borderWidth: 1 },
  ownBubble: { backgroundColor: '#1e3a5f', borderColor: '#2563eb' },
  otherBubble: { backgroundColor: COLORS.panel, borderColor: COLORS.border },
  adminBubble: { backgroundColor: '#2d1515', borderColor: '#dc2626' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, gap: 8 },
  sender: { fontWeight: '700', fontSize: 12 },
  disasterId: { color: COLORS.border, fontSize: 10 },
  text: { color: '#fff', fontSize: 14, lineHeight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, gap: 6 },
  time: { color: COLORS.border, fontSize: 10 },
  ttsBtn: { padding: 2 },
});
