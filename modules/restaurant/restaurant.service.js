import {
  restaurantsCollection,
  menuCollection,
  usersCollection,
} from "../../config/db.js";
import { ObjectId } from "mongodb";

export const getRestaurants = async (status, search) => {
  let query = {};

  // 1. Filter by Status (pending, verified, rejected)
  if (status) {
    query.status = status;
  }

  // 2. Search by Name or Location (Case Insensitive)
  if (search) {
    query.$or = [
      { restaurantName: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
    ];
  }

  const result = await restaurantsCollection.find(query).toArray();
  return result;
};

export const getFeaturedRestaurants = async () => {
  const result = await restaurantsCollection
    .find({ status: "verified" })
    .limit(10)
    .toArray();
  return result;
};

export const getRestaurantById = async (id) => {
  // 1. Get Restaurant Info
  const restaurant = await restaurantsCollection.findOne({
    _id: new ObjectId(id),
  });

  if (!restaurant) {
    return null;
  }

  // 2. Get Menu Items for this Restaurant
  const menu = await menuCollection
    .find({ sellerEmail: restaurant.ownerEmail })
    .toArray();

  return { restaurant, menu };
};

export const deleteRestaurant = async (id) => {
  const query = { _id: new ObjectId(id) };
  const result = await restaurantsCollection.deleteOne(query);
  return result;
};

export const getSellerRestaurant = async (email) => {
  const query = { ownerEmail: email };
  const result = await restaurantsCollection.findOne(query);
  return result;
};

export const getApplicationStatus = async (email) => {
  const query = { ownerEmail: email };
  const result = await restaurantsCollection.findOne(query);
  return result || { status: null };
};

export const applyForRestaurant = async (sellerRequest) => {
  // Check if a rejected application exists for this email
  const existing = await restaurantsCollection.findOne({
    ownerEmail: sellerRequest.ownerEmail,
  });

  if (existing) {
    // If pending or verified, don't let them apply again
    if (existing.status === "pending" || existing.status === "verified") {
      return {
        isExits: true,
        message: "Application already exists",
      };
    }

    // If rejected, UPDATE the existing document instead of inserting new
    if (existing.status === "rejected") {
      const filter = { ownerEmail: sellerRequest.ownerEmail };
      const updateDoc = { $set: sellerRequest }; // Update with new data
      const result = await restaurantsCollection.updateOne(filter, updateDoc);
      return { insertedId: result.modifiedCount }; // Mimic insert response
    }
  }

  // Standard Insert for new users
  const result = await restaurantsCollection.insertOne(sellerRequest);
  return result;
};

export const verifyRestaurant = async (id, email) => {
  const filterRestaurant = { _id: new ObjectId(id) };
  const updateRestaurant = {
    $set: { status: "verified" },
  };
  const restaurantResult = await restaurantsCollection.updateOne(
    filterRestaurant,
    updateRestaurant,
  );

  const filterUser = { email: email };
  const updateUser = {
    $set: { role: "seller" },
  };
  const userResult = await usersCollection.updateOne(filterUser, updateUser);

  return { restaurantResult, userResult };
};

export const rejectRestaurant = async (id, reason) => {
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      status: "rejected",
      rejectionReason: reason || "Application does not meet requirements.",
    },
  };

  const result = await restaurantsCollection.updateOne(filter, updateDoc);
  return result;
};
