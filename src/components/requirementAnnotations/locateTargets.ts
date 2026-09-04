export function selectAnnotationTargets<T extends { tagName: string }>(
  targets: T[],
  mode?: 'column-headers',
): T[] {
  return mode === 'column-headers'
    ? targets.filter((target) => target.tagName === 'TH')
    : targets;
}
