const express = require('express')
const router = express.Router()
const batchController = require('../controllers/batch')
const upload = require('../helpers/multer');

router.post('/add', upload.single('file'), batchController.add)
router.post('/list', batchController.list)
router.post('/view', batchController.view)
router.post('/update', upload.single('file'), batchController.update)
router.post('/delete', batchController.delete)

module.exports = router;    