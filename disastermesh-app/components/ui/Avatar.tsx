import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS } from '../../utils/constants';

interface Props { name?: string; photo?: string; size?: number; role?: string; }

export function Avatar({ name, photo, size = 40, role }: Props) {
  const initials = name ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '??';
  const roleColor = role === 'responder' ? '#f59e0b' : role === 'admin' ? '#dc2626' : COLORS.blue;

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, borderColor: roleColor }]}>
      {photo
        ? <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        : <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
      }
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  initials: { color: '#fff', fontWeight: '700' },
});
