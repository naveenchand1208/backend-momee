const express = require('express')
const router = express.Router()
const babyNameController = require('../controllers/babyName')

router.post('/add', babyNameController.add)
router.post('/list', babyNameController.list)
router.post('/view', babyNameController.view)
router.post('/update', babyNameController.update)
router.post('/delete', babyNameController.delete)
router.post('/favoriteName', babyNameController.favoriteName)
router.post('/favoritesNamelist', babyNameController.favoritesNamelist)
router.post('/getFavorites', babyNameController.getFavorites)

module.exports = router;    