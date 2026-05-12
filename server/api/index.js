const app = require("../app");

module.exports = (req, res) => {
  if (process.env.VERCEL && typeof req.originalUrl === "string") {
    req.url = req.originalUrl;
  }
  return app(req, res);
};
