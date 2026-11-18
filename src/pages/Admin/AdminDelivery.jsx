import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../../firebase';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import {
  DEFAULT_DELIVERY_SETTINGS,
  DEFAULT_DELIVERY_ZONES,
  DELIVERY_SETTINGS_COLLECTION,
  DELIVERY_SETTINGS_DOC,
  DELIVERY_ZONES_COLLECTION,
  ZONE_TYPE,
  duplicatePincodes,
  findPickupZone,
  findZoneForPincode,
  formatCharge,
  isPickupEligible,
  isValidPincode,
  normalizePincode,
  normalizeZones,
} from '../../lib/delivery';
import styles from './AdminDelivery.module.css';

const EMPTY_DELIVERY_ZONE = {
  type: ZONE_TYPE.DELIVERY,
  name: '',
  areas: '',
  charge: 45,
  pincodes: [],
  pincodePrefixes: [],
  catchAll: false,
  location: '',
  instructions: '',
  enabled: true,
  sortOrder: 10,
};

export default function AdminDelivery() {
  const { checking, authed, logout } = useAdminAuth();
  const [zones, setZones] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_DELIVERY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);   // the zone being edited
  const [draft, setDraft] = useState(null);
  const [pincodeInput, setPincodeInput] = useState('');
  const [pickupInput, setPickupInput] = useState('');
  const [prefixInput, setPrefixInput] = useState('');
  const [testPincode, setTestPincode] = useState('');

  useEffect(() => {
    if (authed) load();
  }, [authed]);

  const load = async () => {
    setLoading(true);
    try {
      const [zonesSnap, settingsSnap] = await Promise.all([
        getDocs(collection(db, DELIVERY_ZONES_COLLECTION)),
        getDoc(doc(db, DELIVERY_SETTINGS_COLLECTION, DELIVERY_SETTINGS_DOC)),
      ]);
      setZones(normalizeZones(zonesSnap.docs.map(d => ({ id: d.id, ...d.data() }))));
      if (settingsSnap.exists()) {
        setSettings(prev => ({ ...DEFAULT_DELIVERY_SETTINGS, ...settingsSnap.data() }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not load the delivery configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (next) => {
    setSaving(true);
    try {
      await setDoc(doc(db, DELIVERY_SETTINGS_COLLECTION, DELIVERY_SETTINGS_DOC), {
        ...next,
        updatedAt: new Date(),
      }, { merge: true });
      setSettings(next);
      toast.success('Delivery settings saved');
    } catch (err) {
      console.error(err);
      toast.error('Could not save the settings');
    } finally {
      setSaving(false);
    }
  };

  /** Writes the built-in starter zones into the database, so from now on the
   *  database — not the code — is the source of truth.
   *
   *  This also works as a repair button: if a PIN code is landing in the wrong
   *  zone (because the list was edited or an older list was saved), running
   *  this puts the starter zones back exactly as the shop defines them. */
  const seedStarterZones = async () => {
    const isUpdate = zones.length > 0;
    if (!window.confirm(
      isUpdate
        ? 'Reset the starter zones (Local ₹45, Outer Coimbatore ₹90, the rest of Tamil Nadu ₹150, the rest of India ₹200, Store Pickup free)?\n\nTheir PIN codes, charges and names are replaced. Any zone you added yourself is left alone.'
        : 'Create the starter delivery zones?\n\nLocal ₹45, Outer Coimbatore ₹90, the rest of Tamil Nadu ₹150, the rest of India ₹200, and a free Store Pickup. You can edit every pincode and charge afterwards.'
    )) return;
    setSaving(true);
    try {
      for (const zone of DEFAULT_DELIVERY_ZONES) {
        await setDoc(doc(db, DELIVERY_ZONES_COLLECTION, zone.id), { ...zone, updatedAt: new Date() }, { merge: true });
      }
      await setDoc(doc(db, DELIVERY_SETTINGS_COLLECTION, DELIVERY_SETTINGS_DOC), {
        ...settings,
        configured: true,
        updatedAt: new Date(),
      }, { merge: true });
      await load();
      toast.success(isUpdate
        ? 'Starter zones reset — the PIN code lists and charges are back to the defaults'
        : 'Starter zones created — edit the pincodes to match your areas');
    } catch (err) {
      console.error(err);
      toast.error('Could not create the starter zones');
    } finally {
      setSaving(false);
    }
  };

  const openEditor = (zone) => {
    setEditing(zone);
    setDraft({
      ...zone,
      pincodes: [...(zone.pincodes || [])],
      pincodePrefixes: [...(zone.pincodePrefixes || [])],
      pickupPincodes: [...(zone.pickupPincodes || [])],
    });
    setPincodeInput('');
    setPickupInput('');
    setPrefixInput('');
  };

  const closeEditor = () => {
    setEditing(null);
    setDraft(null);
    setPincodeInput('');
    setPickupInput('');
    setPrefixInput('');
  };

  // Adds PIN codes to a chip list, rejecting anything that isn't a 6-digit code.
  const addToList = (rawInput, field, clearInput) => {
    const raw = rawInput.replace(/[\s,]+/g, ' ').trim();
    if (!raw) return;
    const parts = raw.split(' ').filter(Boolean);
    const incoming = parts.map(normalizePincode).filter(p => isValidPincode(p));
    const invalid = parts.filter(p => !isValidPincode(normalizePincode(p)));
    if (incoming.length) {
      setDraft(d => ({ ...d, [field]: [...new Set([...(d[field] || []), ...incoming])] }));
    }
    if (invalid.length) {
      toast.error(`Not a valid 6-digit PIN code: ${invalid.join(', ')}`);
    }
    clearInput('');
  };

  const addPincodes = () => addToList(pincodeInput, 'pincodes', setPincodeInput);
  const addPickupPincodes = () => addToList(pickupInput, 'pickupPincodes', setPickupInput);

  const removePincode = (code) => {
    setDraft(d => ({ ...d, pincodes: d.pincodes.filter(p => p !== code) }));
  };

  const removePickupPincode = (code) => {
    setDraft(d => ({ ...d, pickupPincodes: d.pickupPincodes.filter(p => p !== code) }));
  };

  /**
   * Adds a PIN-code prefix (e.g. "6" for every PIN code in Tamil Nadu).
   * A prefix covers a whole stretch of PIN codes without listing them.
   */
  const addPrefixes = () => {
    const parts = prefixInput.replace(/[\s,]+/g, ' ').trim().split(' ').filter(Boolean);
    const incoming = parts
      .map(p => p.replace(/\D/g, ''))
      .filter(p => p.length >= 1 && p.length <= 6);
    const invalid = parts.filter((_, i) => !incoming[i]);
    if (incoming.length) {
      setDraft(d => ({ ...d, pincodePrefixes: [...new Set([...(d.pincodePrefixes || []), ...incoming])] }));
    }
    if (invalid.length) {
      toast.error(`Not a valid PIN code prefix: ${invalid.join(', ')}`);
    }
    setPrefixInput('');
  };

  const removePrefix = (prefix) => {
    setDraft(d => ({ ...d, pincodePrefixes: d.pincodePrefixes.filter(p => p !== prefix) }));
  };

  const saveZone = async () => {
    if (!draft.name.trim()) { toast.error('Give the zone a name'); return; }
    setSaving(true);
    try {
      const payload = {
        type: draft.type,
        name: draft.name.trim(),
        areas: (draft.areas || '').trim(),
        charge: draft.type === ZONE_TYPE.PICKUP ? 0 : Math.max(0, parseInt(draft.charge, 10) || 0),
        pincodes: draft.type === ZONE_TYPE.PICKUP ? [] : (draft.pincodes || []),
        pincodePrefixes: draft.type === ZONE_TYPE.PICKUP ? [] : (draft.pincodePrefixes || []),
        catchAll: draft.type === ZONE_TYPE.PICKUP ? false : draft.catchAll === true,
        pickupPincodes: draft.type === ZONE_TYPE.PICKUP ? (draft.pickupPincodes || []) : [],
        location: (draft.location || '').trim(),
        instructions: (draft.instructions || '').trim(),
        enabled: draft.enabled !== false,
        sortOrder: Number(draft.sortOrder) || 0,
        updatedAt: new Date(),
      };
      await setDoc(doc(db, DELIVERY_ZONES_COLLECTION, draft.id), payload, { merge: true });
      await saveSettings({ ...settings, configured: true });
      await load();
      closeEditor();
      toast.success(`"${payload.name}" saved`);
    } catch (err) {
      console.error(err);
      toast.error('Could not save the zone');
    } finally {
      setSaving(false);
    }
  };

  const removeZone = async (zone) => {
    if (!window.confirm(`Delete the "${zone.name}" zone? Customers in that area will not be able to check out.`)) return;
    try {
      await deleteDoc(doc(db, DELIVERY_ZONES_COLLECTION, zone.id));
      await load();
      toast.success('Zone deleted');
    } catch (err) {
      console.error(err);
      toast.error('Could not delete the zone');
    }
  };

  const toggleZone = async (zone) => {
    try {
      await setDoc(doc(db, DELIVERY_ZONES_COLLECTION, zone.id), { enabled: !zone.enabled, updatedAt: new Date() }, { merge: true });
      await load();
    } catch (err) {
      console.error(err);
      toast.error('Could not update the zone');
    }
  };

  if (checking || !authed) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.loadingSpinner} />
        <p>Checking admin session...</p>
      </div>
    );
  }

  const pickup = findPickupZone(zones);
  const deliveryZones = zones.filter(z => z.type !== ZONE_TYPE.PICKUP);
  const dupePincodes = duplicatePincodes(zones);

  // What the customer would be charged for the PIN code being typed — the
  // exact lookup the checkout and the server do.
  const testResult = (() => {
    const clean = normalizePincode(testPincode);
    if (!clean) return '';
    if (!isValidPincode(clean)) return 'Enter a 6-digit PIN code';
    const zone = findZoneForPincode(zones, clean);
    if (!zone) return 'Not serviceable — no zone covers this PIN code';
    const pickupOk = isPickupEligible(zones, clean);
    return `${zone.name} · ${formatCharge(zone.charge)}${pickupOk ? ' · pickup available' : ''}`;
  })();

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.topLeft}>
          <img src="/logo.png" alt="" className={styles.topLogo} />
          <div className={styles.topText}>
            <span className={styles.topBrand}>Subwikha's Hub</span>
            <span className={styles.topLabel}>Delivery Zones</span>
          </div>
        </div>
        <nav className={styles.topNav}>
          <NavLink to="/admin/orders"    className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Orders</NavLink>
          <NavLink to="/admin/leads"     className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Leads</NavLink>
          <NavLink to="/admin/feedback"  className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Feedback</NavLink>
          <NavLink to="/admin/products"  className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Products</NavLink>
          <NavLink to="/admin/delivery"  className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Delivery</NavLink>
          <NavLink to="/admin/settings"  className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Settings</NavLink>
          <NavLink to="/admin/analytics" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Analytics</NavLink>
          <NavLink to="/admin/gallery"   className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navActive : ''}`}>Gallery</NavLink>
        </nav>
        <div className={styles.topRight}>
          <button className={styles.refreshBtn} onClick={load} disabled={loading}>↺ Refresh</button>
          <button className={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.introCard}>
          <div>
            <h2 className={styles.introTitle}>Delivery zones & charges</h2>
            <p className={styles.introText}>
              Every PIN code you deliver to belongs to a zone, and every zone has its own charge.
              The checkout works this out from the customer's PIN code — you never type a price
              on the website, and a customer can never change what they are charged.
              Right now we deliver across all of India.
            </p>
          </div>
          <div className={styles.introActions}>
            <button
              className={styles.primaryBtn}
              onClick={() => openEditor({ ...EMPTY_DELIVERY_ZONE, id: `zone_${Date.now()}` })}
              disabled={loading}
            >
              + Add delivery zone
            </button>
            <button className={styles.secondaryBtn} onClick={seedStarterZones} disabled={saving}>
              {zones.length === 0 ? 'Create starter zones' : 'Reset starter zones'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingState}><div className={styles.loadingSpinner} /><p>Loading zones...</p></div>
        ) : zones.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📍</span>
            <p>No delivery zones yet.</p>
            <p className={styles.emptyHint}>
              Until you create one, the built-in starter zones are used (₹45 local, ₹90 outer
              Coimbatore, ₹150 elsewhere in Tamil Nadu, ₹200 elsewhere in India, free pickup) so
              the site still works.
            </p>
            <button className={styles.primaryBtn} onClick={seedStarterZones} disabled={saving}>
              Create starter zones
            </button>
          </div>
        ) : (
          <>
            {dupePincodes.length > 0 && (
              <div className={styles.warningBanner}>
                ⚠ These PIN codes are in more than one zone — the first zone wins, so the others
                never apply: <strong>{dupePincodes.join(', ')}</strong>
              </div>
            )}

            <div className={styles.zoneGrid}>
              {deliveryZones.map(zone => (
                <div key={zone.id} className={`${styles.zoneCard} ${zone.enabled ? '' : styles.zoneCardDisabled}`}>
                  <div className={styles.zoneHead}>
                    <div>
                      <h3 className={styles.zoneName}>{zone.name}</h3>
                      <p className={styles.zoneAreas}>{zone.areas || 'No areas described'}</p>
                    </div>
                    <span className={styles.zoneCharge}>{formatCharge(zone.charge)}</span>
                  </div>
                  <p className={styles.zoneMeta}>
                    {zone.catchAll
                      ? 'Every PIN code not covered by another zone'
                      : `${zone.pincodes.length} PIN code${zone.pincodes.length === 1 ? '' : 's'}`}
                    {zone.pincodePrefixes.length > 0 && ` · every PIN starting ${zone.pincodePrefixes.join(', ')}`}
                    {' · '}
                    {zone.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                  {zone.pincodes.length > 0 && (
                    <div className={styles.pincodeChips}>
                      {zone.pincodes.slice(0, 12).map(p => (
                        <span key={p} className={styles.pincodeChip}>{p}</span>
                      ))}
                      {zone.pincodes.length > 12 && (
                        <span className={styles.pincodeChip}>+{zone.pincodes.length - 12} more</span>
                      )}
                    </div>
                  )}
                  {zone.pincodePrefixes.length > 0 && (
                    <div className={styles.pincodeChips}>
                      {zone.pincodePrefixes.map(p => (
                        <span key={p} className={styles.pincodeChip}>{p}****</span>
                      ))}
                    </div>
                  )}
                  <div className={styles.zoneActions}>
                    <button className={styles.smallBtn} onClick={() => openEditor(zone)}>Edit</button>
                    <button className={styles.smallBtn} onClick={() => toggleZone(zone)}>
                      {zone.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button className={styles.dangerBtn} onClick={() => removeZone(zone)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pickup */}
            <div className={styles.sectionCard}>
              <h3 className={styles.sectionTitle}>🏠 Store pickup</h3>
              {pickup ? (
                <>
                  <p className={styles.sectionText}>
                    Customers in your main area can collect their order free — the charge is always ₹0.
                  </p>
                  <div className={styles.pickupSummary}>
                    <InfoLine label="Name" value={pickup.name} />
                    <InfoLine label="Location" value={pickup.location} />
                    <InfoLine label="Instructions" value={pickup.instructions} />
                    <InfoLine label="PIN codes allowed to collect" value={`${(pickup.pickupPincodes || []).length} PIN codes`} />
                    <InfoLine label="Status" value={pickup.enabled ? 'Enabled' : 'Disabled'} />
                  </div>
                  <button className={styles.smallBtn} onClick={() => openEditor(pickup)}>Edit pickup details</button>
                </>
              ) : (
                <>
                  <p className={styles.sectionText}>
                    No pickup zone is enabled, so the checkout only offers home delivery.
                  </p>
                  <button
                    className={styles.primaryBtn}
                    onClick={() => openEditor({
                      ...DEFAULT_DELIVERY_ZONES.find(z => z.type === ZONE_TYPE.PICKUP),
                      id: 'pickup',
                    })}
                  >
                    Set up store pickup
                  </button>
                </>
              )}
            </div>

            {/* Settings */}
            <div className={styles.sectionCard}>
              <h3 className={styles.sectionTitle}>⚙ Settings</h3>
              <div className={styles.settingRow}>
                <div>
                  <p className={styles.settingLabel}>Free delivery above ₹</p>
                  <p className={styles.settingHint}>
                    Orders above this value get free delivery. 0 turns it off (delivery is always
                    charged). Leave it at 0 unless you run a free-delivery offer.
                  </p>
                </div>
                <input
                  type="number"
                  min="0"
                  className={styles.numberInput}
                  value={settings.freeDeliveryAbove || 0}
                  onChange={e => setSettings(s => ({ ...s, freeDeliveryAbove: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                />
                <button
                  className={styles.primaryBtn}
                  onClick={() => saveSettings({ ...settings, configured: true })}
                  disabled={saving}
                >
                  Save
                </button>
              </div>
            </div>

            {/* PIN code tester */}
            <div className={styles.sectionCard}>
              <h3 className={styles.sectionTitle}>🔎 Check a PIN code</h3>
              <p className={styles.sectionText}>
                Type any PIN code to see exactly which zone it falls in and what the customer is
                charged — the same lookup the checkout and the server use.
              </p>
              <div className={styles.pincodeInputRow}>
                <input
                  className={styles.input}
                  value={testPincode}
                  onChange={e => setTestPincode(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                  placeholder="641012"
                />
                <span className={styles.testResult}>{testResult}</span>
              </div>
            </div>
          </>
        )}

        {/* Editor */}
        {editing && draft && (
          <div className={styles.drawerOverlay} onClick={closeEditor}>
            <div className={styles.drawer} onClick={e => e.stopPropagation()}>
              <div className={styles.drawerHead}>
                <h3 className={styles.drawerTitle}>
                  {editing.name ? `Edit "${editing.name}"` : 'New delivery zone'}
                </h3>
                <button className={styles.closeBtn} onClick={closeEditor}>✕</button>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Zone name</label>
                <input
                  className={styles.input}
                  value={draft.name}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Local Delivery"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Areas covered</label>
                <input
                  className={styles.input}
                  value={draft.areas || ''}
                  onChange={e => setDraft(d => ({ ...d, areas: e.target.value }))}
                  placeholder="e.g. Thondamuthur, Vadavalli & nearby areas"
                />
              </div>

              {draft.type === ZONE_TYPE.PICKUP ? (
                <>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Pickup location</label>
                    <input
                      className={styles.input}
                      value={draft.location || ''}
                      onChange={e => setDraft(d => ({ ...d, location: e.target.value }))}
                      placeholder="Subwikha's Hub, Thondamuthur, Coimbatore"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Pickup instructions</label>
                    <textarea
                      className={styles.textarea}
                      rows={5}
                      value={draft.instructions || ''}
                      onChange={e => setDraft(d => ({ ...d, instructions: e.target.value }))}
                      placeholder="How and when customers collect their order..."
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>PIN codes allowed to collect</label>
                    <div className={styles.pincodeInputRow}>
                      <input
                        className={styles.input}
                        value={pickupInput}
                        onChange={e => setPickupInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPickupPincodes(); } }}
                        placeholder="641029, 641032 — press Enter"
                      />
                      <button className={styles.secondaryBtn} onClick={addPickupPincodes}>Add</button>
                    </div>
                    <span className={styles.fieldHint}>
                      Collection from the studio is offered only to customers whose PIN code is on this
                      list — the main area around the studio. Customers outside it can still have an
                      order delivered, they just can't collect it.
                    </span>
                    {draft.pickupPincodes.length > 0 && (
                      <div className={styles.pincodeChips}>
                        {draft.pickupPincodes.map(p => (
                          <span key={p} className={styles.pincodeChip}>
                            {p}
                            <button className={styles.chipRemove} onClick={() => removePickupPincode(p)}>✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Delivery charge (₹)</label>
                      <input
                        type="number"
                        min="0"
                        className={styles.input}
                        value={draft.charge}
                        onChange={e => setDraft(d => ({ ...d, charge: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Priority</label>
                      <input
                        type="number"
                        className={styles.input}
                        value={draft.sortOrder}
                        onChange={e => setDraft(d => ({ ...d, sortOrder: parseInt(e.target.value, 10) || 0 }))}
                      />
                      <span className={styles.fieldHint}>Lower wins when a PIN code is in two zones.</span>
                    </div>
                  </div>

                  <label className={styles.toggleRow}>
                    <input
                      type="checkbox"
                      checked={draft.catchAll === true}
                      onChange={e => setDraft(d => ({ ...d, catchAll: e.target.checked }))}
                    />
                    <span>This zone covers every other PIN code (catch-all)</span>
                  </label>
                  <span className={styles.fieldHint} style={{ marginTop: -8, marginBottom: 12 }}>
                    Use this for "the rest of India" — it applies to any PIN code that no earlier
                    zone matches. Keep it last (lowest priority number).
                  </span>

                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>PIN codes in this zone</label>
                    <div className={styles.pincodeInputRow}>
                      <input
                        className={styles.input}
                        value={pincodeInput}
                        onChange={e => setPincodeInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPincodes(); } }}
                        placeholder="641029, 641030 — press Enter"
                      />
                      <button className={styles.secondaryBtn} onClick={addPincodes}>Add</button>
                    </div>
                    <span className={styles.fieldHint}>
                      Type PIN codes separated by spaces or commas and press Enter. Only 6-digit
                      Indian PIN codes are accepted.
                    </span>
                    {draft.pincodes.length > 0 && (
                      <div className={styles.pincodeChips}>
                        {draft.pincodes.map(p => (
                          <span key={p} className={styles.pincodeChip}>
                            {p}
                            <button className={styles.chipRemove} onClick={() => removePincode(p)}>✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>PIN code prefixes (optional)</label>
                    <div className={styles.pincodeInputRow}>
                      <input
                        className={styles.input}
                        value={prefixInput}
                        onChange={e => setPrefixInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPrefixes(); } }}
                        placeholder="6 — every PIN code starting with 6"
                      />
                      <button className={styles.secondaryBtn} onClick={addPrefixes}>Add</button>
                    </div>
                    <span className={styles.fieldHint}>
                      Use a prefix when a zone covers too many PIN codes to list — "6" covers every
                      PIN code in Tamil Nadu. A zone with a prefix is only reached when no earlier
                      zone matches the customer's PIN code, so keep the specific zones first.
                    </span>
                    {draft.pincodePrefixes.length > 0 && (
                      <div className={styles.pincodeChips}>
                        {draft.pincodePrefixes.map(p => (
                          <span key={p} className={styles.pincodeChip}>
                            {p}****
                            <button className={styles.chipRemove} onClick={() => removePrefix(p)}>✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <label className={styles.toggleRow}>
                <input
                  type="checkbox"
                  checked={draft.enabled !== false}
                  onChange={e => setDraft(d => ({ ...d, enabled: e.target.checked }))}
                />
                <span>Zone is enabled</span>
              </label>

              <div className={styles.drawerActions}>
                <button className={styles.secondaryBtn} onClick={closeEditor}>Cancel</button>
                <button className={styles.primaryBtn} onClick={saveZone} disabled={saving}>Save zone</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div className={styles.infoLine}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value || '—'}</span>
    </div>
  );
}
