const express = require('express')
const router = express.Router()
const customExerciseController = require('../controllers/customExercise')

router.post('/add', customExerciseController.add)
router.post('/list', customExerciseController.list)
router.post('/view', customExerciseController.view)
router.post('/update', customExerciseController.update)
router.post('/delete', customExerciseController.delete)
router.post('/dateWiseExerciseList', customExerciseController.dateWiseExerciseList)

module.exports = router;    