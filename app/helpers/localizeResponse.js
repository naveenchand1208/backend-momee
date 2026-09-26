function localizeValue(value, language = 'en') {
    if (value === null || value === undefined) {
        return value;
    }

    if (value instanceof Date) {
        return value;
    }

    // MongoDB ObjectId (e.g. _id fields). Without this, it falls through to
    // the generic object walk below and gets serialized as its internal
    // buffer ({"buffer":{"0":105,...}}) instead of staying a hex string —
    // breaking every client that expects _id to be a String.
    if (value && typeof value.toHexString === 'function') {
        return value.toHexString();
    }

    if (Array.isArray(value)) {
        return value.map((item) =>
            localizeValue(item, language)
        );
    }

    if (typeof value !== 'object') {
        return value;
    }

    if (value && typeof value.toObject === 'function') {
        value = value.toObject();
    }

    const result = {};

    // First copy all normal fields
    for (const [key, val] of Object.entries(value)) {
        if (key === 'translations') {
            continue;
        }

        result[key] = localizeValue(val, language);
    }

    // English = keep original API response
    if (language === 'en') {
        return result;
    }

    // Tamil = apply Tamil translations
    const translations = value.translations;

    if (
        translations &&
        typeof translations === 'object' &&
        !Array.isArray(translations)
    ) {
        const selected = translations[language];

        if (
            selected &&
            typeof selected === 'object' &&
            !Array.isArray(selected)
        ) {
            for (const [key, translatedValue] of Object.entries(selected)) {

                // Only replace when Tamil value actually exists
                if (
                    translatedValue !== null &&
                    translatedValue !== undefined &&
                    translatedValue !== ''
                ) {
                    result[key] = localizeValue(
                        translatedValue,
                        language
                    );
                }
            }
        }
    }

    return result;
}

module.exports = {
    localizeValue
};


// function localizeValue(value, language = 'en') {
//     if (value === null || value === undefined) {
//         return value;
//     }

//     if (value instanceof Date) {
//         return value;
//     }

//     if (Array.isArray(value)) {
//         return value.map((item) =>
//             localizeValue(item, language)
//         );
//     }

//     if (typeof value !== 'object') {
//         return value;
//     }

//     if (value && typeof value.toObject === 'function') {
//         value = value.toObject();
//     }

//     const result = {};

//     // First copy normal fields
//     for (const [key, val] of Object.entries(value)) {
//         if (key === 'translations') {
//             continue;
//         }

//         result[key] = localizeValue(val, language);
//     }

//     // Then apply selected language
//     const translations = value.translations;

//     if (
//         translations &&
//         typeof translations === 'object' &&
//         !Array.isArray(translations)
//     ) {
//         const selected =
//             translations[language] ||
//             translations.en;

//         if (
//             selected &&
//             typeof selected === 'object' &&
//             !Array.isArray(selected)
//         ) {
//             for (const [key, translatedValue] of Object.entries(selected)) {
//                 result[key] = localizeValue(
//                     translatedValue,
//                     language
//                 );
//             }
//         }
//     }

//     return result;
// }

// module.exports = {
//     localizeValue
// };



//////////old/////////
// function localizeValue(value, language = 'en') {

//     if (value === null || value === undefined) {
//         return value;
//     }

//     // Primitive
//     if (typeof value !== 'object') {
//         return value;
//     }

//     // Array
//     if (Array.isArray(value)) {
//         return value.map((item) =>
//             localizeValue(item, language)
//         );
//     }

//     // Mongoose document
//     if (
//         value &&
//         typeof value.toObject === 'function'
//     ) {
//         value = value.toObject();
//     }

//     const result = {};

//     /*
//      * Get translations from this object.
//      *
//      * Example:
//      * translations: {
//      *   en: { name: "Premium" },
//      *   ta: { name: "பிரீமியம்" }
//      * }
//      */
//     const translations = value.translations;

//     const selectedTranslation =
//         translations &&
//         typeof translations === 'object'
//             ? (
//                 translations[language] ||
//                 translations.en ||
//                 {}
//             )
//             : {};

//     /*
//      * First apply translated fields.
//      */
//     if (
//         selectedTranslation &&
//         typeof selectedTranslation === 'object'
//     ) {

//         Object.keys(selectedTranslation).forEach(
//             (key) => {

//                 result[key] =
//                     localizeValue(
//                         selectedTranslation[key],
//                         language
//                     );

//             }
//         );
//     }

//     /*
//      * Then process normal fields.
//      *
//      * IMPORTANT:
//      * translations is skipped so we don't
//      * recursively enter translations again.
//      */
//     Object.keys(value).forEach((key) => {

//         if (key === 'translations') {
//             return;
//         }

//         result[key] =
//             localizeValue(
//                 value[key],
//                 language
//             );

//     });

//     return result;
// }

// module.exports = {
//     localizeValue
// };