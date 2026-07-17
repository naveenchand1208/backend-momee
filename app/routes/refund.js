const express = require('express')
const router = express.Router()
const refundController = require('../controllers/refund')

router.post('/add', refundController.add)
router.post('/list', refundController.list)
router.post('/view', refundController.view)
router.post('/update', refundController.update)
router.post('/delete', refundController.delete)

module.exports = router;    