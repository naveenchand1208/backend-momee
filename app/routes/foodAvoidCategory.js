const express = require('express')
const router = express.Router()
const foodAvoidCategoryController = require('../controllers/foodAvoidCategory')
const upload = require('../helpers/multer');

router.post('/add', upload.single('file'), foodAvoidCategoryController.add)
router.post('/list', foodAvoidCategoryController.list)
router.post('/view', foodAvoidCategoryController.view)
router.post('/update', upload.single('file'), foodAvoidCategoryController.update)
router.post('/delete', foodAvoidCategoryController.delete)
router.post('/indexScript', foodAvoidCategoryController.indexScript)
router.post('/updateIndex', foodAvoidCategoryController.updateIndex)

module.exports = router;    