const express = require('express')
const router = express.Router()
const assetsController = require('../controllers/assets')
const upload = require('../helpers/multer');

router.post('/add', upload.single('file'), assetsController.add)
router.post('/list', assetsController.list)
router.post('/view', assetsController.view)
router.post('/update', upload.single('file'), assetsController.update)
router.post('/delete', assetsController.delete)

module.exports = router;    