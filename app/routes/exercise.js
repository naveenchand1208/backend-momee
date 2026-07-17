const express = require('express')
const router = express.Router()
const exerciseController = require('../controllers/exercise')
const upload = require('../helpers/multer');

router.post('/add', upload.single('file'), exerciseController.add)
router.post('/list', exerciseController.list)
router.post('/view', exerciseController.view)
router.post('/update', upload.single('file'), exerciseController.update)
router.post('/delete', exerciseController.delete)
router.post('/addExercise', upload.single('file'), exerciseController.addExercise)
router.post('/viewExercise', exerciseController.viewExercise)
router.post('/updateExercise', upload.single('file'), exerciseController.updateExercise)
router.post('/deleteExercise', exerciseController.deleteExercise)

module.exports = router;    