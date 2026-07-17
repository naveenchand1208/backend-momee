const express = require('express')
const router = express.Router()
const foodEatCategoryController = require('../controllers/foodEatCategory')
const upload = require('../helpers/multer');

router.post('/add', upload.single('file'), foodEatCategoryController.add)
router.post('/list', foodEatCategoryController.list)
router.post('/view', foodEatCategoryController.view)
router.post('/update', upload.single('file'), foodEatCategoryController.update)
router.post('/delete', foodEatCategoryController.delete)
router.post('/indexScript', foodEatCategoryController.indexScript)
router.post('/indexScript', foodEatCategoryController.indexScript)
router.post('/updateIndex', foodEatCategoryController.updateIndex)

module.exports = router;    