const express = require('express')
const router = express.Router()
const journeyController = require('../controllers/journey')
const upload = require('../helpers/multer');

router.post('/add', upload.single('file'), journeyController.add)
router.post('/list', journeyController.list)
router.post('/view', journeyController.view)
router.post('/update', upload.single('file'), journeyController.update)
router.post('/delete', journeyController.delete)

module.exports = router;    