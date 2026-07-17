const express = require('express')
const router = express.Router()
const paymentLogController = require('../controllers/paymentLog')

// router.post('/add', paymentLogController.add)
router.post('/list', paymentLogController.list)
router.post('/iosList', paymentLogController.iosList)
// router.post('/update', paymentLogController.update)
// router.post('/delete', paymentLogController.delete)

module.exports = router;    