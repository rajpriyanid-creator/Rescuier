import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator, Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  authenticateVault, saveVaultDocument, getVaultDocuments, deleteVaultDocument
} from '../services/vault';
import { COLORS } from '../utils/constants';

const CATEGORIES = [
  { id: 'id_proof', label: 'ID Proof', icon: 'card', color: '#2563eb' },
  { id: 'medical', label: 'Medical', icon: 'medkit', color: '#dc2626' },
  { id: 'insurance', label: 'Insurance', icon: 'shield-checkmark', color: '#16a34a' },
  { id: 'property', label: 'Property', icon: 'home', color: '#d97706' },
  { id: 'emergency', label: 'Emergency', icon: 'alert-circle', color: '#7c3aed' },
  { id: 'other', label: 'Other', icon: 'folder', color: '#64748b' },
];

export default function VaultScreen() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDoc, setNewDoc] = useState({ category: 'id_proof', title: '', content: '' });

  useEffect(() => {
    authenticate();
  }, []);

  const authenticate = async () => {
    setLoading(true);
    const success = await authenticateVault();
    if (!success) {
      Alert.alert('Authentication Required', 'Biometric authentication failed.', [
        { text: 'Try Again', onPress: authenticate },
        { text: 'Cancel', onPress: () => router.back() },
      ]);
    } else {
      setAuthenticated(true);
      await loadDocuments();
    }
    setLoading(false);
  };

  const loadDocuments = async () => {
    try {
      const docs = await getVaultDocuments();
      setDocuments(docs);
    } catch (e) {
      Alert.alert('Error', 'Failed to load vault documents');
    }
  };

  const addDocument = async () => {
    if (!newDoc.title.trim() || !newDoc.content.trim()) {
      Alert.alert('Error', 'Title and content are required'); return;
    }
    try {
      setLoading(true);
      await saveVaultDocument(newDoc.category, { title: newDoc.title, content: newDoc.content });
      await loadDocuments();
      setShowAddModal(false);
      setNewDoc({ category: 'id_proof', title: '', content: '' });
    } catch {
      Alert.alert('Error', 'Failed to save document');
    } finally { setLoading(false); }
  };

  const deleteDoc = (id: string) => {
    Alert.alert('Delete Document', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteVaultDocument(id);
          setDocuments((prev) => prev.filter((d) => d.id !== id));
        },
      },
    ]);
  };

  const filteredDocs = selectedCategory === 'all'
    ? documents
    : documents.filter((d) => d.category === selectedCategory);

  const catInfo = (cat: string) => CATEGORIES.find((c) => c.id === cat);

  if (loading && !authenticated) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="lock-closed" size={56} color={COLORS.danger} />
        <Text style={styles.lockTitle}>Authenticating…</Text>
        <ActivityIndicator color={COLORS.danger} style={{ marginTop: 16 }} />
      </SafeAreaView>
    );
  }

  if (!authenticated) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="lock-closed" size={18} color={COLORS.safe} />
          <Text style={styles.title}>Emergency Vault</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={28} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Documents encrypted on-device. No server storage.</Text>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
        <TouchableOpacity
          style={[styles.catChip, selectedCategory === 'all' && styles.catChipActive]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[styles.catChipText, selectedCategory === 'all' && styles.catChipTextActive]}>All ({documents.length})</Text>
        </TouchableOpacity>
        {CATEGORIES.map((cat) => {
          const count = documents.filter((d) => d.category === cat.id).length;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catChip, selectedCategory === cat.id && { borderColor: cat.color }]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Ionicons name={cat.icon as any} size={13} color={selectedCategory === cat.id ? cat.color : COLORS.muted} />
              <Text style={[styles.catChipText, selectedCategory === cat.id && { color: cat.color }]}>
                {cat.label} {count > 0 ? `(${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Documents list */}
      <ScrollView contentContainerStyle={styles.docs}>
        {filteredDocs.length === 0 ? (
          <View style={styles.emptyView}>
            <Ionicons name="document-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>No documents in this category</Text>
            <TouchableOpacity style={styles.addFirstBtn} onPress={() => setShowAddModal(true)}>
              <Text style={styles.addFirstText}>+ Add Document</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredDocs.map((doc) => {
            const cat = catInfo(doc.category);
            return (
              <View key={doc.id} style={[styles.docCard, { borderLeftColor: cat?.color || COLORS.border }]}>
                <View style={styles.docHeader}>
                  <View style={styles.docIcon}>
                    <Ionicons name={cat?.icon as any || 'document'} size={18} color={cat?.color || COLORS.muted} />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docTitle}>{doc.data.title}</Text>
                    <Text style={styles.docCat}>{cat?.label || doc.category}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteDoc(doc.id)}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.muted} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.docContent} numberOfLines={3}>{doc.data.content}</Text>
                <Text style={styles.docDate}>
                  {new Date(doc.createdAt).toLocaleDateString()}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Document Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.muted} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Document</Text>
            <TouchableOpacity onPress={addDocument} disabled={loading}>
              {loading ? <ActivityIndicator color={COLORS.danger} /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catSelectBtn, newDoc.category === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '22' }]}
                  onPress={() => setNewDoc((d) => ({ ...d, category: cat.id }))}
                >
                  <Ionicons name={cat.icon as any} size={14} color={newDoc.category === cat.id ? cat.color : COLORS.muted} />
                  <Text style={[styles.catSelectText, newDoc.category === cat.id && { color: cat.color }]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput
              style={styles.fieldInput}
              value={newDoc.title}
              onChangeText={(t) => setNewDoc((d) => ({ ...d, title: t }))}
              placeholder="e.g. Aadhaar Card"
              placeholderTextColor={COLORS.muted}
            />

            <Text style={styles.fieldLabel}>Content *</Text>
            <TextInput
              style={[styles.fieldInput, styles.contentInput]}
              value={newDoc.content}
              onChangeText={(t) => setNewDoc((d) => ({ ...d, content: t }))}
              placeholder="Document number, notes, emergency contacts…"
              placeholderTextColor={COLORS.muted}
              multiline numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.encryptNote}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.safe} />
              <Text style={styles.encryptText}>Encrypted with AES-256-GCM. Stored only on your device.</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  lockTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border
  },
  headerCenter: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 11, color: COLORS.muted, textAlign: 'center', paddingVertical: 6, backgroundColor: '#052e16' },
  catScroll: { maxHeight: 44 },
  catContent: { paddingHorizontal: 12, gap: 8, paddingVertical: 6 },
  catChip: {
    flexDirection: 'row', gap: 5, alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border
  },
  catChipActive: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  catChipText: { color: COLORS.muted, fontSize: 11, fontWeight: '600' },
  catChipTextActive: { color: '#fff' },
  docs: { padding: 14, gap: 10 },
  emptyView: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { color: COLORS.muted, fontSize: 14 },
  addFirstBtn: { backgroundColor: COLORS.panel, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  addFirstText: { color: COLORS.danger, fontWeight: '600' },
  docCard: {
    backgroundColor: COLORS.panel, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 3
  },
  docHeader: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 },
  docIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1a2744', alignItems: 'center', justifyContent: 'center' },
  docInfo: { flex: 1 },
  docTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  docCat: { color: COLORS.muted, fontSize: 10, marginTop: 1 },
  docContent: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },
  docDate: { color: COLORS.border, fontSize: 10, marginTop: 6 },
  modal: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  saveText: { color: COLORS.danger, fontWeight: '700', fontSize: 15 },
  modalScroll: { padding: 16 },
  fieldLabel: { fontSize: 12, color: COLORS.muted, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: {
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 14, marginBottom: 16
  },
  contentInput: { height: 120, paddingTop: 12 },
  catSelectBtn: {
    flexDirection: 'row', gap: 5, alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10,
    backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border
  },
  catSelectText: { color: COLORS.muted, fontSize: 12 },
  encryptNote: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    backgroundColor: '#052e16', borderRadius: 10, padding: 10, marginBottom: 30
  },
  encryptText: { color: '#86efac', fontSize: 11 },
});
