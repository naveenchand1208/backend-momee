const express = require('express')
const router = express.Router()
const dietFoodController = require('../controllers/dietFood')

router.post('/add', dietFoodController.add)
router.post('/list', dietFoodController.list)
router.post('/view', dietFoodController.view)
router.post('/update', dietFoodController.update)
router.post('/delete', dietFoodController.delete)
router.post('/dateWiseFoodList', dietFoodController.dateWiseFoodList)

module.exports = router;    