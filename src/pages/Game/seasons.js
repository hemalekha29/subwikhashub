// Date ranges are inclusive, month is 0-indexed (Date month), day is day-of-month.
const SEASONS = [
  { key: 'diwali', label: '✨ Diwali Special', from: [9, 15], to: [10, 15], accent: '#ff8a3d' },
  { key: 'valentines', label: '💝 Valentine\'s Special', from: [1, 7], to: [1, 14], accent: '#ff4f7b' },
  { key: 'christmas', label: '🎄 Christmas Special', from: [11, 15], to: [11, 26], accent: '#3ddc84' },
];

function inRange(month, day, [fromM, fromD], [toM, toD]) {
  const val = month * 100 + day;
  const from = fromM * 100 + fromD;
  const to = toM * 100 + toD;
  return val >= from && val <= to;
}

export function getActiveSeason() {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  return SEASONS.find(s => inRange(month, day, s.from, s.to)) ?? null;
}
