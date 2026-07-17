const express = require('express')
const router = express.Router()
const reminderController = require('../controllers/reminder')
const upload = require('../helpers/multer');

router.post('/add', upload.single('file'), reminderController.add)
router.post('/list', reminderController.list)
router.post('/view', reminderController.view)
router.post('/update', upload.single('file'), reminderController.update)
router.post('/delete', reminderController.delete)
router.post('/dashboardDetails', reminderController.dashboardDetails)
router.post('/reminderClickCountUpdate', reminderController.reminderClickCountUpdate)

module.exports = router;    