const express = require('express')
const router = express.Router()
const bumbCountController = require('../controllers/bumbCount')

router.post('/add', bumbCountController.add)
router.post('/list', bumbCountController.list)
router.post('/view', bumbCountController.view)
router.post('/update', bumbCountController.update)
router.post('/delete', bumbCountController.delete)
router.post('/getBumpCountReport', bumbCountController.getBumpCountReport)

module.exports = router;    