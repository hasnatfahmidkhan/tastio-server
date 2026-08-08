import { usersCollection } from "../config/db.js";

const verifyAdmin = async (req, res, next) => {
  try {
    const email = req.token_email;
    const user = await usersCollection.findOne({ email });

    if (!user || user.role !== "admin") {
      return res.status(403).send({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    res.status(500).send({ message: "Admin verification failed" });
  }
};

export default verifyAdmin;
