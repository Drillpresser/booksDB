import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';

// Invite tokens are shared credentials — use a CSPRNG, not Math.random()
function generateInviteToken(): string {
  const bytes = Crypto.getRandomBytes(32);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Types ──────────────────────────────────────────────────────────────────

export type Library = {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
};

export type LibraryWithMeta = Library & {
  ownerDisplayName: string;
  bookCount: number;
  myCardStatus: 'none' | 'pending' | 'approved' | 'denied';
};

export type LibraryBook = {
  id: string;
  libraryId: string;
  copyId: string;
  recordId: string;
  title: string;
  authors: string[];
  sortAuthor: string;
  isbn13: string | null;
  publisher: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  synopsis: string | null;
  coverImage: string | null;
  deweyDecimal: string | null;
  copyNumber: number;
  divisionCode: string | null;
  divisionName: string | null;
  sectionCode: string | null;
  sectionName: string | null;
  mainClassCode: string | null;
  mainClassName: string | null;
  isOnLoan: boolean;
};

export type LibraryBookInput = Omit<LibraryBook, 'id' | 'libraryId'>;

export type LibraryCard = {
  id: string;
  libraryId: string;
  userId: string | null;
  status: 'pending' | 'approved' | 'denied' | 'invite';
  inviteToken: string | null;
  message: string | null;
  requesterDisplayName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BookRequest = {
  id: string;
  libraryId: string;
  copyId: string;
  bookTitle: string;
  requesterId: string;
  requesterDisplayName: string | null;
  type: 'checkout' | 'hold';
  status: 'pending' | 'approved' | 'denied' | 'fulfilled';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

// ── Row mappers ────────────────────────────────────────────────────────────

function toLibrary(r: any): Library {
  return { id: r.id, ownerId: r.owner_id, name: r.name, description: r.description, isPublic: r.is_public, createdAt: r.created_at };
}

function toBook(r: any): LibraryBook {
  return {
    id: r.id, libraryId: r.library_id, copyId: r.copy_id, recordId: r.record_id,
    title: r.title, authors: Array.isArray(r.authors) ? r.authors : (JSON.parse(r.authors ?? '[]')),
    sortAuthor: r.sort_author ?? '', isbn13: r.isbn13, publisher: r.publisher,
    publishedYear: r.published_year, pageCount: r.page_count, synopsis: r.synopsis,
    coverImage: r.cover_image, deweyDecimal: r.dewey_decimal, copyNumber: r.copy_number ?? 1,
    divisionCode: r.division_code, divisionName: r.division_name,
    sectionCode: r.section_code, sectionName: r.section_name,
    mainClassCode: r.main_class_code, mainClassName: r.main_class_name, isOnLoan: r.is_on_loan ?? false,
  };
}

function toCard(r: any): LibraryCard {
  return { id: r.id, libraryId: r.library_id, userId: r.user_id, status: r.status,
    inviteToken: r.invite_token, message: r.message, requesterDisplayName: r.requester_display_name,
    createdAt: r.created_at, updatedAt: r.updated_at };
}

function toRequest(r: any): BookRequest {
  return { id: r.id, libraryId: r.library_id, copyId: r.copy_id, bookTitle: r.book_title,
    requesterId: r.requester_id, requesterDisplayName: r.requester_display_name,
    type: r.type, status: r.status, notes: r.notes, createdAt: r.created_at, updatedAt: r.updated_at };
}

// ── Helpers ────────────────────────────────────────────────────────────────

export async function getMyDisplayName(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'Reader';
  const { data } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
  return (data as any)?.display_name ?? user.email?.split('@')[0] ?? 'Reader';
}

export async function setMyDisplayName(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Display name cannot be empty');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('profiles').update({ display_name: trimmed }).eq('id', user.id);
  if (error) throw error;
  // Keep auth metadata in sync so the Settings header and future derivations agree
  await supabase.auth.updateUser({ data: { full_name: trimmed } });
}

// ── My Libraries ───────────────────────────────────────────────────────────

export async function getMyLibraries(): Promise<Library[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from('libraries').select('*').eq('owner_id', user.id).order('created_at', { ascending: true });
  return (data ?? []).map(toLibrary);
}

export async function createLibrary(name: string, description: string | null, isPublic: boolean): Promise<Library | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('libraries')
    .insert({ owner_id: user.id, name, description, is_public: isPublic })
    .select().single();
  if (error || !data) return null;
  return toLibrary(data);
}

export async function updateLibrary(id: string, updates: { name?: string; description?: string | null; isPublic?: boolean }): Promise<void> {
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.isPublic !== undefined) payload.is_public = updates.isPublic;
  await supabase.from('libraries').update(payload).eq('id', id);
}

export async function deleteLibrary(id: string): Promise<void> {
  await supabase.from('libraries').delete().eq('id', id);
}

export async function getLibraryById(id: string): Promise<Library | null> {
  const { data } = await supabase.from('libraries').select('*').eq('id', id).maybeSingle();
  return data ? toLibrary(data) : null;
}

export async function getFollowedLibraries(): Promise<LibraryWithMeta[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: cards } = await supabase
    .from('library_cards')
    .select('library_id')
    .eq('user_id', user.id)
    .eq('status', 'approved');

  if (!cards?.length) return [];

  const libIds = (cards as any[]).map((c) => c.library_id);

  const { data: libs } = await supabase
    .from('libraries')
    .select('*')
    .in('id', libIds)
    .neq('owner_id', user.id);

  if (!libs?.length) return [];

  const ownerIds = [...new Set((libs as any[]).map((l) => l.owner_id))];

  const [profileRes, bookRes] = await Promise.all([
    supabase.from('profiles').select('id, display_name').in('id', ownerIds),
    supabase.from('library_books').select('library_id').in('library_id', libIds),
  ]);

  const profileMap: Record<string, string> = {};
  ((profileRes.data as any[]) ?? []).forEach((p: any) => { profileMap[p.id] = p.display_name ?? 'Reader'; });

  const countMap: Record<string, number> = {};
  ((bookRes.data as any[]) ?? []).forEach((r: any) => { countMap[r.library_id] = (countMap[r.library_id] ?? 0) + 1; });

  return (libs as any[]).map((l): LibraryWithMeta => ({
    ...toLibrary(l),
    ownerDisplayName: profileMap[l.owner_id] ?? 'Reader',
    bookCount: countMap[l.id] ?? 0,
    myCardStatus: 'approved',
  }));
}

