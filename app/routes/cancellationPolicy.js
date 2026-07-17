const express = require('express')
const router = express.Router()
const cancellationPolicyController = require('../controllers/cancellationPolicy')

router.post('/add', cancellationPolicyController.add)
router.post('/list', cancellationPolicyController.list)
router.post('/view', cancellationPolicyController.view)
router.post('/update', cancellationPolicyController.update)
router.post('/delete', cancellationPolicyController.delete)

module.exports = router;    