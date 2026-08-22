/*
 * File: [id].tsx
 *
 * Purpose:
 *     Entity history route used on compact layouts.
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

import { useLocalSearchParams } from 'expo-router';

import { EntityScreen } from '@/ui/screens/EntityScreen';

/*
 * Purpose: Resolve the entity id param for the compact entity route.
 * Design: Normalize string | string[] from Expo Router before hitting EntityScreen.
 * Workflow: File-based route /entity/[id].
 * Data Handoff: Passes a single id string to EntityScreen.
 */
export default function EntityRoute() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <EntityScreen entityId={id} />;
}
