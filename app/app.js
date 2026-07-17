// Load environment variables
require('dotenv').config();

// Core modules
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const compression = require('compression');

// Firebase config
require('./config/firebase');

// Routes
const { authorization } = require('./helpers/authorization');
const authRoute = require('./routes/auth');
const subscriptionRoute = require('./routes/subscription');
const comCategoryRoute = require('./routes/comCategory');
const communityRoute = require('./routes/community');
const artcleCategoryRoute = require('./routes/articleCategory');
const articleRoute = require('./routes/article');
const hospitalsRoute = require('./routes/hospitals');
const exerciseRoute = require('./routes/exercise');
const foodEatCategoryRoute = require('./routes/foodEatCategory');
const foodAvoidCategoryRoute = require('./routes/foodAvoidCategory');
const foodEatRoute = require('./routes/foodEat');
const foodAvoidRoute = require('./routes/foodAvoid');
const bookRoute = require('./routes/book');
const batchRoute = require('./routes/batch');
const podCastsRoute = require('./routes/podcasts');
const musicRoute = require('./routes/music');
const journeyRoute = require('./routes/journey');
const productRoute = require('./routes/product');
const sosRoute = require('./routes/sosRequests');
const reminderRoute = require('./routes/reminder');
const bannerRoute = require('./routes/banner');
const bumbCountRoute = require('./routes/bumbCount');
const waterCunsumptionCountRoute = require('./routes/waterCunsumption');
const hospitalTypeRoute = require('./routes/hospitalType');
const hospitalDepartmentRoute = require('./routes/hospitalDepartment');
const liveSessionRoute = require('./routes/liveSession');
const SessionNotificationRoute = require('./routes/sessionNotification');
const moodTrackerRoute = require('./routes/moodTracker');
const mediaGalleryRoute = require('./routes/mediaGallery');
const userFeedbackRoute = require('./routes/userFeedback');
const foodTemplateRoute = require('./routes/foodTemplate');
const dietSubscriptionRoute = require('./routes/dietSubscription');
const dietFoodRoute = require('./routes/dietFood');
const dietAvoidFoodRoute = require('./routes/dietAvoidFood');
const assetsRoute = require('./routes/assets');
const adminChatRoute = require('./routes/adminChat');
const customNotificationRoute = require('./routes/customNotification');
const refundRoute = require('./routes/refund');
const termsRoute = require('./routes/termsPolicy');
const privacyRoute = require('./routes/privacyPolicy');
const cancellationRoute = require('./routes/cancellationPolicy');
const paymentLogRoute = require('./routes/paymentLog');
const exerciseSubscriptionRoutes = require('./routes/exerciseSubscription');
const masterExerciseRoutes = require('./routes/masterExercise');
const customExerciseRoutes = require('./routes/customExercise');
const moodQuotesRoutes = require('./routes/moodQuotes');
const babyAnimationRoutes = require('./routes/babyAnimation');
const babyNameRoutes = require('./routes/babyName');
// const webhooksRoutes = require('./routes/webhooks');

// Initialize Express app
const app = express();

//  Force GZIP compression (disable Brotli)
app.use(compression({
  threshold: 0,
  filter: (req, res) => {
    const ae = req.headers['accept-encoding'] || '';
    if (ae.includes('br')) {
      req.headers['accept-encoding'] = 'gzip'; // force gzip
    }
    console.log('| Modified Accept-Encoding:', req.headers['accept-encoding']);
    return compression.filter(req, res);
  }
}));

app.use('/api/webhook', require('./routes/webhook'));
app.use('/api/webhooks', require('./routes/webhooks'));


// JSON & URL Encoded body parser
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Enable CORS
app.use(cors());

// Connect to MongoDB
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGO_URL, { dbName: 'momeedev', autoIndex: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Global API response helper
app.use((req, res, next) => {
  res.apiResponse = (response = true, message = '', data = null, statusCode = 200) => {
    statusCode = (typeof statusCode === 'number' && statusCode >= 100 && statusCode <= 599) ? statusCode : 500;
    return res.status(statusCode).json({ response, message, data });
  };
  next();
});

// Parse `params` from body if it exists
app.use((req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) return next();

  const { params } = req.body;
  if (!params) return res.apiResponse(false, 'Missing params in the request body', {}, 400);

  try {
    req.bodyParams = typeof params === 'string' ? JSON.parse(params) : params;
  } catch (err) {
    return res.apiResponse(false, 'Error parsing params', { error: err.message }, 500);
  }
  next();
});

