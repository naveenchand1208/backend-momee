/**
 * Central localization wrapper for controller responses.
 *
 * Controllers call localizedApiResponse(req, res, ...).
 * - Translation keys (i18n.*) are resolved through req.t().
 * - A small compatibility map handles existing hard-coded messages.
 * - Data containing a `translations` object is localized recursively.
 * - IDs, URLs, numbers, dates and technical fields are left unchanged.
 */

const COMMON_TAMIL = {
  'User not found': 'பயனர் கிடைக்கவில்லை',
  'User Not Found': 'பயனர் கிடைக்கவில்லை',
  'Password is wrong': 'கடவுச்சொல் தவறாக உள்ளது',
  'Logged in success': 'உள்நுழைவு வெற்றிகரமாக முடிந்தது',
  'User already exists': 'பயனர் ஏற்கனவே உள்ளார்',
  'Success': 'வெற்றி',
  'Error': 'பிழை',
  'Server error': 'சர்வர் பிழை',
  'Unauthorized': 'அனுமதி இல்லை',
  'Invalid Email': 'தவறான மின்னஞ்சல்',
  'Invalid OTP': 'தவறான OTP',
  'OTP is missing': 'OTP குறிப்பிடப்படவில்லை',
  'Email or OTP is missing': 'மின்னஞ்சல் அல்லது OTP குறிப்பிடப்படவில்லை',
  'Mobile number does not match': 'மொபைல் எண் பொருந்தவில்லை',
  'Mobile No Already Exists': 'மொபைல் எண் ஏற்கனவே உள்ளது',
  'Id is missing': 'ஐடி குறிப்பிடப்படவில்லை',
  'Id is required': 'ஐடி தேவை',
  'Missing params': 'தேவையான அளவுருக்கள் குறிப்பிடப்படவில்லை',
  'Params Missing': 'அளவுருக்கள் குறிப்பிடப்படவில்லை',
  'Params is Missing': 'அளவுருக்கள் குறிப்பிடப்படவில்லை',
  'Params is missing': 'அளவுருக்கள் குறிப்பிடப்படவில்லை',
  'Payload is missing': 'தரவு குறிப்பிடப்படவில்லை',
  'UserId is missing': 'பயனர் ஐடி குறிப்பிடப்படவில்லை',
  'UserId or mobile is missing': 'பயனர் ஐடி அல்லது மொபைல் எண் குறிப்பிடப்படவில்லை',
  'No users found': 'பயனர்கள் எவரும் கிடைக்கவில்லை',
  'Fetched successfully': 'வெற்றிகரமாக பெறப்பட்டது',
  'Updated successfully': 'வெற்றிகரமாக புதுப்பிக்கப்பட்டது',
  'Deleted successfully': 'வெற்றிகரமாக நீக்கப்பட்டது',
  'Added successfully': 'வெற்றிகரமாக சேர்க்கப்பட்டது',
  'Please verify your email': 'உங்கள் மின்னஞ்சலை சரிபார்க்கவும்',
  'Please Verify Your Email': 'உங்கள் மின்னஞ்சலை சரிபார்க்கவும்',
  'Invalid token': 'தவறான டோக்கன்',
  'Invalid signature': 'தவறான கையொப்பம்',
  'Payment verification failed': 'கட்டண சரிபார்ப்பு தோல்வியடைந்தது',
  'Payment verified': 'கட்டணம் சரிபார்க்கப்பட்டது',
  'Plan not found': 'திட்டம் கிடைக்கவில்லை',
  'Class not found': 'வகுப்பு கிடைக்கவில்லை',
  'Comment not found': 'கருத்து கிடைக்கவில்லை',
  'Community not found': 'சமூகம் கிடைக்கவில்லை',
  'Article not found': 'கட்டுரை கிடைக்கவில்லை',
  'Exercise not found': 'உடற்பயிற்சி கிடைக்கவில்லை',
  'Food not found': 'உணவு கிடைக்கவில்லை',
  'Hospital not found': 'மருத்துவமனை கிடைக்கவில்லை',
  'Book not found': 'புத்தகம் கிடைக்கவில்லை',
  'Music not found': 'இசை கிடைக்கவில்லை',
  'Journey not found': 'பயணம் கிடைக்கவில்லை',
  'Product Not Found': 'தயாரிப்பு கிடைக்கவில்லை',
  'Product not found': 'தயாரிப்பு கிடைக்கவில்லை',
  'Notification not found': 'அறிவிப்பு கிடைக்கவில்லை',
  'Reminder not found': 'நினைவூட்டல் கிடைக்கவில்லை',
  'Gallery not found': 'கேலரி கிடைக்கவில்லை',
  'BabyName not found': 'குழந்தை பெயர் கிடைக்கவில்லை',
  'Animation not found': 'அனிமேஷன் கிடைக்கவில்லை'
};

function translateMessage(req, message) {
  if (message === undefined || message === null) return message;
  if (typeof message !== 'string') return message;

  if (req && typeof req.t === 'function' && message.startsWith('i18n.')) {
    return req.t(message.slice(5));
  }

  if (req && req.language === 'ta' && COMMON_TAMIL[message]) {
    return COMMON_TAMIL[message];
  }

  return message;
}

const TECHNICAL_KEYS = new Set([
  '_id', 'id', '__v', 'public_id', 'file', 'url', 'image', 'imageUrl',
  'audio', 'audioUrl', 'video', 'videoUrl', 'token', 'accessToken',
  'refreshToken', 'email', 'mobile', 'phone', 'password', 'otp',
  'createdAt', 'updatedAt', 'deletedAt', 'amount', 'price', 'count',
  'page', 'limit', 'totalDocs', 'totalPages', 'pagingCounter', 'hasPrevPage',
  'hasNextPage', 'prevPage', 'nextPage', 'execTime', 'statusCode'
]);

function localizeData(req, value, parentKey = '') {
  if (Array.isArray(value)) {
    return value.map(item => localizeData(req, item, parentKey));
  }

  if (!value || typeof value !== 'object') return value;

  const source = typeof value.toObject === 'function'
    ? value.toObject({ virtuals: true })
    : value;

  const translations = source.translations || {};
  const lang = req && req.language ? req.language : 'en';
  const langTranslations = translations[lang] || {};
  const result = {};

  for (const [key, raw] of Object.entries(source)) {
    if (key === 'translations') continue;

    if (TECHNICAL_KEYS.has(key)) {
      result[key] = raw;
      continue;
    }

    let localized = raw;

    // Direct field translation: translations.ta.name
    if (Object.prototype.hasOwnProperty.call(langTranslations, key)) {
      localized = langTranslations[key];
    }

    result[key] = localizeData(req, localized, key);
  }

  return result;
}

function localizedApiResponse(req, res, response = true, message = '', data = null, statusCode = 200) {
  const localizedMessage = translateMessage(req, message);
  const localizedData = localizeData(req, data);
  return res.apiResponse(response, localizedMessage, localizedData, statusCode);
}

module.exports = {
  localizedApiResponse,
  localizeData,
  translateMessage
};