// ── Browse ─────────────────────────────────────────────────────────────────

export async function getPublicLibraries(search?: string): Promise<LibraryWithMeta[]> {
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase.from('libraries').select('*').eq('is_public', true);
  if (search?.trim()) query = query.ilike('name', `%${search.trim()}%`);
  const { data: libs } = await query.order('created_at', { ascending: false }).limit(50);
  if (!libs?.length) return [];

  const ownerIds = [...new Set(libs.map((l: any) => l.owner_id))];
  const libIds = libs.map((l: any) => l.id);

  const [profileRes, countRes, cardRes] = await Promise.all([
    supabase.from('profiles').select('id, display_name').in('id', ownerIds),
    supabase.from('library_books').select('library_id').in('library_id', libIds),
    user ? supabase.from('library_cards').select('library_id, status').eq('user_id', user.id).in('library_id', libIds) : Promise.resolve({ data: [] }),
  ]);

  const profileMap: Record<string, string> = {};
  ((profileRes.data as any[]) ?? []).forEach((p: any) => { profileMap[p.id] = p.display_name ?? 'Reader'; });

  const countMap: Record<string, number> = {};
  ((countRes.data as any[]) ?? []).forEach((r: any) => { countMap[r.library_id] = (countMap[r.library_id] ?? 0) + 1; });

  const cardMap: Record<string, string> = {};
  ((cardRes.data as any[]) ?? []).forEach((c: any) => { cardMap[c.library_id] = c.status; });

  return libs.map((l: any): LibraryWithMeta => ({
    ...toLibrary(l),
    ownerDisplayName: profileMap[l.owner_id] ?? 'Reader',
    bookCount: countMap[l.id] ?? 0,
    myCardStatus: (cardMap[l.id] as any) ?? 'none',
  }));
}

// ── Library Books ──────────────────────────────────────────────────────────

export async function getBooksInLibrary(libraryId: string): Promise<LibraryBook[]> {
  const { data } = await supabase.from('library_books').select('*')
    .eq('library_id', libraryId).order('sort_author', { ascending: true });
  return (data ?? []).map(toBook);
}

export async function upsertBookInLibrary(libraryId: string, book: LibraryBookInput): Promise<void> {
  await supabase.from('library_books').upsert({
    library_id: libraryId, copy_id: book.copyId, record_id: book.recordId,
    title: book.title, authors: book.authors, sort_author: book.sortAuthor,
    isbn13: book.isbn13, publisher: book.publisher, published_year: book.publishedYear,
    page_count: book.pageCount, synopsis: book.synopsis, cover_image: book.coverImage,
    dewey_decimal: book.deweyDecimal, copy_number: book.copyNumber,
    division_code: book.divisionCode, division_name: book.divisionName,
    section_code: book.sectionCode, section_name: book.sectionName,
    main_class_code: book.mainClassCode, main_class_name: book.mainClassName,
    is_on_loan: book.isOnLoan, synced_at: new Date().toISOString(),
  }, { onConflict: 'library_id,copy_id' });
}

