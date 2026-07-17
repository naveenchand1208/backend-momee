const express = require('express')
const router = express.Router()
const moodTrackerController = require('../controllers/moodTracker')
const upload = require('../helpers/multer');

router.post('/add', moodTrackerController.add)
router.post('/list', moodTrackerController.list)
// router.post('/view', liveSessionController.view)

module.exports = router;    