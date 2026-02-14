const refreshController = require("../controllers/refreshController");
const express = require("express");
const router = express.Router();

router.post("/", refreshController);

module.exports = router;
