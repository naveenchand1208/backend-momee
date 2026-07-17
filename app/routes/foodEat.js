const express = require('express')
const router = express.Router()
const foodEatController = require('../controllers/foodEat')
const upload = require('../helpers/multer');

router.post('/add', upload.single('file'), foodEatController.add)
router.post('/list', foodEatController.list)
router.post('/view', foodEatController.view)
router.post('/update', upload.single('file'), foodEatController.update)
router.post('/delete', foodEatController.delete)

module.exports = router;    