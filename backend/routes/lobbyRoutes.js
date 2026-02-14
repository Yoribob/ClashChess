const { LobbyCreate } = require("../controllers/lobbyCreateController");
const { LobbyJoin } = require("../controllers/lobbyJoinController");
const express = require("express");
const router = express.Router();

router.post("/create", LobbyCreate);
router.post("/join", LobbyJoin);

module.exports = router;
