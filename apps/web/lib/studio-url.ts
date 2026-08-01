/** Base URL of the adjacent Pulse Studio authoring app. */
export function studioAppUrl() {
  return (
    process.env.NEXT_PUBLIC_STUDIO_URL?.replace(/\/$/, "") ||
    "http://localhost:3001"
  );
}

export function studioLibraryHref(locale?: string) {
  const base = studioAppUrl();
  return locale ? `${base}/${locale}` : base;
}

export function studioCourseHref(courseId: string, locale?: string) {
  const base = studioAppUrl();
  const path = `/courses/${courseId}`;
  return locale ? `${base}/${locale}${path}` : `${base}${path}`;
}

export function studioPathHref(pathId: string, locale?: string) {
  const base = studioAppUrl();
  const path = `/paths/${pathId}`;
  return locale ? `${base}/${locale}${path}` : `${base}${path}`;
}
