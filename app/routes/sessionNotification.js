const express = require('express')
const router = express.Router()
const sessionNotification = require('../controllers/sessionNotification')
const upload = require('../helpers/multer');

router.post('/add', sessionNotification.add);
router.post('/list', sessionNotification.list);
router.post('/view', sessionNotification.view);
// router.post('/update', sessionNotification.add);
// router.post('/delete', sessionNotification.delete)

module.exports = router;  