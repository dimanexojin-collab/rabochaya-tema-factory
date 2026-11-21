/**
 * Данные компании — ТОЛЬКО из источника (5ni.ru, снято 2026-11-16). Всё неизвестное — строка с `TODO`.
 * `npm run check:todo` выводит незаполненные поля; `STRICT=1 npm run build` падает, если TODO остались
 * в обязательных полях (REQUIRED_FIELDS).
 *
 * Правило: значения с TODO НЕ попадают в title/description/JSON-LD (см. `filled()`),
 * в интерфейсе показываются как «уточняется» (компонент TodoNote).
 *
 * Адрес публикации: origin + base. Задаются переменными окружения при сборке:
 *   SITE (или SITE_ORIGIN) — https://<owner>.github.io;  BASE (или BASE_PATH) — /rabochaya-tema-factory/
 * При переезде на свой домен: BASE=/ и SITE=https://домен — код не меняется.
 */

const env: Record<string, string | undefined> = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

/** '/rabochaya-tema' | 'rabochaya-tema/' | '' → '/rabochaya-tema-factory/' | '/' */
export function normalizeBase(b: string | undefined): string {
  const s = (b ?? '').trim().replace(/^\/+|\/+$/g, '');
  return s ? `/${s}/` : '/';
}

export type DayCode = 'Mo' | 'Tu' | 'We' | 'Th' | 'Fr' | 'Sa' | 'Su';

export const SITE = {
  origin: (env.SITE ?? env.SITE_ORIGIN ?? 'https://dimanexojin-collab.github.io').replace(/\/+$/, ''),
  base: normalizeBase(env.BASE ?? env.BASE_PATH ?? '/rabochaya-tema-factory/'),

  name: 'Рабочая тема',
  /** Короткое описание для OG/JSON-LD — по фактам источника. */
  tagline: 'Производство рабочих перчаток в Архангельске',
  city: 'Архангельск',
  cityPrepositional: 'в Архангельске',

  legal: {
    entity: 'ООО «Спецмаркет»',
    inn: '2901258591',
    ogrn: 'TODO: ОГРН',
    kpp: 'TODO: КПП',
    legalAddress: 'TODO: юридический адрес',
  },
  /** Розничный отдел в источнике называется «СПЕЦОДЕЖДА». */
  retailName: 'СПЕЦОДЕЖДА',

  address: {
    street: 'пр. Ломоносова, 88, цоколь',
    streetSchema: 'пр. Ломоносова, 88',
    locality: 'Архангельск',
    region: 'Архангельская область',
    postalCode: 'TODO: индекс',
  },

  phones: [
    { label: 'Розничный отдел', display: '+7 818 260-90-96', href: 'tel:+78182609096' },
    { label: 'Менеджеры по продажам', display: '8-962-663-80-80', href: 'tel:+79626638080' },
    { label: 'Тел./факс, приём заказов', display: '8 (8182) 24-22-02', href: 'tel:+78182242202' },
  ],
  /** Основной номер для шапки и JSON-LD: заказы по телефону — 8 (8182) 24-22-02 (так в источнике). */
  mainPhoneIndex: 2,
  email: '7z2z@mail.ru',

  hours: 'TODO: график работы отдела на пр. Ломоносова, 88',
  /** Структурированный график для JSON-LD — заполнить вместе с hours. */
  hoursSpec: [] as { days: DayCode[]; open: string; close: string }[],
  geo: { lat: 0, lon: 0 },
  mapUrl: 'TODO: ссылка на Яндекс.Карты/2ГИС',
  howToGet: 'TODO: схема проезда, ориентиры, вход в цоколь',

  social: {
    vk: 'TODO',
    telegram: 'TODO',
    whatsapp: 'TODO',
  },
  certificates: 'TODO: номера сертификатов/деклараций ТР ТС 019/2011 на продукцию собственного производства',
  delivery: 'TODO: способы, регионы, сроки и стоимость доставки; минимальная партия; самовывоз',

  analytics: { yandexMetrika: '', yandexVerification: '', googleVerification: '' },
} as const;

/** Поля, без которых нельзя публиковать сайт (STRICT=1). */
export const REQUIRED_FIELDS = ['origin', 'name', 'city', 'address.street', 'email', 'legal.entity', 'legal.inn', 'hours'] as const;

export const isTodo = (v: unknown): boolean => typeof v === 'string' && (v.trim() === '' || /TODO/i.test(v));

/** Значение, если оно заполнено, иначе undefined. */
export function filled<T>(v: T): T | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string') return isTodo(v) ? undefined : v;
  return v;
}

export const mainPhone = () => SITE.phones[SITE.mainPhoneIndex];
export const fullAddress = () => `${SITE.address.locality}, ${SITE.address.street}`;
export const geoFilled = () => (SITE.geo.lat !== 0 || SITE.geo.lon !== 0 ? SITE.geo : undefined);
export const socialLinks = (): { name: string; href: string }[] =>
  [
    { name: 'ВКонтакте', href: SITE.social.vk as string },
    { name: 'Telegram', href: SITE.social.telegram as string },
    { name: 'WhatsApp', href: SITE.social.whatsapp as string },
  ].filter((s) => !isTodo(s.href) && /^https?:\/\//.test(s.href));

export const DAY_SCHEMA: Record<DayCode, string> = {
  Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday',
};
