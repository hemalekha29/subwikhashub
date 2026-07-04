export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}

export function isValidPhone(phone) {
  return /^\d{10}$/.test((phone || '').trim());
}
