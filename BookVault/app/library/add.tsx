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
import { lookupByIsbn, searchBooks, deriveSortAuthor } from '../../src/services/bookLookup';
import { lookupBookWithClaude, fillMissingFields, getApiKey } from '../../src/services/claude';
import { insertBookRecord, insertBookCopy, saveCoverImage, getRecordByIsbn, getCopyCountForRecord } from '../../src/database/queries/books';
import { getAllSystems, getRootNodes, getChildNodes, hasChildren, searchNodes, setBookCopyClassification } from '../../src/database/queries/classificationSystems';
import { getAllShelves } from '../../src/database/queries/shelves';
import type { BookLookupResult, ClassificationSystem, ClassificationNode, Shelf } from '../../src/types';

type AddMode = 'choose' | 'scan' | 'search' | 'manual';

export default function AddBookScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AddMode>('choose');
  const [isbnInput, setIsbnInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<BookLookupResult>>({});
  // Separate raw text for author field to avoid space/special-char loss on re-join
  const [authorText, setAuthorText] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);

  // Shelf state
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [shelfPickerVisible, setShelfPickerVisible] = useState(false);

  // Classification state
  const [systems, setSystems] = useState<ClassificationSystem[]>([]);
  const [selectedClassifications, setSelectedClassifications] = useState<Record<string, string | null>>({});
  const [selectedLabels, setSelectedLabels] = useState<Record<string, string>>({});

  // Classification picker modal state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerSystemId, setPickerSystemId] = useState<string | null>(null);
  const [pickerStack, setPickerStack] = useState<ClassificationNode[]>([]);
  const [pickerNodes, setPickerNodes] = useState<ClassificationNode[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSearchResults, setPickerSearchResults] = useState<ClassificationNode[] | null>(null);

  // Book title/author search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BookLookupResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setSystems(getAllSystems());
    setShelves(getAllShelves());
  }, []);

  useEffect(() => {
    if (!pickerSystemId || !pickerSearch.trim()) { setPickerSearchResults(null); return; }
    setPickerSearchResults(searchNodes(pickerSystemId, pickerSearch.trim()));
  }, [pickerSearch, pickerSystemId]);

  // Apply data from external source (ISBN lookup, search, Claude) — also syncs authorText
  function applyExternalData(data: Partial<BookLookupResult>) {
    setFormData(prev => ({ ...prev, ...data }));
    if (data.authors !== undefined) setAuthorText(data.authors.join(', '));
  }

  // --- Book title/author search ---

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
    applyExternalData(result);
    setIsbnInput(result.isbn13 ?? '');
    setMode('manual');
  }

  // --- ISBN lookup ---

  async function handleIsbnLookup(isbn: string) {
    if (!isbn.trim()) return;
    setLoading(true);
    try {
      let result = await lookupByIsbn(isbn.trim());
      if (!result) {
        const hasKey = await getApiKey();
        if (hasKey) result = await lookupBookWithClaude(isbn.trim());
      }
      if (result) {
        applyExternalData(result);
        if (!result.title && !result.authors?.length) {
          Alert.alert('Not Found', 'No data found for this ISBN. You can fill in the details manually.');
        }
      } else {
        Alert.alert('Not Found', 'Could not find this book. Fill in the details manually.');
        setFormData({});
        setAuthorText('');
      }
    } finally {
      setLoading(false);
    }
  }

  // --- Claude fill ---

  async function handleAskClaude() {
    const hasKey = await getApiKey();
    if (!hasKey) {
      Alert.alert('No API Key', 'Add your Anthropic API key in Settings to use Claude.');
      return;
    }
    setLoading(true);
    try {
      const filled = await fillMissingFields(formData);
      if (filled) applyExternalData(filled);
    } finally {
      setLoading(false);
    }
  }

  // --- Classification picker ---

  function openClassPicker(systemId: string) {
    setPickerSystemId(systemId);
    setPickerStack([]);
    setPickerNodes(getRootNodes(systemId));
    setPickerSearch('');
    setPickerSearchResults(null);
    setPickerVisible(true);
  }

  function pickerDrillInto(node: ClassificationNode) {
    setPickerStack(prev => [...prev, node]);
    setPickerNodes(getChildNodes(node.id));
    setPickerSearch('');
    setPickerSearchResults(null);
  }

  function pickerGoBack() {
    const newStack = [...pickerStack];
    newStack.pop();
    setPickerStack(newStack);
    const parent = newStack[newStack.length - 1];
    setPickerNodes(parent ? getChildNodes(parent.id) : getRootNodes(pickerSystemId!));
    setPickerSearch('');
    setPickerSearchResults(null);
  }

  function pickerSelectNode(node: ClassificationNode) {
    setSelectedClassifications(prev => ({ ...prev, [pickerSystemId!]: node.id }));
    setSelectedLabels(prev => ({ ...prev, [pickerSystemId!]: `${node.code} — ${node.label}` }));
    setPickerVisible(false);
  }

  function clearClassification(systemId: string) {
    setSelectedClassifications(prev => ({ ...prev, [systemId]: null }));
    setSelectedLabels(prev => { const n = { ...prev }; delete n[systemId]; return n; });
  }

  // --- Save ---

  async function handleSave() {
    if (!formData.title?.trim()) {
      Alert.alert('Title Required', 'Please enter a book title.');
      return;
    }
    setLoading(true);
    try {
      const isbn = isbnInput.trim() || null;
      // Parse authors from raw text at save time (not the intermediate array)
      const authors = authorText.split(',').map(a => a.trim()).filter(Boolean);
      let recordId: string;
      let copyNumber = 1;

      const existingRecord = isbn ? getRecordByIsbn(isbn) : null;
      if (existingRecord) {
        recordId = existingRecord.id;
        copyNumber = getCopyCountForRecord(recordId) + 1;
      } else {
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

      const copyId = insertBookCopy({
        recordId,
        copyNumber,
        divisionId: null,
        shelfId: selectedShelfId,
        personalRating: null,
        notes: null,
        dateAdded: new Date().toISOString(),
      });

      for (const [systemId, nodeId] of Object.entries(selectedClassifications)) {
        if (nodeId) setBookCopyClassification(copyId, systemId, nodeId);
      }

      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save the book. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // --- Scan mode ---

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

  // --- Book search mode ---

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
            !searching ? (
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

  // --- Choose mode ---

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

  // --- Manual form mode ---

  const selectedShelf = shelves.find(s => s.id === selectedShelfId) ?? null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backRow} onPress={() => setMode('choose')}>
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <Text style={styles.backRowText}>Choose different method</Text>
        </TouchableOpacity>

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

        <TextInput
          style={styles.input}
          placeholder="Title *"
          value={formData.title ?? ''}
          onChangeText={(v) => setFormData(p => ({ ...p, title: v }))}
          placeholderTextColor={colors.textSecondary}
        />
        {/* Author field uses raw text state to preserve spaces and special characters */}
        <TextInput
          style={styles.input}
          placeholder="Author(s) — comma separated"
          value={authorText}
          onChangeText={(v) => {
            setAuthorText(v);
            // Keep formData.authors loosely in sync for Claude/lookup context
            setFormData(p => ({ ...p, authors: v.split(',').map(a => a.trim()).filter(Boolean) }));
          }}
          placeholderTextColor={colors.textSecondary}
        />
        <TextInput style={styles.input} placeholder="Publisher" value={formData.publisher ?? ''} onChangeText={(v) => setFormData(p => ({ ...p, publisher: v }))} placeholderTextColor={colors.textSecondary} />
        <TextInput style={styles.input} placeholder="Year" value={formData.publishedYear?.toString() ?? ''} onChangeText={(v) => setFormData(p => ({ ...p, publishedYear: parseInt(v) || null }))} keyboardType="numeric" placeholderTextColor={colors.textSecondary} />
        <TextInput style={styles.input} placeholder="Pages" value={formData.pageCount?.toString() ?? ''} onChangeText={(v) => setFormData(p => ({ ...p, pageCount: parseInt(v) || null }))} keyboardType="numeric" placeholderTextColor={colors.textSecondary} />
        <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Synopsis" value={formData.synopsis ?? ''} onChangeText={(v) => setFormData(p => ({ ...p, synopsis: v }))} multiline placeholderTextColor={colors.textSecondary} />

        {/* Shelf picker */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>Shelf</Text>
        </View>
        {shelves.length > 0 ? (
          <View style={styles.classRow}>
            <TouchableOpacity style={styles.classPicker} onPress={() => setShelfPickerVisible(true)}>
              <Ionicons name="bookmark-outline" size={18} color={selectedShelf ? colors.primary : colors.textSecondary} />
              <Text style={[styles.classPickerText, !selectedShelf && { color: colors.textSecondary }]} numberOfLines={1}>
                {selectedShelf ? selectedShelf.name : 'No shelf — tap to assign'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {selectedShelf && (
              <TouchableOpacity onPress={() => setSelectedShelfId(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.noSystemsHint}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.noSystemsText}>Create shelves in the Library → Shelves screen to assign books to them.</Text>
          </View>
        )}

        {/* Classification pickers */}
        {systems.length > 0 && (
          <>
            <View style={styles.sectionLabel}>
              <Text style={styles.sectionLabelText}>Classification</Text>
            </View>
            {systems.map(system => {
              const label = selectedLabels[system.id];
              return (
                <View key={system.id} style={styles.classRow}>
                  <TouchableOpacity style={styles.classPicker} onPress={() => openClassPicker(system.id)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.classSystem}>{system.name}</Text>
                      <Text style={[styles.classPickerText, !label && { color: colors.textSecondary }]} numberOfLines={1}>
                        {label ?? 'Unclassified — tap to assign'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {label && (
                    <TouchableOpacity onPress={() => clearClassification(system.id)} hitSlop={8}>
                      <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </>
        )}

        <TouchableOpacity style={styles.claudeBtn} onPress={handleAskClaude} disabled={loading}>
          <Ionicons name="sparkles-outline" size={18} color={colors.primary} style={{ marginRight: spacing.xs }} />
          <Text style={styles.claudeBtnText}>Ask Claude to fill missing fields</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, { marginTop: spacing.lg }]} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Book</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelLink} onPress={() => router.back()}>
          <Text style={styles.cancelLinkText}>Cancel — don't save</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Shelf picker modal */}
      <Modal visible={shelfPickerVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Shelf</Text>
            <TouchableOpacity onPress={() => setShelfPickerVisible(false)}>
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={shelves}
            keyExtractor={s => s.id}
            ListHeaderComponent={
              <TouchableOpacity
                style={[styles.pickerRow, { backgroundColor: !selectedShelfId ? colors.primaryLight : undefined }]}
                onPress={() => { setSelectedShelfId(null); setShelfPickerVisible(false); }}
              >
                <Ionicons name="bookmark-outline" size={20} color={colors.textSecondary} style={{ marginRight: spacing.md }} />
                <Text style={styles.pickerName}>No shelf</Text>
                {!selectedShelfId && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.pickerRow, { backgroundColor: selectedShelfId === item.id ? colors.primaryLight : undefined }]}
                onPress={() => { setSelectedShelfId(item.id); setShelfPickerVisible(false); }}
              >
                <Ionicons name="bookmark" size={20} color={colors.primary} style={{ marginRight: spacing.md }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerName}>{item.name}</Text>
                  {item.description ? <Text style={styles.pickerDesc}>{item.description}</Text> : null}
                </View>
                {selectedShelfId === item.id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Classification node picker modal */}
      <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => pickerStack.length > 0 ? pickerGoBack() : setPickerVisible(false)}>
              <Ionicons name={pickerStack.length > 0 ? 'chevron-back' : 'close'} size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {pickerStack.length > 0
                ? pickerStack[pickerStack.length - 1].label
                : (systems.find(s => s.id === pickerSystemId)?.name ?? 'Classification')}
            </Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerSearchBar}>
            <Ionicons name="search" size={16} color={colors.textSecondary} />
            <TextInput
              style={styles.pickerSearchInput}
              placeholder="Search…"
              placeholderTextColor={colors.textSecondary}
              value={pickerSearch}
              onChangeText={setPickerSearch}
            />
            {pickerSearch ? (
              <TouchableOpacity onPress={() => setPickerSearch('')}>
                <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <FlatList
            data={pickerSearchResults ?? pickerNodes}
            keyExtractor={n => n.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const kids = hasChildren(item.id);
              return (
                <View style={styles.nodePickerRow}>
                  <TouchableOpacity style={styles.nodePickerSelect} onPress={() => pickerSelectNode(item)}>
                    <Text style={styles.pickerCode}>{item.code}</Text>
                    <Text style={styles.pickerName} numberOfLines={2}>{item.label}</Text>
                  </TouchableOpacity>
                  {kids && !pickerSearchResults && (
                    <TouchableOpacity onPress={() => pickerDrillInto(item)} style={styles.nodePickerDrill}>
                      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <Text style={{ color: colors.textSecondary }}>No entries found.</Text>
              </View>
            }
          />
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
  classSystem: { fontSize: 11, fontWeight: '600', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  classPickerText: { flex: 1, fontSize: 14, color: colors.text },
  noSystemsHint: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, paddingVertical: spacing.sm },
  noSystemsText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
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
  searchResultYear: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  scanOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: 'rgba(0,0,0,0.5)' },
  scanFrame: { position: 'absolute', top: '30%', alignSelf: 'center', width: 260, height: 120, borderWidth: 2, borderColor: '#fff', borderRadius: radius.md },
  scanHint: { color: '#fff', fontSize: 14, textAlign: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  modalTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center', marginHorizontal: spacing.sm },
  pickerRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  pickerCode: { width: 56, fontSize: 13, fontWeight: '700', color: colors.primary, flexShrink: 0 },
  pickerName: { flex: 1, fontSize: 15, color: colors.text },
  pickerDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  pickerSearchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, margin: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  pickerSearchInput: { flex: 1, fontSize: 15, color: colors.text },
  nodePickerRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.border },
  nodePickerSelect: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  nodePickerDrill: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
});
