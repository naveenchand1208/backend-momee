const express = require('express')
const router = express.Router()
const sosController = require('../controllers/sosRequests')

router.post('/addSosMember', sosController.addSosMember)
router.post('/addSosRequest', sosController.addSosRequest)
router.post('/sosRequestList', sosController.sosRequestList)
router.post('/deleteSosMember', sosController.deleteSosMember)
module.exports = router;    
