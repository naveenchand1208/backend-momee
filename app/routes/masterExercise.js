const express = require('express')
const router = express.Router()
const masterExerciseController = require('../controllers/masterExercise')
const upload = require('../helpers/multer');

router.post('/add', upload.single('file'), masterExerciseController.add)
router.post('/list', masterExerciseController.list)
router.post('/view', masterExerciseController.view)
router.post('/update', upload.single('file'), masterExerciseController.update)
router.post('/delete', masterExerciseController.delete)

module.exports = router;    