export async function syncBookToLibraries(libraryIds: string[], book: LibraryBookInput): Promise<void> {
  await Promise.all(libraryIds.map((id) => upsertBookInLibrary(id, book)));
}

export async function removeBookFromAllLibraries(copyId: string): Promise<void> {
  await supabase.from('library_books').delete().eq('copy_id', copyId);
}

export async function removeBookFromLibrary(libraryId: string, copyId: string): Promise<void> {
  await supabase.from('library_books').delete().eq('library_id', libraryId).eq('copy_id', copyId);
}

export async function getLibraryIdsForCopy(copyId: string): Promise<string[]> {
  const { data } = await supabase.from('library_books').select('library_id').eq('copy_id', copyId);
  return (data ?? []).map((r: any) => r.library_id);
}

export async function updateBookLoanStatus(copyId: string, isOnLoan: boolean): Promise<void> {
  await supabase.from('library_books').update({ is_on_loan: isOnLoan, synced_at: new Date().toISOString() }).eq('copy_id', copyId);
}

// ── Library Cards ──────────────────────────────────────────────────────────

export async function getCardsForLibrary(libraryId: string): Promise<LibraryCard[]> {
  const { data } = await supabase.from('library_cards').select('*')
    .eq('library_id', libraryId).order('created_at', { ascending: false });
  return (data ?? []).map(toCard);
}

export async function getMyCardForLibrary(libraryId: string): Promise<LibraryCard | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('library_cards').select('*')
    .eq('library_id', libraryId).eq('user_id', user.id).maybeSingle();
  return data ? toCard(data) : null;
}

export async function applyForCard(libraryId: string, message: string | null): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const displayName = await getMyDisplayName();
  const { error } = await supabase.from('library_cards').insert({
    library_id: libraryId, user_id: user.id, status: 'pending', message, requester_display_name: displayName,
  });
  if (error) throw error;
}

export async function updateCardStatus(cardId: string, status: 'approved' | 'denied'): Promise<void> {
  const { error } = await supabase.from('library_cards')
    .update({ status, updated_at: new Date().toISOString() }).eq('id', cardId);
  if (error) throw error;
}

export async function deleteCard(cardId: string): Promise<void> {
  await supabase.from('library_cards').delete().eq('id', cardId);
}

export async function createInvite(libraryId: string): Promise<LibraryCard | null> {
  const token = generateInviteToken();
  const { data, error } = await supabase.from('library_cards')
    .insert({ library_id: libraryId, user_id: null, status: 'invite', invite_token: token })
    .select().single();
  if (error || !data) return null;
  return toCard(data);
}

export async function getInviteByToken(token: string): Promise<{ library: Library } | null> {
  // Invite rows aren't directly selectable; a SECURITY DEFINER RPC validates the token
  const { data, error } = await supabase.rpc('get_invite', { p_token: token });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return null;
  return {
    library: {
      id: row.library_id,
      ownerId: '',
      name: row.library_name,
      description: row.library_description,
      isPublic: false,
      createdAt: '',
    },
  };
}

export async function claimInvite(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const displayName = await getMyDisplayName();
  const { error } = await supabase.rpc('claim_invite', { p_token: token, p_display_name: displayName });
  if (error) throw error;
}

// ── Book Requests ──────────────────────────────────────────────────────────

export async function getRequestsForLibrary(libraryId: string): Promise<BookRequest[]> {
  const { data } = await supabase.from('book_requests').select('*')
    .eq('library_id', libraryId).order('created_at', { ascending: false });
  return (data ?? []).map(toRequest);
}

export async function getMyRequests(): Promise<BookRequest[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from('book_requests').select('*')
    .eq('requester_id', user.id).order('created_at', { ascending: false });
  return (data ?? []).map(toRequest);
}

export async function createBookRequest(
  libraryId: string, copyId: string, bookTitle: string,
  type: 'checkout' | 'hold', notes: string | null,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const displayName = await getMyDisplayName();
  const { error } = await supabase.from('book_requests').insert({
    library_id: libraryId, copy_id: copyId, book_title: bookTitle,
    requester_id: user.id, requester_display_name: displayName,
    type, status: 'pending', notes,
  });
  if (error) throw error;
}

export async function updateRequestStatus(requestId: string, status: 'approved' | 'denied' | 'fulfilled'): Promise<void> {
  const { error } = await supabase.from('book_requests')
    .update({ status, updated_at: new Date().toISOString() }).eq('id', requestId);
  if (error) throw error;
}
