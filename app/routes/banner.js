const express = require('express')
const router = express.Router()
const bannerController = require('../controllers/banner')
const upload = require('../helpers/multer');

router.post('/add', upload.single('file'), bannerController.add)
router.post('/list', bannerController.list)
router.post('/view', bannerController.view)
router.post('/update', upload.single('file'), bannerController.update)
router.post('/delete', bannerController.delete)

module.exports = router;    