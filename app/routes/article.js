const express = require('express')
const router = express.Router()
const articleController = require('../controllers/article')
const upload = require('../helpers/multer');

router.post('/add', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'banner', maxCount: 1 }])
    , articleController.add)
router.post('/list', articleController.list)
router.post('/view', articleController.view)
router.post('/update', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), articleController.update)
router.post('/delete', articleController.delete)
router.post('/saveArticle', articleController.saveArticle)
router.post('/savedArticlesList', articleController.savedArticlesList)
router.post('/deleteSavedArticle', articleController.deleteSavedArticle)
router.post('/script', articleController.script)
router.post('/indexScript', articleController.indexScript)
router.post('/updateIndex', articleController.updateIndex)
router.post('/updateArticleImage', upload.single('file'), articleController.updateArticleImage)
router.post('/articleSearchlist', articleController.articleSearchlist)

module.exports = router;    