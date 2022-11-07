const middleware = require('@blocklet/sdk/lib/middlewares');
const router = require('express').Router();
const explorer = require('../libs/explorer')

router.use('/user', middleware.user(), (req, res) => {
  res.json(req.user || {})
});

router.use('/txs', middleware.user(), explorer);

module.exports = router;
