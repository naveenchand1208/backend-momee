const express = require('express')
const router = express.Router()
const adminChatController = require('../controllers/adminChat')

router.post('/add', adminChatController.add)
router.post('/list', adminChatController.list)
router.post('/view', adminChatController.view)

module.exports = router;    