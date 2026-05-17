import { supabase } from '../lib/supabase';

export type BookRating = {
  id: string;
  userId: string;
  isbn: string;
  stars: number;
  review: string | null;
  createdAt: string;
  displayName: string;
  avatarUrl: string | null;
};

export type RatingSummary = {
  average: number;
  count: number;
  ratings: BookRating[];
  myRating: BookRating | null;
};

export async function getRatingsForIsbn(isbn: string, myUserId?: string): Promise<RatingSummary> {
  const { data, error } = await supabase
    .from('book_ratings')
    .select('id, user_id, isbn, stars, review, created_at, profiles(display_name, avatar_url)')
    .eq('isbn', isbn)
    .order('created_at', { ascending: false });

  if (error || !data) return { average: 0, count: 0, ratings: [], myRating: null };

  const ratings: BookRating[] = (data as any[]).map((r) => ({
    id: r.id,
    userId: r.user_id,
    isbn: r.isbn,
    stars: r.stars,
    review: r.review,
    createdAt: r.created_at,
    displayName: r.profiles?.display_name ?? 'Reader',
    avatarUrl: r.profiles?.avatar_url ?? null,
  }));

  const average = ratings.length
    ? Math.round((ratings.reduce((s, r) => s + r.stars, 0) / ratings.length) * 10) / 10
    : 0;

  const myRating = myUserId ? (ratings.find((r) => r.userId === myUserId) ?? null) : null;

  return { average, count: ratings.length, ratings, myRating };
}

export async function upsertRating(isbn: string, stars: number, review: string | null, userId: string): Promise<void> {
  const { error } = await supabase.from('book_ratings').upsert(
    { user_id: userId, isbn, stars, review, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,isbn' }
  );
  if (error) throw error;
}

export async function deleteRating(isbn: string, userId: string): Promise<void> {
  const { error } = await supabase.from('book_ratings').delete().match({ user_id: userId, isbn });
  if (error) throw error;
}
