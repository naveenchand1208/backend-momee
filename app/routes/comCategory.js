const express = require('express')
const router = express.Router()
const comCategoryController = require('../controllers/comCategory')
const upload = require('../helpers/multer');

router.post('/add', upload.single('file'), comCategoryController.add)
router.post('/list', comCategoryController.list)
router.post('/view', comCategoryController.view)
router.post('/update', upload.single('file'), comCategoryController.update)
router.post('/delete', comCategoryController.delete)

module.exports = router;    