export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}

export function isValidPhone(phone) {
  return /^\d{10}$/.test((phone || '').trim());
}

/** Indian PIN code — exactly six digits. */
export function isValidPincode(pincode) {
  return /^\d{6}$/.test((pincode || '').trim());
}

/** A name long enough to put on a parcel label. */
export function isValidName(name) {
  return (name || '').trim().length >= 2;
}
