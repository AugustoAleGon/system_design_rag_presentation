import { createInstance } from 'i18next';
import { content, type Language } from './deck';
export async function getI18n(lang: Language) {
  const i18n = createInstance();
  await i18n.init({
    lng: lang, fallbackLng: 'en', supportedLngs: ['en', 'es'],
    resources: { en: { translation: content('en') }, es: { translation: content('es') } },
    interpolation: { escapeValue: false },
  });
  return i18n;
}
