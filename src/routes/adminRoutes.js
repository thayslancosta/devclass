const express = require('express');
const { listarUsuarios, alterarStatusUsuario } = require('../controllers/adminController');
const { autenticar, autorizar } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/usuarios', autenticar, autorizar('admin'), listarUsuarios);
router.patch('/usuarios/:id/status', autenticar, autorizar('admin'), alterarStatusUsuario);

module.exports = router;
