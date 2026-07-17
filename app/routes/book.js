const express = require('express')
const router = express.Router()
const bookController = require('../controllers/book')
const upload = require('../helpers/multer');

router.post('/add', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'book', maxCount: 1 }]), bookController.add)
router.post('/list', bookController.list)
router.post('/view', bookController.view)
router.post('/update', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'book', maxCount: 1 }]), bookController.update)
router.post('/delete', bookController.delete)

module.exports = router;    