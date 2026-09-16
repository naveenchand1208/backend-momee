const express = require('express')
const router = express.Router()
const appUpdateController = require('../controllers/appUpdate')

router.post('/list', appUpdateController.list)
router.post('/update', appUpdateController.update)
router.post('/check', appUpdateController.check)

module.exports = router
