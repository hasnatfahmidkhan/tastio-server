import {
  usersCollection,
  reviewsCollection,
  restaurantsCollection,
  menuCollection,
} from "../../config/db.js";
import { ObjectId } from "mongodb";

export const getUserProfileStats = async (email) => {
  // 1. Basic User Info
  const user = await usersCollection.findOne({ email });

  // 2. Extra Stats based on Role
  let stats = {};

  if (user.role === "user") {
    const reviewCount = await reviewsCollection.countDocuments({
      reviewerEmail: email,
    });
    stats = { reviewCount };
  } else if (user.role === "seller") {
    const restaurant = await restaurantsCollection.findOne({
      ownerEmail: email,
    });
    const foodCount = await menuCollection.countDocuments({
      sellerEmail: email,
    });
    stats = {
      restaurantName: restaurant?.name || "No Shop",
      foodCount,
    };
  }

  return { user, stats };
};

export const getAllUsers = async (search, role) => {
  let query = {
    $or: [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ],
  };

  if (role && role !== "All") {
    query.role = role;
  }

  const result = await usersCollection.find(query).toArray();
  return result;
};

export const createUser = async (newUser) => {
  newUser.role = "user";
  newUser.status = "active";
  const filter = { email: newUser.email };
  const isExits = await usersCollection.findOne(filter);
  if (isExits) {
    console.log("user already exits");
    return { message: "user already exits", isExits: true };
  } else {
    const result = await usersCollection.insertOne({ ...newUser });
    return result;
  }
};

export const updateUserProfile = async (email, { name, photo }) => {
  const filter = { email: email };
  const updateDoc = {
    $set: {
      name: name,
      photo: photo,
    },
  };

  const result = await usersCollection.updateOne(filter, updateDoc);
  return result;
};

export const updateUserRole = async (id, role, requesterEmail) => {
  const query = { _id: new ObjectId(id) };
  const targetUser = await usersCollection.findOne(query);

  // 🔒 Security Check 1: Protected User Check (Dynamic)
  if (targetUser.isProtected) {
    return {
      error: true,
      status: 403,
      message: "Action Forbidden: This user is protected.",
    };
  }

  // 🔒 Security Check 2: Self Check
  if (requesterEmail === targetUser.email) {
    return {
      error: true,
      status: 403,
      message: "You cannot change your own role.",
    };
  }

  const updateDoc = { $set: { role: role } };
  const result = await usersCollection.updateOne(query, updateDoc);
  return result;
};

export const deleteUser = async (id) => {
  const query = { _id: new ObjectId(id) };
  const result = await usersCollection.deleteOne(query);
  return result;
};

export const getUserRole = async (email) => {
  const result = await usersCollection.findOne(
    { email: email },
    { projection: { role: 1, status: 1, _id: 0 } },
  );
  return result;
};
