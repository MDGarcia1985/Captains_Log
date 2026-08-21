/*
 * File: SettingsScreen.tsx
 *
 * Purpose:
 *     Minimum MVP settings: handedness, backup, permissions, and account.
 *
 * Author:
 *     Captain's Log contributors
 *     Project owner name pending confirmation.
 *
 * Contact:
 *     Project owner contact information pending confirmation.
 *
 * License:
 *     All rights reserved until the project owner selects a license.
 */

import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import type { AuthAccount, BackupStatus, Handedness } from '@/models/types';
import { useRequiredAppServices } from '@/services/AppServicesProvider';
import { colors, fonts } from '@/theme/tokens';
import { formatTelemetryTime } from '@/utilities/time';
import { ClippedPanel, CommandButton, TelemetryLabel } from '@/ui/components/primitives';
import { useChrome } from '@/ui/state/ChromeContext';

/*
 * Purpose: Minimum MVP settings: handedness, backup, permissions, and account.
 * Design: No extra configuration surface; skin is displayed as STARSHIP only.
 * Workflow: /settings route; reload on focus so backup status stays current.
 * Data Handoff: Calls Settings/Auth/Backup/Location services and updates ChromeContext.
 */
export function SettingsScreen() {
  const services = useRequiredAppServices();
  const chrome = useChrome();
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [backup, setBackup] = useState<BackupStatus | null>(null);
  const [locationStatus, setLocationStatus] = useState('unknown');
  const [cameraStatus, setCameraStatus] = useState('unknown');
  const [galleryStatus, setGalleryStatus] = useState('unknown');
  const [message, setMessage] = useState('');

  /*
   * Purpose: Refresh settings telemetry from services.
   * Design: One reload path used by focus and after backup/authorize actions.
   * Workflow: Runs on screen focus; also after Drive authorize/backup.
   * Data Handoff: Sets account, backup, permission, and handedness state for the form.
   */
  const reload = useCallback(async () => {
    setAccount(await services.auth.getSession());
    setBackup(await services.backup.getStatus());
    setLocationStatus(await services.location.getPermissionStatus());
    const media = await services.attachments.getPermissionStatus();
    setCameraStatus(media.camera);
    setGalleryStatus(media.gallery);
    const settings = await services.settings.get();
    chrome.setHandedness(settings.handedness);
  }, [services, chrome]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  /*
   * Purpose: Persist handedness and reorient the shell immediately.
   * Design: Write SQLite and ChromeContext together so the rail does not wait for a remount.
   * Workflow: Fired by Left/Right command buttons.
   * Data Handoff: AppSettings via SettingsService; handedness via ChromeContext.
   */
  async function setHand(handedness: Handedness) {
    await services.settings.setHandedness(handedness);
    chrome.setHandedness(handedness);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TelemetryLabel k="SKIN" v="STARSHIP" />
      <ClippedPanel>
        <Text style={styles.section}>HANDEDNESS</Text>
        <View style={styles.row}>
          <CommandButton label="Left" onPress={() => void setHand('left')} />
          <CommandButton label="Right" onPress={() => void setHand('right')} />
        </View>
        <Text style={styles.value}>Active: {chrome.handedness}</Text>
      </ClippedPanel>

      <ClippedPanel>
        <Text style={styles.section}>ACCOUNT</Text>
        <Text style={styles.value}>{account ? `${account.method} / ${account.email}` : 'none'}</Text>
        <CommandButton
          label="Sign Out Session"
          onPress={async () => {
            await services.auth.signOut();
            chrome.lock();
          }}
        />
      </ClippedPanel>

      <ClippedPanel>
        <Text style={styles.section}>GOOGLE DRIVE BACKUP</Text>
        <TelemetryLabel k="LOCAL ARCHIVE" v="ACTIVE" />
        <TelemetryLabel k="LAST BACKUP" v={formatTelemetryTime(backup?.lastBackupAt ?? null)} />
        <TelemetryLabel k="BACKUP STATUS" v={(backup?.state ?? 'unknown').toUpperCase()} />
        <Text style={styles.detail}>{backup?.detail}</Text>
        <CommandButton
          label="Authorize Drive"
          onPress={async () => {
            try {
              await services.backup.authorize();
              setMessage('Drive authorized');
              await reload();
            } catch (error) {
              setMessage(error instanceof Error ? error.message : 'Authorization failed');
            }
          }}
        />
        <CommandButton
          label="Manual Backup"
          dominant
          onPress={async () => {
            await services.backup.backupNow();
            await reload();
          }}
        />
      </ClippedPanel>

      <ClippedPanel>
        <Text style={styles.section}>PERMISSIONS</Text>
        <TelemetryLabel k="LOCATION" v={locationStatus.toUpperCase()} />
        <TelemetryLabel k="CAMERA" v={cameraStatus.toUpperCase()} />
        <TelemetryLabel k="GALLERY" v={galleryStatus.toUpperCase()} />
      </ClippedPanel>

      <ClippedPanel>
        <Text style={styles.section}>EXPORT / BACKUP INFORMATION</Text>
        <Text style={styles.detail}>
          Canonical data is the local SQLite archive plus managed attachment files. Google Drive is
          backup only. Core use does not require a network connection.
        </Text>
      </ClippedPanel>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 12,
    gap: 12,
    paddingBottom: 32,
  },
  section: {
    color: colors.cyan,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  value: {
    color: colors.text,
    fontFamily: fonts.body,
    marginTop: 8,
  },
  detail: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    lineHeight: 20,
    marginVertical: 8,
  },
  message: {
    color: colors.orange,
    fontFamily: fonts.mono,
    fontSize: 12,
  },
});
