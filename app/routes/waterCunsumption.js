const express = require('express')
const router = express.Router()
const waterConsumptionCountController = require('../controllers/waterCunsumption')

router.post('/add', waterConsumptionCountController.add)
router.post('/list', waterConsumptionCountController.list)
router.post('/view', waterConsumptionCountController.view)
router.post('/update', waterConsumptionCountController.update)
router.post('/delete', waterConsumptionCountController.delete)
router.post('/timeBasedlist', waterConsumptionCountController.timeBasedlist)

module.exports = router;    