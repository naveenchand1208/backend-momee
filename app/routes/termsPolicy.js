const express = require('express')
const router = express.Router()
const termsController = require('../controllers/termsPolicy')

router.post('/add', termsController.add)
router.post('/list', termsController.list)
router.post('/view', termsController.view)
router.post('/update', termsController.update)
router.post('/delete', termsController.delete)

module.exports = router;    