app.use((req, res, next) => {
  res.on('finish', () => {
    // console.log('| Final Content-Encoding:', res.get('Content-Encoding') || 'none');
  });
  next();
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // or use your frontend domain instead of '*'
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  // res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200); // preflight success
  }

  next();
});

// Authorization middleware
app.use(authorization);

// API route mappings
app.use('/api/auth', authRoute);
app.use('/api/subscription', subscriptionRoute);
app.use('/api/comCat', comCategoryRoute);
app.use('/api/community', communityRoute);
app.use('/api/artCat', artcleCategoryRoute);
app.use('/api/article', articleRoute);
app.use('/api/hospital', hospitalsRoute);
app.use('/api/exercise', exerciseRoute);
app.use('/api/foodEatCat', foodEatCategoryRoute);
app.use('/api/foodAvoidCat', foodAvoidCategoryRoute);
app.use('/api/foodEat', foodEatRoute);
app.use('/api/foodAvoid', foodAvoidRoute);
app.use('/api/book', bookRoute);
app.use('/api/batch', batchRoute);
app.use('/api/podCasts', podCastsRoute);
app.use('/api/music', musicRoute);
app.use('/api/journey', journeyRoute);
app.use('/api/product', productRoute);
app.use('/api/sos', sosRoute);
app.use('/api/reminder', reminderRoute);
app.use('/api/banner', bannerRoute);
app.use('/api/bumbCount', bumbCountRoute);
app.use('/api/consumption', waterCunsumptionCountRoute);
app.use('/api/hospitalType', hospitalTypeRoute);
app.use('/api/hospitalDepartment', hospitalDepartmentRoute);
app.use('/api/liveSession', liveSessionRoute);
app.use('/api/liveSessionNotify', SessionNotificationRoute);
app.use('/api/tracker', moodTrackerRoute);
app.use('/api/gallery', mediaGalleryRoute);
app.use('/api/userFeedback', userFeedbackRoute);
app.use('/api/foodTemplate', foodTemplateRoute);
app.use('/api/dietSubscription', dietSubscriptionRoute);
app.use('/api/dietFood', dietFoodRoute);
app.use('/api/dietAvoidFood', dietAvoidFoodRoute);
app.use('/api/assets', assetsRoute);
app.use('/api/adminChat', adminChatRoute);
app.use('/api/customNotify', customNotificationRoute);
app.use('/api/refund', refundRoute);
app.use('/api/terms', termsRoute);
app.use('/api/privacy', privacyRoute);
app.use('/api/cancellation', cancellationRoute);
app.use('/api/paymentLog', paymentLogRoute);
app.use('/api/exerciseSubscription', exerciseSubscriptionRoutes); 
app.use('/api/masterExercise', masterExerciseRoutes); 
app.use('/api/customExercise', customExerciseRoutes); 
app.use('/api/moodQuotes', moodQuotesRoutes); 
app.use('/api/babyAnimation', babyAnimationRoutes); 
app.use('/api/babyName', babyNameRoutes); 
// app.use('/api/webhooks', webhooksRoutes); 

// Health check
app.get('/api', (req, res) => {
  res.apiResponse(true, 'App Working', {}, 200);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error occurred:', err);
  res.apiResponse(false, 'Error', { error: err.message }, 500);
});

module.exports = app;


// // Load environment variables
// require('dotenv').config();

// // Core modules
// const express = require('express');
// const cors = require('cors');
// const mongoose = require('mongoose');
// const compression = require('compression');

// // Firebase config
// require('./config/firebase');

// // Routes
// const { authorization } = require('./helpers/authorization');
// const authRoute = require('./routes/auth');
// const subscriptionRoute = require('./routes/subscription');
// const comCategoryRoute = require('./routes/comCategory');
// const communityRoute = require('./routes/community');
// const artcleCategoryRoute = require('./routes/articleCategory');
// const articleRoute = require('./routes/article');
// const hospitalsRoute = require('./routes/hospitals');
// const exerciseRoute = require('./routes/exercise');
// const foodEatCategoryRoute = require('./routes/foodEatCategory');
// const foodAvoidCategoryRoute = require('./routes/foodAvoidCategory');
// const foodEatRoute = require('./routes/foodEat');
// const foodAvoidRoute = require('./routes/foodAvoid');
// const bookRoute = require('./routes/book');
// const batchRoute = require('./routes/batch');
// const podCastsRoute = require('./routes/podcasts');
// const musicRoute = require('./routes/music');
// const journeyRoute = require('./routes/journey');
// const productRoute = require('./routes/product');
// const sosRoute = require('./routes/sosRequests');
// const reminderRoute = require('./routes/reminder');
// const bannerRoute = require('./routes/banner');
// const bumbCountRoute = require('./routes/bumbCount');
// const waterCunsumptionCountRoute = require('./routes/waterCunsumption');
// const hospitalTypeRoute = require('./routes/hospitalType');
// const hospitalDepartmentRoute = require('./routes/hospitalDepartment');
// const liveSessionRoute = require('./routes/liveSession');
// const SessionNotificationRoute = require('./routes/sessionNotification');
// const moodTrackerRoute = require('./routes/moodTracker');
// const mediaGalleryRoute = require('./routes/mediaGallery');
// const userFeedbackRoute = require('./routes/userFeedback');

