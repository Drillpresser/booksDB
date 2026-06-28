import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal, FlatList, Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme';
import * as FileSystem from 'expo-file-system';
import { lookupByIsbn, searchBooks, deriveSortAuthor } from '../../src/services/bookLookup';
import { lookupBookWithClaude, fillMissingFields, suggestClassification, getApiKey } from '../../src/services/claude';
import { insertBookRecord, insertBookCopy, saveCoverImage, getRecordByIsbn, getCopyCountForRecord } from '../../src/database/queries/books';
import { generateId, getDB } from '../../src/database/db';
import { getAllMainClasses, getSectionsByMainClass, getDivisionsBySection } from '../../src/database/queries/classifications';
import { getMyLibraries, syncBookToLibraries } from '../../src/services/library';
import type { Library } from '../../src/services/library';
import type { BookLookupResult, MainClass, Section, Division } from '../../src/types';

type AddMode = 'choose' | 'scan' | 'search' | 'manual';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookLookupResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [myLibraries, setMyLibraries] = useState<Library[]>([]);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);

  useEffect(() => {
    setMainClasses(getAllMainClasses());
    getMyLibraries().then(setMyLibraries).catch(() => {});
  }, []);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const results = await searchBooks(searchQuery);
      setSearchResults(results);
      if (results.length === 0) Alert.alert('No Results', 'No books found. Try different keywords.');
    } finally {
      setSearching(false);
    }
  }

  function handleSearchResultSelect(result: BookLookupResult) {
    setFormData({ ...result });
    const isbn = result.isbn13 ?? '';
    setIsbnInput(isbn);
    setMode('manual');
    if (isbn) handleIsbnLookup(isbn);
  }

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
        if (result.language === 'non-en') {
          Alert.alert(
            'Non-English Edition',
            'This ISBN appears to be a non-English edition. Review the details before saving.',
          );
        } else if (!result.title && !result.authors?.length) {
          Alert.alert('Not Found', 'No data found for this ISBN. You can fill in the details manually.');
        }
      } else {
        Alert.alert('Not Found', 'Could not find this book. Fill in the details manually.');
        setFormData({});
      }
    } catch {
      Alert.alert('Lookup Failed', 'Could not look up this ISBN. Enter details manually.');
      setFormData({});
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
    } catch {
      Alert.alert('Error', 'Claude could not fill in the fields. Please try again.');
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
    } catch {
      Alert.alert('Error', 'Could not get a classification suggestion. Please try again.');
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
      const preId = generateId();

      const existingRecord = isbn ? getRecordByIsbn(isbn) : null;

      // Download cover before opening the transaction (async work must happen outside).
      // Use preId as the filename so the file is already named for the record it will belong to.
      let coverImage: string | null = null;
      if (!existingRecord && formData.coverUrl) {
        const httpsUrl = formData.coverUrl.replace(/^http:\/\//i, 'https://');
        coverImage = await saveCoverImage(preId, httpsUrl) ?? httpsUrl;
      }

      let newCopyId = '';
      let savedRecordId = '';
      let savedCopyNumber = 1;

      try {
        getDB().withTransactionSync(() => {
          let recordId: string;
          let copyNumber = 1;

          if (existingRecord) {
            recordId = existingRecord.id;
            copyNumber = getCopyCountForRecord(recordId) + 1;
          } else {
            const authors = formData.authors ?? [];
            recordId = insertBookRecord(
              {
                title: formData.title!,
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
              },
              preId,
            );
          }

          newCopyId = insertBookCopy({
            recordId,
            copyNumber,
            divisionId: selectedDivisionId,
            personalRating: null,
            notes: null,
            dateAdded: new Date().toISOString(),
          });
          savedRecordId = recordId;
          savedCopyNumber = copyNumber;
        });
      } catch (e) {
        // Transaction rolled back — clean up the downloaded cover file if any.
        if (coverImage) {
          FileSystem.deleteAsync(coverImage, { idempotent: true }).catch(() => {});
        }
        throw e;
      }

      if (selectedLibraryIds.length > 0 && newCopyId) {
        const authors = formData.authors ?? [];
        syncBookToLibraries(selectedLibraryIds, {
          copyId: newCopyId,
          recordId: savedRecordId,
          title: formData.title!,
          authors,
          sortAuthor: deriveSortAuthor(authors),
          isbn13: isbn,
          publisher: formData.publisher ?? null,
          publishedYear: formData.publishedYear ?? null,
          pageCount: formData.pageCount ?? null,
          synopsis: formData.synopsis ?? null,
          coverImage: formData.coverUrl ? formData.coverUrl.replace(/^http:\/\//i, 'https://') : null,
          deweyDecimal: formData.deweyDecimal ?? null,
          copyNumber: savedCopyNumber,
          divisionCode: selectedDivision?.code ?? null,
          divisionName: selectedDivision?.name ?? null,
          sectionCode: selectedSection?.code ?? null,
          sectionName: selectedSection?.name ?? null,
          mainClassCode: selectedMainClass?.code ?? null,
          mainClassName: selectedMainClass?.name ?? null,
          isOnLoan: false,
        }).catch(() => {});
      }

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

  if (mode === 'search') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.searchHeader}>
          <TouchableOpacity onPress={() => setMode('choose')} style={styles.searchBack}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder="Title, author, or keywords…"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
            {searching
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="search" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>

        <FlatList
          data={searchResults}
          keyExtractor={(_, i) => String(i)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.searchResultRow} onPress={() => handleSearchResultSelect(item)} activeOpacity={0.7}>
              {item.coverUrl ? (
                <Image source={{ uri: item.coverUrl }} style={styles.searchResultCover} />
              ) : (
                <View style={[styles.searchResultCover, styles.searchResultCoverPlaceholder]}>
                  <Ionicons name="book-outline" size={22} color={colors.border} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.searchResultTitle} numberOfLines={2}>{item.title}</Text>
                {item.authors.length > 0 && (
                  <Text style={styles.searchResultAuthor} numberOfLines={1}>{item.authors.join(', ')}</Text>
                )}
                {item.publishedYear && (
                  <Text style={styles.searchResultYear}>{item.publishedYear}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !searching && searchResults.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <Ionicons name="search-outline" size={48} color={colors.border} />
                <Text style={{ color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }}>
                  Search for a book by title, author, or keywords.
                </Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
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
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent ?? colors.textSecondary }]} onPress={() => { setSearchQuery(''); setSearchResults([]); setMode('search'); }}>
            <Ionicons name="search-outline" size={22} color="#fff" style={{ marginRight: spacing.sm }} />
            <Text style={styles.btnText}>Search by Title / Author</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.textSecondary }]} onPress={() => setMode('manual')}>
            <Ionicons name="pencil-outline" size={22} color="#fff" style={{ marginRight: spacing.sm }} />
            <Text style={styles.btnText}>Enter Manually</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelLink} onPress={() => router.back()}>
            <Text style={styles.cancelLinkText}>Cancel</Text>
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
        <TouchableOpacity style={styles.backRow} onPress={() => setMode('choose')}>
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <Text style={styles.backRowText}>Choose different method</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="ISBN"
          value={isbnInput}
          onChangeText={setIsbnInput}
          onEndEditing={() => { if (isbnInput.trim()) handleIsbnLookup(isbnInput.trim()); }}
          keyboardType="numeric"
          placeholderTextColor={colors.textSecondary}
        />

        <TextInput style={styles.input} placeholder="Title *" value={formData.title ?? ''} onChangeText={(v) => setFormData((p) => ({ ...p, title: v }))} placeholderTextColor={colors.textSecondary} />
        <TextInput style={styles.input} placeholder="Author(s) — comma separated" value={(formData.authors ?? []).join(', ')} onChangeText={(v) => setFormData((p) => ({ ...p, authors: v.split(',').map((a) => a.trim()).filter(Boolean) }))} placeholderTextColor={colors.textSecondary} />
        <TextInput style={styles.input} placeholder="Publisher" value={formData.publisher ?? ''} onChangeText={(v) => setFormData((p) => ({ ...p, publisher: v }))} placeholderTextColor={colors.textSecondary} />
        <TextInput style={styles.input} placeholder="Year" value={formData.publishedYear?.toString() ?? ''} onChangeText={(v) => setFormData((p) => ({ ...p, publishedYear: parseInt(v) || null }))} keyboardType="numeric" placeholderTextColor={colors.textSecondary} />
        <TextInput style={styles.input} placeholder="Pages" value={formData.pageCount?.toString() ?? ''} onChangeText={(v) => setFormData((p) => ({ ...p, pageCount: parseInt(v) || null }))} keyboardType="numeric" placeholderTextColor={colors.textSecondary} />
        <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Synopsis" value={formData.synopsis ?? ''} onChangeText={(v) => setFormData((p) => ({ ...p, synopsis: v }))} multiline placeholderTextColor={colors.textSecondary} />

        <View style={styles.sectionLabel}><Text style={styles.sectionLabelText}>Classification</Text></View>
        <View style={styles.classRow}>
          <TouchableOpacity style={styles.classPicker} onPress={() => { setClassPickerLevel('main'); setSections([]); setDivisions([]); setClassPickerVisible(true); }}>
            <Text style={[styles.classPickerText, !selectedDivision && { color: colors.textSecondary }]} numberOfLines={2}>{classLabel}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          {selectedDivision && (
            <TouchableOpacity onPress={() => { setSelectedMainClass(null); setSelectedSection(null); setSelectedDivision(null); setSelectedDivisionId(null); }}>
              <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {myLibraries.length > 0 && (
          <>
            <View style={styles.sectionLabel}><Text style={styles.sectionLabelText}>Add to Shelves</Text></View>
            <View style={styles.libraryChips}>
              {myLibraries.map((lib) => {
                const selected = selectedLibraryIds.includes(lib.id);
                return (
                  <TouchableOpacity
                    key={lib.id}
                    style={[styles.libraryChip, selected && styles.libraryChipSelected]}
                    onPress={() => setSelectedLibraryIds((prev) =>
                      selected ? prev.filter((id) => id !== lib.id) : [...prev, lib.id]
                    )}
                  >
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'library-outline'}
                      size={14}
                      color={selected ? '#fff' : colors.primary}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.libraryChipText, selected && styles.libraryChipTextSelected]}>
                      {lib.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

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
        <TouchableOpacity style={styles.cancelLink} onPress={() => router.back()}>
          <Text style={styles.cancelLinkText}>Cancel — don't save</Text>
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
  sectionLabel: { marginTop: spacing.sm },
  sectionLabelText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  classPicker: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  classPickerText: { flex: 1, fontSize: 15, color: colors.text },
  libraryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  libraryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  libraryChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  libraryChipText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  libraryChipTextSelected: { color: '#fff' },
  claudeBtn: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.primaryLight },
  claudeBtnText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, minWidth: 200 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnOutline: { borderWidth: 2, borderColor: colors.primary, borderRadius: radius.md, padding: spacing.md, minWidth: 160, alignItems: 'center' },
  btnOutlineText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  cancelLink: { alignItems: 'center', paddingVertical: spacing.md },
  cancelLinkText: { color: colors.textSecondary, fontSize: 15 },
  backRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.xs },
  backRowText: { color: colors.primary, fontSize: 14 },
  searchHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  searchBack: { padding: spacing.xs },
  searchInput: { flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15, color: colors.text },
  searchBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.sm, justifyContent: 'center', alignItems: 'center', width: 40, height: 40 },
  searchResultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.border },
  searchResultCover: { width: 44, height: 64, borderRadius: radius.sm },
  searchResultCoverPlaceholder: { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  searchResultTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  searchResultAuthor: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  searchResultYear: { fontSize: 12, color: colors.textMuted ?? colors.textSecondary, marginTop: 2 },
  scanOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: 'rgba(0,0,0,0.5)' },
  scanFrame: { position: 'absolute', top: '30%', alignSelf: 'center', width: 260, height: 120, borderWidth: 2, borderColor: '#fff', borderRadius: radius.md },
  scanHint: { color: '#fff', fontSize: 14, textAlign: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  pickerRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border, gap: spacing.md },
  pickerCode: { width: 52, fontSize: 13, fontWeight: '700', color: colors.primary },
  pickerName: { flex: 1, fontSize: 16, color: colors.text },
});
