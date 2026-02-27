function errorHandler(err, req, res, next) {
  switch (err.code) {
    case "USER_EXISTS":
    case "EMAIL_EXISTS":
      return res.status(409).json({ msg: err.message });
    case "INVALID_EMAIL":
    case "INVALID_USERNAME":
    case "INVALID_PASSWORD":
      return res.status(400).json({ msg: err.message });
    case "LOGIN_FAILED":
      return res.status(401).json({ msg: err.message });

    case "MISSING_USERID":
    case "MISSING_LOBBYID":
      return res.status(400).json({ msg: err.message });
    case "LOBBY_FULL":
      return res.status(409).json({ msg: err.message });
    case "USER_ALREADY_IN_LOBBY":
      return res.status(409).json({ msg: err.message });
    case "LOBBY_NOT_FOUND":
      return res.status(404).json({ msg: err.message });

    default:
      console.error(err);
      return res.status(500).json({ msg: "Internal server error" });
  }
}

module.exports = errorHandler;