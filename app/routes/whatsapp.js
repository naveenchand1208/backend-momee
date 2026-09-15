const express = require('express')
const router = express.Router()
const whatsappController = require('../controllers/whatsapp')

router.get('/connect', whatsappController.connect)
router.get('/callback', whatsappController.callback)

module.exports = router;
