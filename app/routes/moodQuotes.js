const express = require('express')
const router = express.Router()
const moodQuotesController = require('../controllers/moodQuotes')

router.post('/add', moodQuotesController.add)
router.post('/list', moodQuotesController.list)
router.post('/view', moodQuotesController.view)
router.post('/update', moodQuotesController.update)
router.post('/delete', moodQuotesController.delete)

module.exports = router;    