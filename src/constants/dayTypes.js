export const DAY_TYPES = [
  {
    value: 'JOHV',
    shortLabel: 'Jour ouvre',
    label: 'Jour ouvre hors vacances',
  },
  {
    value: 'JOVS',
    shortLabel: 'Vacances',
    label: 'Jour ouvre en vacances scolaires',
  },
  {
    value: 'SAHV',
    shortLabel: 'Samedi',
    label: 'Samedi hors vacances',
  },
  {
    value: 'SAVS',
    shortLabel: 'Sam. vac.',
    label: 'Samedi en vacances scolaires',
  },
  {
    value: 'DIJFP',
    shortLabel: 'Dim.',
    label: 'Dimanche, jour ferie ou pont',
  },
]

export const DEFAULT_DAY_TYPE = 'JOHV'

export function getDayTypeLabel(dayType) {
  return DAY_TYPES.find((type) => type.value === dayType)?.label ?? dayType
}
