const SUPPORTED_LANGUAGES = ['en', 'ta'];

module.exports = (req, res, next) => {
  let language = req.get('Accept-Language') || 'en';

  // Example:
  // "ta"
  // "en"
  // "ta-IN"
  // "en-US"

  language = language.toLowerCase().split(',')[0].split('-')[0];

  if (!SUPPORTED_LANGUAGES.includes(language)) {
    language = 'en';
  }

  req.language = language;

  res.locals.language = language;

  next();
};

// const fs = require('fs');
// const path = require('path');

// const cache = {};
// function load(lang) {
//   if (!cache[lang]) {
//     const file = path.join(__dirname, '..', 'languages', `${lang}.json`);
//     try { cache[lang] = JSON.parse(fs.readFileSync(file, 'utf8')); }
//     catch { cache[lang] = {}; }
//   }
//   return cache[lang];
// }
// function lookup(obj, key) {
//   return key.split('.').reduce((v, k) => v && v[k], obj);
// }

// module.exports = function languageMiddleware(req, res, next) {
//   const raw = String(req.get('Accept-Language') || req.headers['x-language'] || req.query?.lang || 'en').toLowerCase();
//   const lang = raw.split(',')[0].trim().split('-')[0];
//   req.language = lang === 'ta' ? 'ta' : 'en';
//   req.t = (key, fallback) => {
//     const direct = lookup(load(req.language), key) ?? lookup(load(req.language), key.replace(/^i18n\./,''));
//     return direct ?? fallback ?? key;
//   };
//   req.i18n = { language: req.language, get: req.t };
//   res.setHeader('Content-Language', req.language);
//   next();
// };

// module.exports.load = load;
