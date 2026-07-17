const express = require('express')
const router = express.Router()
const mediaGalleryController = require('../controllers/mediaGallery')
const upload = require('../helpers/multer');

router.post('/add', mediaGalleryController.add)
router.post('/list', mediaGalleryController.list)
router.post('/view', mediaGalleryController.view)
router.post('/update', mediaGalleryController.update)
router.post('/delete', mediaGalleryController.delete)

module.exports = router;    