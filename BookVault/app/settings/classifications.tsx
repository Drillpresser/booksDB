import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, TextInput, Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../src/theme';
import {
  getAllMainClasses, getSectionsByMainClass, getDivisionsBySection,
  createMainClass, createSection, createDivision,
  updateMainClass, updateSection, updateDivision,
  deleteMainClass, deleteSection, deleteDivision,
  getBookCountForMainClass, getBookCountForSection, getBookCountForDivision,
} from '../../src/database/queries/classifications';
import type { MainClass, Section, Division } from '../../src/types';

type Level = 'main' | 'section' | 'division';

interface AddModalState {
  visible: boolean;
  level: Level;
  parentId?: string;
  editId?: string;
  initialCode?: string;
  initialName?: string;
}

export default function ClassificationsScreen() {
  const [mainClasses, setMainClasses] = useState<MainClass[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sectionsMap, setSectionsMap] = useState<Record<string, Section[]>>({});
  const [divisionsMap, setDivisionsMap] = useState<Record<string, Division[]>>({});
  const [modal, setModal] = useState<AddModalState>({ visible: false, level: 'main' });
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  useFocusEffect(
    useCallback(() => {
      setMainClasses(getAllMainClasses());
    }, [])
  );

  function toggleMain(mcId: string) {
    if (!expanded[mcId]) {
      setSectionsMap((prev) => ({ ...prev, [mcId]: getSectionsByMainClass(mcId) }));
    }
    setExpanded((prev) => ({ ...prev, [mcId]: !prev[mcId] }));
  }

  function toggleSection(secId: string) {
    if (!divisionsMap[secId]) {
      setDivisionsMap((prev) => ({ ...prev, [secId]: getDivisionsBySection(secId) }));
    }
    setExpanded((prev) => ({ ...prev, [secId]: !prev[secId] }));
  }

  function openAdd(level: Level, parentId?: string) {
    setCode('');
    setName('');
    setModal({ visible: true, level, parentId });
  }

  function openEdit(level: Level, id: string, currentCode: string, currentName: string) {
    setCode(currentCode);
    setName(currentName);
    setModal({ visible: true, level, editId: id, initialCode: currentCode, initialName: currentName });
  }

  function handleSave() {
    if (!code.trim() || !name.trim()) {
      Alert.alert('Required', 'Both code and name are required.');
      return;
    }
    const { level, parentId, editId } = modal;

    if (editId) {
      if (level === 'main') updateMainClass(editId, code.trim(), name.trim());
      else if (level === 'section') updateSection(editId, code.trim(), name.trim());
      else updateDivision(editId, code.trim(), name.trim());
    } else {
      if (level === 'main') createMainClass(code.trim(), name.trim());
      else if (level === 'section' && parentId) createSection(parentId, code.trim(), name.trim());
      else if (level === 'division' && parentId) createDivision(parentId, code.trim(), name.trim());
    }

    setMainClasses(getAllMainClasses());
    if (modal.level === 'section' && modal.parentId) {
      setSectionsMap((prev) => ({ ...prev, [modal.parentId!]: getSectionsByMainClass(modal.parentId!) }));
    }
    if (modal.level === 'division' && modal.parentId) {
      setDivisionsMap((prev) => ({ ...prev, [modal.parentId!]: getDivisionsBySection(modal.parentId!) }));
    }
    setModal({ visible: false, level: 'main' });
  }

  function handleDelete(level: Level, id: string, itemName: string) {
    const count =
      level === 'main' ? getBookCountForMainClass(id) :
      level === 'section' ? getBookCountForSection(id) :
      getBookCountForDivision(id);

    const warning = count > 0
      ? ` This will unclassify ${count} book${count > 1 ? 's' : ''}.`
      : '';

    Alert.alert(`Delete "${itemName}"?`, `This will also delete all child items.${warning}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (level === 'main') deleteMainClass(id);
          else if (level === 'section') deleteSection(id);
          else deleteDivision(id);
          setMainClasses(getAllMainClasses());
          setSectionsMap({});
          setDivisionsMap({});
          setExpanded({});
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={mainClasses}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item: mc }) => (
          <View style={styles.mainCard}>
            <View style={styles.rowHeader}>
              <TouchableOpacity style={styles.expandBtn} onPress={() => toggleMain(mc.id)}>
                <Ionicons name={expanded[mc.id] ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={styles.codeTag}><Text style={styles.codeTagText}>{mc.code}</Text></View>
              <Text style={styles.itemName}>{mc.name}</Text>
              <TouchableOpacity onPress={() => openEdit('main', mc.id, mc.code, mc.name)} style={styles.iconBtn}>
                <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete('main', mc.id, mc.name)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>

            {expanded[mc.id] && (
              <View style={styles.children}>
                {(sectionsMap[mc.id] ?? []).map((sec) => (
                  <View key={sec.id} style={styles.secCard}>
                    <View style={styles.rowHeader}>
                      <TouchableOpacity style={styles.expandBtn} onPress={() => toggleSection(sec.id)}>
                        <Ionicons name={expanded[sec.id] ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <View style={[styles.codeTag, { backgroundColor: '#E3F2FD' }]}><Text style={[styles.codeTagText, { color: '#1565C0' }]}>{sec.code}</Text></View>
                      <Text style={styles.itemName}>{sec.name}</Text>
                      <TouchableOpacity onPress={() => openEdit('section', sec.id, sec.code, sec.name)} style={styles.iconBtn}>
                        <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete('section', sec.id, sec.name)} style={styles.iconBtn}>
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>

                    {expanded[sec.id] && (
                      <View style={styles.children}>
                        {(divisionsMap[sec.id] ?? []).map((div) => (
                          <View key={div.id} style={styles.divRow}>
                            <View style={[styles.codeTag, { backgroundColor: '#F3E5F5' }]}><Text style={[styles.codeTagText, { color: '#6A1B9A' }]}>{div.code}</Text></View>
                            <Text style={[styles.itemName, { flex: 1 }]} numberOfLines={1}>{div.name}</Text>
                            <TouchableOpacity onPress={() => openEdit('division', div.id, div.code, div.name)} style={styles.iconBtn}>
                              <Ionicons name="pencil-outline" size={15} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete('division', div.id, div.name)} style={styles.iconBtn}>
                              <Ionicons name="trash-outline" size={15} color={colors.danger} />
                            </TouchableOpacity>
                          </View>
                        ))}
                        <TouchableOpacity style={styles.addChild} onPress={() => openAdd('division', sec.id)}>
                          <Ionicons name="add" size={16} color={colors.primary} />
                          <Text style={styles.addChildText}>Add Division</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
                <TouchableOpacity style={styles.addChild} onPress={() => openAdd('section', mc.id)}>
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={styles.addChildText}>Add Section</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListFooterComponent={
          <TouchableOpacity style={styles.addMainBtn} onPress={() => openAdd('main')}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addMainBtnText}>Add Main Class</Text>
          </TouchableOpacity>
        }
      />

      <Modal visible={modal.visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {modal.editId ? 'Edit' : 'Add'} {modal.level === 'main' ? 'Main Class' : modal.level === 'section' ? 'Section' : 'Division'}
            </Text>
            <TouchableOpacity onPress={() => setModal({ visible: false, level: 'main' })}>
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalForm}>
            <TextInput style={styles.input} placeholder="Code (e.g. 100)" value={code} onChangeText={setCode} placeholderTextColor={colors.textSecondary} autoFocus />
            <TextInput style={styles.input} placeholder="Name (e.g. Philosophy)" value={name} onChangeText={setName} placeholderTextColor={colors.textSecondary} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{modal.editId ? 'Save Changes' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.sm },
  mainCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  secCard: { backgroundColor: '#F8F9FA', borderRadius: radius.sm, borderWidth: 1, borderColor: '#DEE2E6', overflow: 'hidden', marginBottom: spacing.xs },
  rowHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, gap: spacing.xs },
  divRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, gap: spacing.xs },
  expandBtn: { width: 28, alignItems: 'center' },
  codeTag: { backgroundColor: colors.primaryLight, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2, minWidth: 44, alignItems: 'center' },
  codeTagText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  itemName: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },
  iconBtn: { padding: spacing.xs },
  children: { paddingLeft: spacing.lg, paddingBottom: spacing.sm, paddingRight: spacing.sm, gap: spacing.xs },
  addChild: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.xs },
  addChildText: { color: colors.primary, fontSize: 13, fontWeight: '500' },
  addMainBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  addMainBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalForm: { padding: spacing.md, gap: spacing.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 16, color: colors.text },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
