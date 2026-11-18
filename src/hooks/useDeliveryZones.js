import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import {
  DEFAULT_DELIVERY_ZONES,
  DEFAULT_DELIVERY_SETTINGS,
  DELIVERY_SETTINGS_COLLECTION,
  DELIVERY_SETTINGS_DOC,
  DELIVERY_ZONES_COLLECTION,
  findPickupZone,
  findZoneForPincode,
  normalizeZones,
} from '../lib/delivery';

/**
 * Loads the delivery zones the shop has configured in the admin panel.
 *
 * The zones live in Firestore (`deliveryZones`) so the owner can add areas and
 * change charges without touching code. Until the first zone is created, the
 * built-in starter zones are used — that way the checkout works from day one
 * instead of showing "delivery not configured".
 *
 * These are DISPLAY values only. The charge the customer is actually billed is
 * always recomputed on the server from the same collection
 * (see api/create-order.js) — nothing here is trusted for money.
 */
export function useDeliveryZones() {
  const [zones, setZones] = useState(DEFAULT_DELIVERY_ZONES);
  const [settings, setSettings] = useState(DEFAULT_DELIVERY_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [zonesSnap, settingsSnap] = await Promise.allSettled([
        getDocs(collection(db, DELIVERY_ZONES_COLLECTION)),
        getDoc(doc(db, DELIVERY_SETTINGS_COLLECTION, DELIVERY_SETTINGS_DOC)),
      ]);

      if (cancelled) return;

      const loadedSettings = settingsSnap.status === 'fulfilled' && settingsSnap.value.exists()
        ? { ...DEFAULT_DELIVERY_SETTINGS, ...settingsSnap.value.data() }
        : DEFAULT_DELIVERY_SETTINGS;
      setSettings(loadedSettings);

      if (zonesSnap.status === 'fulfilled') {
        const docs = zonesSnap.value.docs.map(d => ({ id: d.id, ...d.data() }));
        if (docs.length > 0) {
          setZones(normalizeZones(docs));
        } else if (loadedSettings.configured === true) {
          // The owner manages their own zones and has removed them all — that
          // is a deliberate "no delivery configured", not a reason to fall back
          // to the starter zones.
          setZones([]);
        }
      }
      // A rejected zones read (rules not published yet, offline, …) leaves the
      // starter zones in place so the checkout stays usable.

      setLoaded(true);
    };

    load().catch(err => {
      console.error('Could not load delivery configuration:', err);
      if (!cancelled) setLoaded(true);
    });

    return () => { cancelled = true; };
  }, []);

  return useMemo(() => ({
    zones,
    settings,
    loaded,
    /** True when the zones come from the admin panel rather than the starter set. */
    fromDatabase: settings.configured === true,
    /** The zone that covers a pincode, or null when it isn't serviceable. */
    zoneForPincode: (pincode) => findZoneForPincode(zones, pincode),
    /** The pickup zone, if the shop has one enabled. */
    pickupZone: findPickupZone(zones),
  }), [zones, settings, loaded]);
}
