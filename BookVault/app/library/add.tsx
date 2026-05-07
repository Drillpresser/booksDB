import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme';
import { lookupByIsbn, deriveSortAuthor } from '../../src/services/bookLookup';
import { lookupBookWithClaude, fillMissingFields, suggestClassification, getApiKey } from '../../src/services/claude';
import { insertBookRecord, insertBookCopy, saveCoverImage, getRecordByIsbn, getCopyCountForRecord } from '../../src/database/queries/books';
import { getAllMainClasses, getSectionsByMainClass, getDivisionsBySection } from '../../src/database/queries/classifications';
import type { BookLookupResult, MainClass, Section, Division } from '../../src/types';

type AddMode = 'choose' | 'scan' | 'manual';

export default function AddBookScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AddMode>('choose');
  const [isbnInput, setIsbnInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<BookLookupResult>>({});
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null);
  const [classPickerVisible, setClassPickerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);

  const [mainClasses, setMainClasses] = useState<MainClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [selectedMainClass, setSelectedMainClass] = useState<MainClass | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [classPickerLevel, setClassPickerLevel] = useState<'main' | 'section' | 'division'>('main');

  useEffect(() => {
    setMainClasses(getAllMainClasses());
  }, []);

  async function handleIsbnLookup(isbn: string) {
    if (!isbn.trim()) return;
    setLoading(true);
    try {
      let result = await lookupByIsbn(isbn.trim());
      if (!result) {
        const hasKey = await getApiKey();
        if (hasKey) {
          result = await lookupBookWithClaude(isbn.trim());
        }
      }
      if (result) {
        setFormData({ ...result });
        if (!result.title && !result.authors?.length) {
          Alert.alert('Not Found', 'No data found for this ISBN. You can fill in the details manually.');
        }
      } else {
        Alert.alert('Not Found', 'Could not find this book. Fill in the details manually.');
        setFormData({});
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAskClaude() {
    const hasKey = await getApiKey();
    if (!hasKey) {
      Alert.alert('No API Key', 'Add your Anthropic API key in Settings to use Claude.');
      return;
    }
    setLoading(true);
    try {
      const filled = await fillMissingFields(formData);
      if (filled) setFormData((prev) => ({ ...prev, ...filled }));
    } finally {
      setLoading(false);
    }
  }

  async function handleSuggestClassification() {
    const hasKey = await getApiKey();
    if (!hasKey) {
      Alert.alert('No API Key', 'Add your Anthropic API key in Settings to use Claude.');
      return;
    }
    if (!formData.title) {
      Alert.alert('Title Required', 'Enter a title before requesting a classification suggestion.');
      return;
    }
    setLoading(true);
    try {
      const allSections = mainClasses.flatMap((m) => getSectionsByMainClass(m.id));
      const allDivisions = allSections.flatMap((s) => getDivisionsBySection(s.id));
      const suggestion = await suggestClassification(
        { title: formData.title ?? '', authors: formData.authors ?? [], synopsis: formData.synopsis ?? null, deweyDecimal: formData.deweyDecimal ?? null },
        { mainClasses, sections: allSections, divisions: allDivisions }
      );
      if (suggestion.divisionId) {
        const div = allDivisions.find((d) => d.id === suggestion.divisionId) ?? null;
        const sec = div ? allSections.find((s) => s.id === div.sectionId) ?? null : null;
        const mc = sec ? mainClasses.find((m) => m.id === sec.mainClassId) ?? null : null;
        setSelectedDivision(div);
        setSelectedSection(sec);
        setSelectedMainClass(mc);
        setSelectedDivisionId(suggestion.divisionId);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!formData.title?.trim()) {
      Alert.alert('Title Required', 'Please enter a book title.');
      return;
    }
    setLoading(true);
    try {
      const isbn = isbnInput.trim() || null;
      let recordId: string;
      let copyNumber = 1;

      const existingRecord = isbn ? getRecordByIsbn(isbn) : null;
      if (existingRecord) {
        recordId = existingRecord.id;
        copyNumber = getCopyCountForRecord(recordId) + 1;
      } else {
        const authors = formData.authors ?? [];
        let coverImage: string | null = null;
        if (formData.coverUrl) {
          const tmpId = Math.random().toString(36).slice(2);
          coverImage = await saveCoverImage(tmpId, formData.coverUrl);
        }
        recordId = insertBookRecord({
          title: formData.title,
          authors,
          sortAuthor: deriveSortAuthor(authors),
          isbn13: isbn,
          publisher: formData.publisher ?? null,
          publishedYear: formData.publishedYear ?? null,
          pageCount: formData.pageCount ?? null,
          synopsis: formData.synopsis ?? null,
          coverImage,
          deweyDecimal: formData.deweyDecimal ?? null,
          communityRating: formData.communityRating ?? null,
          communityRatingCount: formData.communityRatingCount ?? null,
          communityRatingFetched: formData.communityRating ? new Date().toISOString() : null,
        });
        if (coverImage) {
          const { updateBookRecord } = require('../../src/database/queries/books');
          updateBookRecord(recordId, { coverImage });
        }
      }

      insertBookCopy({
        recordId,
        copyNumber,
        divisionId: selectedDivisionId,
        personalRating: null,
        notes: null,
        dateAdded: new Date().toISOString(),
      });

      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to save the book. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (mode === 'scan') {
    if (!permission?.granted) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.center}>
            <Text style={styles.permText}>Camera access is needed to scan barcodes.</Text>
            <TouchableOpacity style={styles.btn} onPress={requestPermission}>
              <Text style={styles.btnText}>Grant Camera Access</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnOutline} onPress={() => setMode('choose')}>
              <Text style={styles.btnOutlineText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8'] }}
          onBarcodeScanned={({ data }) => {
            if (scanned.current) return;
            scanned.current = true;
            setIsbnInput(data);
            setMode('manual');
            handleIsbnLookup(data);
          }}
        />
        <View style={styles.scanOverlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanHint}>Point at the barcode on the back of the book</Text>
          <TouchableOpacity style={styles.btnOutline} onPress={() => setMode('choose')}>
            <Text style={styles.btnOutlineText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (mode === 'choose') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="book-outline" size={72} color={colors.primary} />
          <Text style={styles.chooseTitle}>Add a Book</Text>
          <TouchableOpacity style={styles.btn} onPress={() => setMode('scan')}>
            <Ionicons name="barcode-outline" size={22} color="#fff" style={{ marginRight: spacing.sm }} />
            <Text style={styles.btnText}>Scan Barcode</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.textSecondary }]} onPress={() => setMode('manual')}>
            <Ionicons name="pencil-outline" size={22} color="#fff" style={{ marginRight: spacing.sm }} />
            <Text style={styles.btnText}>Enter Manually</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const classLabel = selectedDivision
    ? `${selectedMainClass?.code} › ${selectedSection?.code} › ${selectedDivision?.code} — ${selectedDivision?.name}`
    : 'Unclassified';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.form}>
        <View style={styles.isbnRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="ISBN"
            value={isbnInput}
            onChangeText={setIsbnInput}
            keyboardType="numeric"
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity style={styles.lookupBtn} onPress={() => handleIsbnLookup(isbnInput)} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.lookupBtnText}>Look Up</Text>}
          </TouchableOpacity>
        </View>

        <TextInput style={styles.input} placeholder="Title *" value={formData.title ?? ''} onChangeText={(v) => setFormData((p) => ({ ...p, title: v }))} placeholderTextColor={colors.textSecondary} />
        <TextInput style={styles.input} placeholder="Author(s) — comma separated" value={(formData.authors ?? []).join(', ')} onChangeText={(v) => setFormData((p) => ({ ...p, authors: v.split(',').map((a) => a.trim()).filter(Boolean) }))} placeholderTextColor={colors.textSecondary} />
        <TextInput style={styles.input} placeholder="Publisher" value={formData.publisher ?? ''} onChangeText={(v) => setFormData((p) => ({ ...p, publisher: v }))} placeholderTextColor={colors.textSecondary} />
        <TextInput style={styles.input} placeholder="Year" value={formData.publishedYear?.toString() ?? ''} onChangeText={(v) => setFormData((p) => ({ ...p, publishedYear: parseInt(v) || null }))} keyboardType="numeric" placeholderTextColor={colors.textSecondary} />
        <TextInput style={styles.input} placeholder="Pages" value={formData.pageCount?.toString() ?? ''} onChangeText={(v) => setFormData((p) => ({ ...p, pageCount: parseInt(v) || null }))} keyboardType="numeric" placeholderTextColor={colors.textSecondary} />
        <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Synopsis" value={formData.synopsis ?? ''} onChangeText={(v) => setFormData((p) => ({ ...p, synopsis: v }))} multiline placeholderTextColor={colors.textSecondary} />

        <View style={styles.sectionLabel}><Text style={styles.sectionLabelText}>Classification</Text></View>
        <View style={styles.classRow}>
          <TouchableOpacity style={styles.classPicker} onPress={() => { setClassPickerLevel('main'); setClassPickerVisible(true); }}>
            <Text style={[styles.classPickerText, !selectedDivision && { color: colors.textSecondary }]} numberOfLines={2}>{classLabel}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          {selectedDivision && (
            <TouchableOpacity onPress={() => { setSelectedMainClass(null); setSelectedSection(null); setSelectedDivision(null); setSelectedDivisionId(null); }}>
              <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.claudeBtn} onPress={handleAskClaude} disabled={loading}>
          <Ionicons name="sparkles-outline" size={18} color={colors.primary} style={{ marginRight: spacing.xs }} />
          <Text style={styles.claudeBtnText}>Ask Claude to fill missing fields</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.claudeBtn} onPress={handleSuggestClassification} disabled={loading}>
          <Ionicons name="sparkles-outline" size={18} color={colors.primary} style={{ marginRight: spacing.xs }} />
          <Text style={styles.claudeBtnText}>Ask Claude to suggest classification</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, { marginTop: spacing.lg }]} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Book</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={classPickerVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {classPickerLevel === 'main' ? 'Main Class' : classPickerLevel === 'section' ? 'Section' : 'Division'}
            </Text>
            <TouchableOpacity onPress={() => setClassPickerVisible(false)}>
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>
          {classPickerLevel === 'main' && (
            <FlatList
              data={mainClasses}
              keyExtractor={(m) => m.id}
              renderItem={({ item: mc }) => (
                <TouchableOpacity style={styles.pickerRow} onPress={() => { setSelectedMainClass(mc); setSections(getSectionsByMainClass(mc.id)); setClassPickerLevel('section'); }}>
                  <Text style={styles.pickerCode}>{mc.code}</Text>
                  <Text style={styles.pickerName}>{mc.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            />
          )}
          {classPickerLevel === 'section' && (
            <FlatList
              data={sections}
              keyExtractor={(s) => s.id}
              renderItem={({ item: sec }) => (
                <TouchableOpacity style={styles.pickerRow} onPress={() => { setSelectedSection(sec); setDivisions(getDivisionsBySection(sec.id)); setClassPickerLevel('division'); }}>
                  <Text style={styles.pickerCode}>{sec.code}</Text>
                  <Text style={styles.pickerName}>{sec.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            />
          )}
          {classPickerLevel === 'division' && (
            <FlatList
              data={divisions}
              keyExtractor={(d) => d.id}
              renderItem={({ item: div }) => (
                <TouchableOpacity style={styles.pickerRow} onPress={() => { setSelectedDivision(div); setSelectedDivisionId(div.id); setClassPickerVisible(false); }}>
                  <Text style={styles.pickerCode}>{div.code}</Text>
                  <Text style={styles.pickerName}>{div.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  chooseTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  permText: { fontSize: 16, color: colors.text, textAlign: 'center', marginBottom: spacing.md },
  form: { padding: spacing.md, gap: spacing.sm },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 16, color: colors.text },
  isbnRow: { flexDirection: 'row', gap: spacing.sm },
  lookupBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, justifyContent: 'center' },
  lookupBtnText: { color: '#fff', fontWeight: '700' },
  sectionLabel: { marginTop: spacing.sm },
  sectionLabelText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  classPicker: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  classPickerText: { flex: 1, fontSize: 15, color: colors.text },
  claudeBtn: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primaryLight },
  claudeBtnText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, minWidth: 200 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnOutline: { borderWidth: 2, borderColor: colors.primary, borderRadius: radius.md, padding: spacing.md, minWidth: 160, alignItems: 'center' },
  btnOutlineText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  scanOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: 'rgba(0,0,0,0.5)' },
  scanFrame: { position: 'absolute', top: '30%', alignSelf: 'center', width: 260, height: 120, borderWidth: 2, borderColor: '#fff', borderRadius: radius.md },
  scanHint: { color: '#fff', fontSize: 14, textAlign: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  pickerRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border, gap: spacing.md },
  pickerCode: { width: 52, fontSize: 13, fontWeight: '700', color: colors.primary },
  pickerName: { flex: 1, fontSize: 16, color: colors.text },
});
