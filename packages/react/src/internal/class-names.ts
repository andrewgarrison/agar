/** Agar's own class first, then the consumer's. */
export function classNames(base: string, extra: string | undefined): string {
  return extra === undefined || extra === '' ? base : `${base} ${extra}`;
}
