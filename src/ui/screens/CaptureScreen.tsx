/*
 * File: CaptureScreen.tsx
 *
 * Purpose:
 *     Fast local capture: text, optional photos, optional location, immediate save.
 *
 * Author:
 *     Michael Garcia
 *
 * Contact:
 *     michael@mandedesign.studio
 *
 * License:
 *     SPDX-License-Identifier: MPL-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import type { CapturedImage, GeoLocation } from '@/models/types';
import { useRequiredAppServices } from '@/services/AppServicesProvider';
import { colors, fonts } from '@/theme/tokens';
import { CommandButton, TelemetryLabel } from '@/ui/components/primitives';
import { useChrome } from '@/ui/state/ChromeContext';
import { useHudRegistration, usePendingAttachment, type AttachmentAction } from '@/ui/state/HudCommands';
import { typeStyle } from '@/ui/layout/HudArtwork';

/*
 * Purpose: Fast local capture of text, optional photos, and optional location.
 * Design: No required metadata; autofocus only on compact; handedness flips control clustering.
 * Workflow: /capture route; commit calls EntryService.createEntry then dismisses on phone.
 * Data Handoff: Sends CreateEntryInput to the service layer and navigates to the log.
 */
export function CaptureScreen() {
  const services = useRequiredAppServices();
  const router = useRouter();
  const { mode } = useBreakpoint();
  const { handedness } = useChrome();
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('READY');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const operation = useRef(false);

  useEffect(() => {
    if (mode === 'compact') {
      const timer = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  /*
   * Purpose: Save the draft immediately to the local archive.
   * Design: Reject empty drafts; never wait on backup or extraction (those run inside the service).
   * Workflow: Fired by Commit Log; expects text and/or images/location from this screen's state.
   * Data Handoff: Calls createEntry then clears draft and, on compact, replaces the route with /.
   */
  async function commit() {
    if (operation.current) {
      return;
    }
    if (!text.trim() && images.length === 0 && !location) {
      setStatus('EMPTY');
      return;
    }
    operation.current = true;
    setBusy(true);
    try {
      await services.entries.createEntry({
        sourceText: text.trim(),
        images,
        location,
        source: 'capture',
      });
      setText('');
      setImages([]);
      setLocation(null);
      setStatus('COMMITTED');
      if (mode === 'compact') {
        router.replace('/');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'SAVE FAILED');
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }

  /* Purpose: Attach media/location without racing a commit or another picker.
   * Design: Synchronous operation lock; denied/cancelled requests retain the draft.
   * Workflow: Dock or Add/Gallery menu. Data Handoff: Existing platform services. */
  async function attach(action: AttachmentAction) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    try {
      if (action === 'location') {
        const next = await services.location.requestCurrentLocation();
        if (next) setLocation(next);
        setStatus(next ? 'LOCATION ATTACHED' : 'LOCATION UNAVAILABLE');
      } else {
        const image = await (action === 'camera' ? services.attachments.captureFromCamera() : services.attachments.pickFromGallery());
        if (image) setImages(current => [...current, image]);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'ATTACHMENT UNAVAILABLE');
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  /* Purpose: Exit an unsaved draft only after an explicit discard choice.
   * Design: Empty drafts exit immediately; busy operations cannot be cancelled.
   * Workflow: Contextual Cancel button. Data Handoff: Local state clear and home route. */
  function discard() {
    if (operation.current) return;
    setText(''); setImages([]); setLocation(null); setConfirmCancel(false);
    router.replace('/');
  }
  function cancel() {
    if (operation.current) return;
    if (text.trim() || images.length || location) setConfirmCancel(true);
    else discard();
  }
  useHudRegistration('capture', { commit, cancel, camera: () => attach('camera'), gallery: () => attach('gallery'), location: () => attach('location') }, busy);
  usePendingAttachment(attach);

  const controls = (
    <View style={[styles.controls, handedness === 'left' && styles.controlsLeft]}>
      <CommandButton
        label="Camera"
        onPress={async () => {
          const image = await services.attachments.captureFromCamera();
          if (image) {
            setImages((current) => [...current, image]);
          }
        }}
      />
      <CommandButton
        label="Gallery"
        onPress={async () => {
          const image = await services.attachments.pickFromGallery();
          if (image) {
            setImages((current) => [...current, image]);
          }
        }}
      />
      <CommandButton
        label={location ? 'Located' : 'Location'}
        onPress={async () => {
          const next = await services.location.requestCurrentLocation();
          setLocation(next);
          setStatus(next ? 'LOCATION ATTACHED' : 'LOCATION UNAVAILABLE');
        }}
      />
      <CommandButton label="Commit Log" dominant onPress={() => void commit()} disabled={busy} />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.screen, mode === 'compact' && { padding: 0 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {mode !== 'compact' || status !== 'READY' ? <TelemetryLabel k="CAPTURE" v={status} accent="orange" /> : null}
      {mode !== 'compact' && <Text style={styles.hint}>
        No title, tags, or project required. Use [[Entity]], @Person, or #Project if you want
        links.
      </Text>}
      <TextInput
        ref={inputRef}
        value={text}
        onChangeText={setText}
        placeholder={mode === 'compact' ? 'Enter log entry…' : 'Record observation…'}
        accessibilityLabel="Log entry"
        editable={!busy}
        placeholderTextColor={colors.textDim}
        multiline
        textAlignVertical="top"
        style={[styles.input, mode === 'compact' && { ...typeStyle('entry'), padding: 0, borderWidth: 0, backgroundColor: 'transparent', minHeight: 80 }]}
      />
      {images.length > 0 ? (
        <View style={styles.photos}>
          {images.map((image) => (
            <Image key={image.uri} source={{ uri: image.uri }} style={styles.photo} contentFit="cover" />
          ))}
        </View>
      ) : null}
      {location ? (
        <Text style={styles.loc}>
          {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
        </Text>
      ) : null}
      {mode !== 'compact' && controls}
      <Modal visible={confirmCancel} transparent animationType="fade" onRequestClose={() => setConfirmCancel(false)}>
        <View style={styles.scrim}><View accessibilityViewIsModal style={styles.confirm}>
          <Text style={styles.hint}>Discard this unsaved record?</Text>
          <Pressable accessibilityRole="button" onPress={() => setConfirmCancel(false)} style={styles.choice}><Text style={styles.hint}>Keep editing</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={discard} style={styles.choice}><Text style={[styles.hint, { color: colors.orange }]}>Discard record</Text></Pressable>
        </View></View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
  confirm: { padding: 20, gap: 16, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.cyan },
  choice: { minHeight: 44, justifyContent: 'center' },
  screen: {
    flex: 1,
    padding: 12,
    gap: 10,
  },
  hint: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    flex: 1,
    minHeight: 180,
    borderWidth: 1,
    borderColor: colors.orange,
    backgroundColor: colors.panel,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 18,
    lineHeight: 26,
    padding: 12,
  },
  photos: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  photo: {
    width: 72,
    height: 72,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loc: {
    fontFamily: fonts.mono,
    color: colors.cyan,
    fontSize: 11,
  },
  controls: {
    gap: 8,
    alignItems: 'stretch',
  },
  controlsLeft: {
    alignItems: 'stretch',
  },
});
