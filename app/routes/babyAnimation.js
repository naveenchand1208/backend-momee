const express = require('express')
const router = express.Router()
const babyAnimationController = require('../controllers/babyAnimation')
const upload = require('../helpers/multer');

router.post('/add', upload.single('file'), babyAnimationController.add)
router.post('/list', babyAnimationController.list)
router.post('/view', babyAnimationController.view)
router.post('/update', upload.single('file'), babyAnimationController.update)
router.post('/delete', babyAnimationController.delete)

module.exports = router;    