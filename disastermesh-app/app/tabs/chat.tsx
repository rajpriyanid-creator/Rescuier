import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { useAppStore } from '../../store/appStore';
import { COLORS } from '../../utils/constants';

const MSG_TYPE_ICONS: Record<string, string> = {
  text: 'chatbubble',
  location: 'location',
  medical_need: 'medkit',
  resource: 'cube',
  shelter: 'home',
  missing: 'person-remove',
  sos: 'alert-circle',
};

const MSG_TYPE_COLORS: Record<string, string> = {
  sos: COLORS.danger,
  medical_need: '#f97316',
  missing: '#d97706',
  shelter: '#2563eb',
  resource: '#16a34a',
  text: COLORS.panel,
};

export default function ChatScreen() {
  const { user, activeEvent } = useAppStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [msgType, setMsgType] = useState('text');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user) return;
    loadMessages();
    setupSocket();
  }, [user?.city]);

  const loadMessages = async () => {
    if (!user?.city) return;
    try {
      const res = await api.get(`/chat/${user.city}`);
      setMessages(res.data.messages || []);
    } catch {} finally { setLoading(false); }
  };

  const setupSocket = async () => {
    const socket = await getSocket();
    socket.on('chat:message', (data: any) => {
      setMessages((prev) => [...prev, data.message]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    });
    socket.on('chat:pinned', (data: any) => {
      setMessages((prev) => prev.map((m) => m._id === data.messageId ? { ...m, isPinned: true } : m));
    });
  };

  const sendMessage = async () => {
    if (!text.trim() || !activeEvent || !user) return;
    setSending(true);
    try {
      await api.post('/chat', {
        eventId: activeEvent._id,
        type: msgType,
        text: text.trim(),
      });
      setText('');
    } catch {} finally { setSending(false); }
  };

  const renderMessage = useCallback(({ item: msg }: { item: any }) => {
    const isMe = msg.senderId === user?._id || msg.senderId?._id === user?._id;
    const bgColor = isMe ? '#1e3a5f' : MSG_TYPE_COLORS[msg.type] || COLORS.panel;

    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        <View style={[styles.msgBubble, { backgroundColor: bgColor }, isMe && styles.msgBubbleMe,
          msg.isPinned && styles.msgPinned]}>
          {msg.isPinned && (
            <View style={styles.pinnedBadge}>
              <Ionicons name="pin" size={10} color="#fbbf24" />
              <Text style={styles.pinnedText}>Pinned</Text>
            </View>
          )}
          {!isMe && (
            <Text style={styles.senderName}>
              {msg.senderName}
              {msg.senderRole !== 'user' && <Text style={styles.senderRole}> ({msg.senderRole})</Text>}
            </Text>
          )}
          {msg.type !== 'text' && (
            <View style={styles.msgTypeTag}>
              <Ionicons name={MSG_TYPE_ICONS[msg.type] as any || 'chatbubble'} size={11} color="#fff" />
              <Text style={styles.msgTypeName}>{msg.type.replace('_', ' ')}</Text>
            </View>
          )}
          <Text style={styles.msgText}>{msg.text}</Text>
          <Text style={styles.msgTime}>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  }, [user?._id]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Community Chat</Text>
          <Text style={styles.headerSub}>{user?.city} · {messages.length} messages</Text>
        </View>
        {!activeEvent && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveBadgeText}>No Active Disaster</Text>
          </View>
        )}
      </View>

      {/* Message type selector */}
      {activeEvent && (
        <View style={styles.typeRow}>
          {['text', 'medical_need', 'resource', 'shelter', 'missing'].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeChip, msgType === t && styles.typeChipActive]}
              onPress={() => setMsgType(t)}
            >
              <Ionicons name={MSG_TYPE_ICONS[t] as any} size={13} color={msgType === t ? '#fff' : COLORS.muted} />
              <Text style={[styles.typeChipText, msgType === t && styles.typeChipTextActive]}>
                {t.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingView}>
          <ActivityIndicator color={COLORS.danger} />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => m._id}
          renderItem={renderMessage}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {activeEvent ? 'No messages yet. Be the first to share.' : 'Chat is active during disasters.'}
            </Text>
          }
        />
      )}

      {/* Input */}
      {activeEvent && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Share your status or info…"
              placeholderTextColor={COLORS.muted}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!text.trim() || sending}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={20} color="#fff" />
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  inactiveBadge: { backgroundColor: '#1f2937', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  inactiveBadgeText: { color: COLORS.muted, fontSize: 11 },
  typeRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8,
    gap: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border
  },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border
  },
  typeChipActive: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  typeChipText: { color: COLORS.muted, fontSize: 10, fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  loadingView: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  msgList: { padding: 12, paddingBottom: 16 },
  empty: { color: COLORS.muted, textAlign: 'center', marginTop: 60, fontSize: 14 },
  msgRow: { marginBottom: 8, alignItems: 'flex-start' },
  msgRowMe: { alignItems: 'flex-end' },
  msgBubble: {
    maxWidth: '78%', borderRadius: 14, padding: 10,
    borderWidth: 1, borderColor: COLORS.border
  },
  msgBubbleMe: { borderBottomRightRadius: 4 },
  msgPinned: { borderColor: '#fbbf24', borderWidth: 1 },
  pinnedBadge: { flexDirection: 'row', gap: 3, alignItems: 'center', marginBottom: 4 },
  pinnedText: { color: '#fbbf24', fontSize: 9, fontWeight: '700' },
  senderName: { color: '#93c5fd', fontSize: 11, fontWeight: '700', marginBottom: 3 },
  senderRole: { color: COLORS.muted, fontStyle: 'italic' },
  msgTypeTag: {
    flexDirection: 'row', gap: 3, alignItems: 'center',
    marginBottom: 4, backgroundColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'flex-start', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4
  },
  msgTypeName: { color: '#fff', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  msgText: { color: '#f1f5f9', fontSize: 14, lineHeight: 20 },
  msgTime: { color: COLORS.muted, fontSize: 9, marginTop: 4, alignSelf: 'flex-end' },
  inputRow: {
    flexDirection: 'row', gap: 8, padding: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border
  },
  input: {
    flex: 1, backgroundColor: COLORS.panel, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    color: '#fff', fontSize: 14, maxHeight: 80,
    borderWidth: 1, borderColor: COLORS.border
  },
  sendBtn: {
    width: 44, height: 44, backgroundColor: COLORS.danger,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center'
  },
  sendBtnDisabled: { opacity: 0.5 },
});
