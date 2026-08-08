import { usersCollection } from "../config/db.js";

const verifySeller = async (req, res, next) => {
  try {
    const email = req.token_email;

    const user = await usersCollection.findOne({ email: email });

    if (!user || user.role !== "seller") {
      return res.status(403).send({ message: "Seller access required" });
    }

    next();
  } catch (error) {
    res.status(500).send({ message: "Seller verification failed" });
  }
};

export default verifySeller;
