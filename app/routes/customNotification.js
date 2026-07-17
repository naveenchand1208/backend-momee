const express = require('express')
const router = express.Router()
const customNotificationController = require('../controllers/customNotification')
const upload = require('../helpers/multer');
const { parseMultipartJsonFields } = require('../helpers/util');

router.post('/add', upload.single('file'), parseMultipartJsonFields, customNotificationController.add)
router.post('/list', customNotificationController.list)
router.post('/view', customNotificationController.view)
// router.post('/update', customNotificationController.update)
router.post('/delete', customNotificationController.delete)
router.post('/logList', customNotificationController.logList)

module.exports = router;    