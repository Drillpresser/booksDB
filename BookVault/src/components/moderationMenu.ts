import { ActionSheetIOS, Alert, Linking, Platform } from 'react-native';
import {
  REPORT_REASONS, blockUser, reportContent,
} from '../services/moderation';
import type { ReportContentType, ReportReason } from '../services/moderation';
import { SUPPORT_EMAIL } from '../lib/links';

type ModerationTarget = {
  contentType: ReportContentType;
  contentId: string;
  // Noun for the menu, e.g. "review" → "Report Review"
  contentLabel: string;
  // The content's author; omit to offer reporting only
  userId?: string | null;
  userName?: string | null;
  signedIn: boolean;
  onBlocked?: () => void;
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Resolves to the chosen option's index, or null when cancelled
function choose(title: string, options: string[], destructiveIndex?: number): Promise<number | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: title || undefined, options: [...options, 'Cancel'], cancelButtonIndex: options.length, destructiveButtonIndex: destructiveIndex },
        (i) => resolve(i === options.length ? null : i),
      );
      return;
    }
    // Android alerts show at most three buttons
    const shown = options.slice(0, 2);
    Alert.alert(title, undefined, [
      ...shown.map((text, i) => ({ text, onPress: () => resolve(i), style: (i === destructiveIndex ? 'destructive' : 'default') as 'destructive' | 'default' })),
      { text: 'Cancel', style: 'cancel' as const, onPress: () => resolve(null) },
    ], { cancelable: true, onDismiss: () => resolve(null) });
  });
}

function emailReport(target: ModerationTarget) {
  const subject = encodeURIComponent(`Report: ${target.contentLabel}`);
  const body = encodeURIComponent(
    `I'd like to report this ${target.contentLabel}` +
    (target.userName ? ` by ${target.userName}` : '') +
    `.\n\nReference: ${target.contentType}/${target.contentId}\n\nWhat's wrong with it:\n`,
  );
  Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`).catch(() => {
    Alert.alert('Report by Email', `Email ${SUPPORT_EMAIL} and include this reference:\n${target.contentType}/${target.contentId}`);
  });
}

export function confirmBlock(userId: string, userName: string, onBlocked?: () => void) {
  Alert.alert(
    `Block ${userName}?`,
    "You won't see their reviews, shelves, card applications, or requests. They won't be able to apply to or request books from your shelves, and any cards they hold on your shelves will be removed.\n\nYou can unblock them in Settings, but removed cards aren't restored.",
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await blockUser(userId);
            onBlocked?.();
          } catch {
            Alert.alert('Block Failed', 'Could not block this user. Please try again.');
          }
        },
      },
    ],
  );
}

async function report(target: ModerationTarget) {
  const reasons = Platform.OS === 'ios'
    ? REPORT_REASONS
    : REPORT_REASONS.filter((r) => r.reason === 'harassment' || r.reason === 'other');
  const i = await choose(`Why are you reporting this ${target.contentLabel}?`, reasons.map((r) => r.label));
  if (i === null) return;
  const reason: ReportReason = reasons[i].reason;

  try {
    await reportContent(target.contentType, target.contentId, reason);
  } catch {
    Alert.alert('Report Failed', 'Could not send your report. You can also email us instead.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Email', onPress: () => emailReport(target) },
    ]);
    return;
  }

  const canBlock = !!target.userId;
  Alert.alert(
    'Thanks for Reporting',
    'We review every report within 24 hours and remove content that breaks the rules.' +
      (canBlock ? `\n\nYou can also block ${target.userName ?? 'this user'} so you don't see their content.` : ''),
    canBlock
      ? [
          { text: 'Done', style: 'cancel' },
          { text: 'Block', style: 'destructive', onPress: () => confirmBlock(target.userId!, target.userName ?? 'this user', target.onBlocked) },
        ]
      : [{ text: 'Done' }],
  );
}

// Report / Block menu for another user's content. Signed-out viewers can
// report by email; reporting in-app and blocking need an account.
export async function openModerationMenu(target: ModerationTarget) {
  if (!target.signedIn) {
    const i = await choose(`Report this ${target.contentLabel}`, ['Report by Email']);
    if (i === 0) emailReport(target);
    return;
  }

  const options = [`Report ${capitalize(target.contentLabel)}`];
  if (target.userId) options.push(`Block ${target.userName ?? 'User'}`);
  const i = await choose('', options, target.userId ? 1 : undefined);
  if (i === 0) await report(target);
  else if (i === 1 && target.userId) confirmBlock(target.userId, target.userName ?? 'this user', target.onBlocked);
}
