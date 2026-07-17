const express = require('express')
const router = express.Router()
const privacyPolicyController = require('../controllers/privacyPolicy')

router.post('/add', privacyPolicyController.add)
router.post('/list', privacyPolicyController.list)
router.post('/view', privacyPolicyController.view)
router.post('/update', privacyPolicyController.update)
router.post('/delete', privacyPolicyController.delete)

module.exports = router;    