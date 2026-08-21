const express = require('express')
const router = express.Router()
const notificationController = require('../controllers/notification')

router.post('/list', notificationController.list)
router.post('/markRead', notificationController.markRead)
router.post('/delete', notificationController.delete)

module.exports = router;
