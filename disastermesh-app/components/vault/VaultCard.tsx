import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

interface VaultEntry { id: string; contactName: string; relation: string; type: 'text' | 'voice' | 'photo'; updatedAt: string; }
interface Props { entry: VaultEntry; onOpen: () => void; }

const TYPE_ICON: Record<string, string> = { text: 'document-text-outline', voice: 'mic-outline', photo: 'image-outline' };

export function VaultCard({ entry, onOpen }: Props) {
  const updated = new Date(entry.updatedAt).toLocaleDateString();
  return (
    <TouchableOpacity style={styles.card} onPress={onOpen} activeOpacity={0.8}>
      <View style={styles.avatarBox}>
        <Text style={styles.initial}>{entry.contactName[0]?.toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{entry.contactName}</Text>
        <Text style={styles.relation}>{entry.relation}</Text>
        <Text style={styles.updated}>Updated {updated}</Text>
      </View>
      <Ionicons name={TYPE_ICON[entry.type] as any} size={20} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.panel, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  avatarBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a2744', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 2, borderColor: COLORS.border },
  initial: { color: '#fff', fontWeight: '700', fontSize: 18 },
  info: { flex: 1 },
  name: { color: '#fff', fontWeight: '700', fontSize: 15 },
  relation: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  updated: { color: COLORS.border, fontSize: 11, marginTop: 2 },
});
