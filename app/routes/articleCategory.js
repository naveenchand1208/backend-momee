const express = require('express')
const router = express.Router()
const articleCategoryController = require('../controllers/articleCategory')
const upload = require('../helpers/multer');

router.post('/add', upload.single('file'), articleCategoryController.add)
router.post('/list', articleCategoryController.list)
router.post('/view', articleCategoryController.view)
router.post('/update', upload.single('file'), articleCategoryController.update)
router.post('/delete', articleCategoryController.delete)
router.post('/indexScript', articleCategoryController.indexScript)
router.post('/updateIndex', articleCategoryController.updateIndex)
router.post('/updateArticleCategoryImage', upload.single('file'), articleCategoryController.updateArticleCategoryImage)


module.exports = router;    