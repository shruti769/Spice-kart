import { View } from 'react-native';

import { DialogButtons } from '@/components/account-forms/parts';
import { CenterDialog } from '@/components/overlays';
import { Tap, Txt } from '@/components/ui/primitives';
import { f } from '@/constants/theme';
import { dismissPopup, useAnnouncements, type Announcement } from '@/lib/remote-home-content';
import { openLink } from '@/lib/remote-privacy';

/** [text, background] per type, matching the admin's preview. */
const COLORS: Record<Announcement['type'], [string, string]> = {
  info: ['#2F4F9E', '#EEF2FB'],
  promo: ['#2E7D32', '#EEF7EA'],
  alert: ['#B26A00', '#FDF3E3'],
};

/** Admin → Content announcements: top bars, and at most one popup at a time. */
export function Announcements() {
  const { bars, popup } = useAnnouncements();
  if (!bars.length && !popup) return null;

  const closePopup = () => {
    if (popup) dismissPopup(popup.id);
  };
  const openPopup = () => {
    closePopup();
    openLink(popup?.link);
  };

  return (
    <>
      {bars.map((a) => (
        <Tap
          key={a.id}
          accessibilityRole={a.link ? 'link' : undefined}
          disabled={!a.link}
          onPress={() => openLink(a.link)}
          style={{ paddingVertical: 10, paddingHorizontal: 16, gap: 2, backgroundColor: COLORS[a.type][1] }}>
          <Txt style={[f(700, 13, 1.3), { color: COLORS[a.type][0] }]}>{a.title}</Txt>
          {!!a.message && <Txt style={[f(400, 12, 1.35), { color: COLORS[a.type][0] }]}>{a.message}</Txt>}
        </Tap>
      ))}
      <CenterDialog
        plain
        visible={!!popup}
        onClose={closePopup}
        style={{ width: '100%', maxWidth: 300, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 8 }}>
        <View style={{ gap: 6 }}>
          <Txt style={[f(700, 15, 1.3), { color: popup ? COLORS[popup.type][0] : undefined }]}>{popup?.title}</Txt>
          {!!popup?.message && <Txt style={f(400, 12.5, 1.4)}>{popup.message}</Txt>}
        </View>
        <DialogButtons cancel="Close" confirm={popup?.link ? 'View' : 'OK'} onCancel={closePopup} onConfirm={popup?.link ? openPopup : closePopup} height={40} size={12.5} />
      </CenterDialog>
    </>
  );
}
