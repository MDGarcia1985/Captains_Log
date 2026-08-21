/*
 * File: [id].tsx
 *
 * Purpose:
 *     Optional entry detail route; log still expands inline by default.
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

import { useLocalSearchParams } from 'expo-router';

import { EntryScreen } from '@/ui/screens/EntryScreen';

/*
 * Purpose: Resolve the entry id param for the optional detail route.
 * Design: Normalize string | string[] from Expo Router before hitting EntryScreen.
 * Workflow: File-based route /entry/[id].
 * Data Handoff: Passes a single id string to EntryScreen.
 */
export default function EntryRoute() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <EntryScreen entryId={id} />;
}
