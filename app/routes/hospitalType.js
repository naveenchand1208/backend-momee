const express = require('express')
const router = express.Router()
const hospitalsTypeController = require('../controllers/hospitalType')

router.post('/add', hospitalsTypeController.add)
router.post('/list', hospitalsTypeController.list)
router.post('/view', hospitalsTypeController.view)
router.post('/update', hospitalsTypeController.update)
router.post('/delete', hospitalsTypeController.delete)

module.exports = router;    