// // Initialize Express app
// const app = express();

// // Enable compression (gzip/br based on client support)
// app.use(compression({ threshold: 0 }));

// // JSON & URL Encoded body parser
// app.use(express.json({ limit: '100mb' }));
// app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// // Enable CORS
// app.use(cors());

// // Connect to MongoDB
// mongoose.set('strictQuery', true);
// mongoose.connect(process.env.MONGO_URL, { dbName: 'momeedev' })
//   .then(() => console.log('Connected to MongoDB'))
//   .catch((err) => console.error('MongoDB connection error:', err));

// // Global API response helper
// app.use((req, res, next) => {
//   res.apiResponse = (response = true, message = '', data = null, statusCode = 200) => {
//     statusCode = (typeof statusCode === 'number' && statusCode >= 100 && statusCode <= 599) ? statusCode : 500;
//     return res.status(statusCode).json({ response, message, data });
//   };
//   next();
// });

// // Parse `params` from body if it exists
// app.use((req, res, next) => {
//   if (!req.body || Object.keys(req.body).length === 0) return next();

//   const { params } = req.body;
//   if (!params) return res.apiResponse(false, 'Missing params in the request body', {}, 400);

//   try {
//     req.bodyParams = typeof params === 'string' ? JSON.parse(params) : params;
//   } catch (err) {
//     return res.apiResponse(false, 'Error parsing params', { error: err.message }, 500);
//   }
//   next();
// });

// // Debug response encoding (useful in dev only)
// app.use((req, res, next) => {
//   const _send = res.send;
//   res.send = function (body) {
//     console.log('| Content-Encoding:', res.get('Content-Encoding'));
//     return _send.call(this, body);
//   };
//   next();
// });

// app.use((req, res, next) => {
//   res.on('finish', () => {
//     console.log('| Content-Encoding:', res.get('Content-Encoding') || 'none');
//   });
//   next();
// });

// // Authorization middleware
// app.use(authorization);

// // API route mappings
// app.use('/api/auth', authRoute);
// app.use('/api/subscription', subscriptionRoute);
// app.use('/api/comCat', comCategoryRoute);
// app.use('/api/community', communityRoute);
// app.use('/api/artCat', artcleCategoryRoute);
// app.use('/api/article', articleRoute);
// app.use('/api/hospital', hospitalsRoute);
// app.use('/api/exercise', exerciseRoute);
// app.use('/api/foodEatCat', foodEatCategoryRoute);
// app.use('/api/foodAvoidCat', foodAvoidCategoryRoute);
// app.use('/api/foodEat', foodEatRoute);
// app.use('/api/foodAvoid', foodAvoidRoute);
// app.use('/api/book', bookRoute);
// app.use('/api/batch', batchRoute);
// app.use('/api/podCasts', podCastsRoute);
// app.use('/api/music', musicRoute);
// app.use('/api/journey', journeyRoute);
// app.use('/api/product', productRoute);
// app.use('/api/sos', sosRoute);
// app.use('/api/reminder', reminderRoute);
// app.use('/api/banner', bannerRoute);
// app.use('/api/bumbCount', bumbCountRoute);
// app.use('/api/consumption', waterCunsumptionCountRoute);
// app.use('/api/hospitalType', hospitalTypeRoute);
// app.use('/api/hospitalDepartment', hospitalDepartmentRoute);
// app.use('/api/liveSession', liveSessionRoute);
// app.use('/api/liveSessionNotify', SessionNotificationRoute);
// app.use('/api/tracker', moodTrackerRoute);
// app.use('/api/gallery', mediaGalleryRoute);
// app.use('/api/userFeedback', userFeedbackRoute);

// // Health check
// app.get('/api', (req, res) => {
//   res.apiResponse(true, 'App Working', {}, 200);
// });

// // Global error handler
// app.use((err, req, res, next) => {
//   console.error('Error occurred:', err);
//   res.apiResponse(false, 'Error', { error: err.message }, 500);
// });

// module.exports = app;
