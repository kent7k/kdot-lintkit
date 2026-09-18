// Smoke fixture: must sit under apps/**/src/** so the typed-zones config engages.
// It is intentionally clean — check.mjs fails if ESLint reports anything on it,
// which catches parser/config breakage (e.g. projectService + project conflict)
// that a plain "import the config" check cannot see.
type Props = { label: string }

export function Sample({ label }: Props) {
  return <span>{label}</span>
}
