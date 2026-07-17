const express = require('express')
const router = express.Router()
const dietAvoidFoodController = require('../controllers/dietAvoidFood')

router.post('/add', dietAvoidFoodController.add)
router.post('/list', dietAvoidFoodController.list)
router.post('/view', dietAvoidFoodController.view)
router.post('/update', dietAvoidFoodController.update)
router.post('/delete', dietAvoidFoodController.delete)
router.post('/dateWiseFoodList', dietAvoidFoodController.dateWiseFoodList)

module.exports = router;    