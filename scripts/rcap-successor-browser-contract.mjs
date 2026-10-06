// Playwright init scripts execute in every frame, including opaque documents.
export function seedStagedLocale({locale,origin}) {
 if(location.origin===origin)localStorage.setItem('exp_lang',locale);
}
