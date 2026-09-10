const mongoose = require('mongoose');

// Adds one flexible bilingual store to every application schema without
// changing existing field types. Existing controllers continue to work.
module.exports = function bilingualPlugin(schema) {
  if (schema.path('translations')) return;
  schema.add({
    translations: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ en: {}, ta: {} })
    }
  });
};
