import { supabase } from '../lib/supabase';

// What can be reported. Matches content_reports.content_type in the
// 20261007000000_report_and_block migration.
export type ReportContentType = 'review' | 'shelf' | 'card' | 'request' | 'catalog_edit' | 'profile';

export type ReportReason = 'spam' | 'harassment' | 'sexual' | 'violence' | 'other';

export const REPORT_REASONS: { reason: ReportReason; label: string }[] = [
  { reason: 'spam', label: 'Spam or misleading' },
  { reason: 'harassment', label: 'Harassment or hate' },
  { reason: 'sexual', label: 'Sexual content' },
  { reason: 'violence', label: 'Violence or threats' },
  { reason: 'other', label: 'Something else' },
];

export type BlockedUser = { userId: string; displayName: string; blockedAt: string };

// The server snapshots the content, so moderation keeps the evidence even if
// it's edited or deleted afterwards. Resolves false if already reported.
export async function reportContent(
  type: ReportContentType, contentId: string, reason: ReportReason, details?: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('report_content', {
    p_type: type, p_id: contentId, p_reason: reason, p_details: details ?? null,
  });
  if (error) throw error;
  return data === 'reported';
}

// Blocking hides the user's content from you (enforced by RLS), stops them
// applying to or requesting from your shelves, and removes their existing
// cards and requests on your shelves.
export async function blockUser(userId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('user_blocks')
    .upsert({ blocker_id: user.id, blocked_id: userId }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function unblockUser(userId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('user_blocks')
    .delete().eq('blocker_id', user.id).eq('blocked_id', userId);
  if (error) throw error;
}

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('user_blocks')
    .select('blocked_id, created_at').eq('blocker_id', user.id).order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data as any[]) ?? [];
  if (!rows.length) return [];

  const { data: profiles } = await supabase.from('profiles')
    .select('id, display_name').in('id', rows.map((r) => r.blocked_id));
  const names: Record<string, string> = {};
  ((profiles as any[]) ?? []).forEach((p) => { names[p.id] = p.display_name ?? 'Reader'; });

  return rows.map((r) => ({ userId: r.blocked_id, displayName: names[r.blocked_id] ?? 'Reader', blockedAt: r.created_at }));
}
