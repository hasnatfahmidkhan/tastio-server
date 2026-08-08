import admin from "../config/firebase.js";

const verifyFBToken = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({ message: "unauthorized acess" });
  }
  const token = authorization.split(" ")[1];
  const decoded = await admin.auth().verifyIdToken(token);

  req.token_email = decoded?.email;
  next();
};

export default verifyFBToken;
