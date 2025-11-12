// src/utils/CBC/cbcvalidators.js

/* ----------------- Numeric rules ----------------- */
export const numberRule = (v) =>
  v === '' || v == null || !isNaN(Number(v)) || 'Numbers only';

export const requiredNumberRule = (v) =>
  (v !== '' && v != null && !isNaN(Number(v))) || 'Required number';

/* ----------------- Hard limits ----------------- */
/* Wide physiologic bounds (not “normal” ranges). */
export const hardLimits = {
  wbc:  { min: 0,    max: 500 },   // ×10⁹/L
  rbc:  { min: 0,    max: 9   },   // ×10¹²/L
  hb:   { min: 0,    max: 250 },   // g/L
  hct:  { min: 0,    max: 1   },   // L/L (fraction)
  mcv:  { min: 40,   max: 140 },   // fL
  mch:  { min: 15,   max: 45  },   // pg
  mchc: { min: 250,  max: 420 },   // g/L
  plt:  { min: 0,    max: 2000 },  // ×10⁹/L
};

/* Rule factory used for all analytes */
export const hardLimitRule = (min, max, label) => (v) => {
  if (v === '' || v == null) return true;
  const n = Number(v);
  if (isNaN(n)) return `${label}: must be a number`;
  if (n < min || n > max) return `${label}: enter a realistic value (${min}–${max})`;
  return true;
};

/* Hct & differentials live in 0–1 */
export const ratioHardRule = hardLimitRule(0, 1, 'Differential (ratio 0–1)');
export const hctHardRule   = hardLimitRule(0, 1, 'Hematocrit (0–1)');

/* ----------------- Normalizers ----------------- */
export const clamp01 = (x) => Math.max(0, Math.min(1, Number(x)));

export const normalizeRatio = (v) => {
  if (v === '' || v == null) return '';
  const n = Number(v);
  if (isNaN(n)) return v;
  // Allow “62” → 0.62 for convenience
  return n > 1 && n <= 100 ? (n / 100).toFixed(2) : n;
};

export const normalizeHct = (v) => {
  if (v === '' || v == null) return '';
  const n = Number(v);
  if (isNaN(n)) return v;
  // Allow “36” → 0.36
  return n > 1.5 && n <= 100 ? (n / 100).toFixed(2) : n;
};

/* Common entry error: RBC 54 → 5.4 */
export const normalizeRBC = (v) => {
  if (v === '' || v == null) return '';
  const n = Number(v);
  if (isNaN(n)) return v;
  if (n > 20 && n <= 100) return Number((n / 10).toFixed(1));
  return n;
};

/* Values prepared for sending to DB */
export const normRatioSend = (v) => {
  if (v === '' || v == null) return '';
  const n = Number(v);
  if (isNaN(n)) return '';
  return clamp01(n > 1 ? n / 100 : n);
};

export const normHctSend = (v) => {
  if (v === '' || v == null) return '';
  const n = Number(v);
  if (isNaN(n)) return '';
  return n > 1.5 ? Number((n / 100).toFixed(2)) : n;
};

/* ----------------- Rule sets (ready to use in template) ----------------- */
export const createRuleSets = () => ({
  wbcRules:  [requiredNumberRule, hardLimitRule(hardLimits.wbc.min,  hardLimits.wbc.max,  'WBC')],
  rbcRules:  [requiredNumberRule, hardLimitRule(hardLimits.rbc.min,  hardLimits.rbc.max,  'RBC')],
  hbRules:   [requiredNumberRule, hardLimitRule(hardLimits.hb.min,   hardLimits.hb.max,   'Hemoglobin')],
  hctRules:  [requiredNumberRule, hctHardRule],
  mcvRules:  [requiredNumberRule, hardLimitRule(hardLimits.mcv.min,  hardLimits.mcv.max,  'MCV')],
  mchRules:  [requiredNumberRule, hardLimitRule(hardLimits.mch.min,  hardLimits.mch.max,  'MCH')],
  mchcRules: [requiredNumberRule, hardLimitRule(hardLimits.mchc.min, hardLimits.mchc.max, 'MCHC')],
  pltRules:  [requiredNumberRule, hardLimitRule(hardLimits.plt.min,  hardLimits.plt.max,  'Platelets')],
  neutRules:  [numberRule, ratioHardRule],
  lymphRules: [numberRule, ratioHardRule],
  monoRules:  [numberRule, ratioHardRule],
  eosRules:   [numberRule, ratioHardRule],
  basoRules:  [numberRule, ratioHardRule],
});
