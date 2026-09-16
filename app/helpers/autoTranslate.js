const {
  TranslationServiceClient
} = require('@google-cloud/translate');

const client = new TranslationServiceClient();

// const projectId =
//   process.env.GOOGLE_TRANSLATE_PROJECT_ID;
let projectId = null;

const location = 'global';

// Simple in-memory cache.
// This prevents translating the same string repeatedly
// while the Node.js process is running.
const cache = new Map();

// Fields that should NEVER be translated.
const ignoredKeys = new Set([
  '_id',
  'id',
  '__v',
  'mobile',
  'phone',
  'email',
  'file',
  'image',
  'url',
  'public_id',
  'latitude',
  'longitude',
  'coordinates',
  'departmentIds',
  'typeIds',
  'createdAt',
  'updatedAt',
  'status'
]);

function shouldTranslate(key, value) {

  if (!value) {
    return false;
  }

  if (typeof value !== 'string') {
    return false;
  }

  if (ignoredKeys.has(key)) {
    return false;
  }

  // Don't translate URLs
  if (
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    return false;
  }

  // Don't translate email
  if (value.includes('@')) {
    return false;
  }

  // Don't translate Mongo IDs / technical IDs
  if (
    value.length > 20 &&
    /^[A-Za-z0-9_-]+$/.test(value)
  ) {
    return false;
  }

  return true;
}

async function translateTexts(texts) {
  if (!projectId) {
  projectId = await client.getProjectId();

  console.log(
    'Google Translation Project ID:',
    projectId
  );
}

  if (!texts.length) {
    return [];
  }

  const uniqueTexts = [
    ...new Set(texts)
  ];

  const results = {};

  const missingTexts = uniqueTexts.filter(
    text => !cache.has(text)
  );

  // Everything already cached
  for (const text of uniqueTexts) {
    if (cache.has(text)) {
      results[text] = cache.get(text);
    }
  }

  if (!missingTexts.length) {
    return texts.map(
      text => results[text] || text
    );
  }

  // Google Translation supports multiple contents
  // in a single translateText request.
  const request = {
    parent:
      `projects/${projectId}/locations/${location}`,

    contents: missingTexts,

    mimeType: 'text/plain',

    sourceLanguageCode: 'en',

    targetLanguageCode: 'ta'
  };

  const [response] =
    await client.translateText(request);

  response.translations.forEach(
    (translation, index) => {

      const original =
        missingTexts[index];

      const translated =
        translation.translatedText;

      cache.set(
        original,
        translated
      );

      results[original] =
        translated;
    }
  );

  return texts.map(
    text => results[text] || text
  );
}


/*
 * Collect all translatable strings
 * from nested objects and arrays.
 */
function collectStrings(
  value,
  key = null,
  output = []
) {

  if (
    value === null ||
    value === undefined
  ) {
    return output;
  }

  if (Array.isArray(value)) {

    for (const item of value) {
      collectStrings(
        item,
        key,
        output
      );
    }

    return output;
  }

  if (
    typeof value === 'object'
  ) {

    for (
      const [childKey, childValue]
      of Object.entries(value)
    ) {

      collectStrings(
        childValue,
        childKey,
        output
      );
    }

    return output;
  }

  if (
    shouldTranslate(
      key,
      value
    )
  ) {

    output.push(value);
  }

  return output;
}


/*
 * Replace the English strings with
 * translated Tamil strings.
 */
function replaceTranslatedValues(
  value,
  translations,
  key = null
) {

  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (Array.isArray(value)) {

    return value.map(item =>
      replaceTranslatedValues(
        item,
        translations,
        key
      )
    );
  }

  if (
    typeof value === 'object'
  ) {

    const result = {};

    for (
      const [childKey, childValue]
      of Object.entries(value)
    ) {

      result[childKey] =
        replaceTranslatedValues(
          childValue,
          translations,
          childKey
        );
    }

    return result;
  }

  if (
    shouldTranslate(
      key,
      value
    )
  ) {

    return translations[value] || value;
  }

  return value;
}


/*
 * Main function
 */
async function autoTranslate(
  data,
  language
) {

  // English: return exactly as it is.
  if (language !== 'ta') {
    return data;
  }

  const strings = collectStrings(data);

  if (!strings.length) {
    return data;
  }

  const translated =
    await translateTexts(strings);

  const translationMap = {};

  strings.forEach(
    (original, index) => {
      translationMap[original] =
        translated[index];
    }
  );

  return replaceTranslatedValues(
    data,
    translationMap
  );
}

module.exports = {
  autoTranslate
};