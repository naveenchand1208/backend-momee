const express = require('express')
const router = express.Router()
const musicController = require('../controllers/music')
const upload = require('../helpers/multer');

router.post('/add', upload.single('file'), musicController.add)
router.post('/list', musicController.list)
router.post('/view', musicController.view)
router.post('/update', upload.single('file'), musicController.update)
router.post('/delete', musicController.delete)
router.post('/addPlayList', upload.single('file'), musicController.addPlayList)
router.post('/viewPlayList', musicController.viewPlayList)
router.post('/updatePlayList', upload.single('file'), musicController.updatePlayList)
router.post('/deletePlayList', musicController.deletePlayList)

module.exports = router;    