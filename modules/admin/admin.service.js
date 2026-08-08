import {
  reviewsCollection,
  usersCollection,
  menuCollection,
  restaurantsCollection,
} from "../../config/db.js";
import { ObjectId } from "mongodb";

export const getAdminReviews = async (search) => {
  const query = {
    $or: [
      { foodTitle: { $regex: search, $options: "i" } },
      { reviewerEmail: { $regex: search, $options: "i" } },
    ],
  };
  const result = await reviewsCollection
    .find(query)
    .sort({ postedAt: -1 })
    .toArray();
  return result;
};

export const deleteAdminReview = async (id) => {
  const query = { _id: new ObjectId(id) };
  const result = await reviewsCollection.deleteOne(query);
  return result;
};

export const getAdminStats = async () => {
  // 1. Basic Counts
  const users = await usersCollection.estimatedDocumentCount();
  const menuItems = await menuCollection.estimatedDocumentCount();
  const reviews = await reviewsCollection.estimatedDocumentCount();
  const sellers = await usersCollection.countDocuments({ role: "seller" });
  const pendingSellers = await restaurantsCollection.countDocuments({
    status: "pending",
  });

  // 2. Chart Data (Category Distribution)
  const chartData = await menuCollection
    .aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          name: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ])
    .toArray();

  return {
    users,
    menuItems,
    reviews,
    sellers,
    pendingSellers,
    chartData,
  };
};

export const getSellerStats = async (email, tokenEmail) => {
  if (email !== tokenEmail) {
    return { error: true, status: 403, message: "forbidden" };
  }

  const restaurant = await restaurantsCollection.findOne({
    ownerEmail: email,
  });
  const myFoods = await menuCollection.find({ sellerEmail: email }).toArray();

  const myFoodIds = myFoods.map((food) => food._id.toString());

  const stats = await reviewsCollection
    .aggregate([
      {
        $match: {
          menuId: { $in: myFoodIds },
        },
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          avgRating: { $avg: "$rating" },
        },
      },
    ])
    .toArray();

  const recentReviews = await reviewsCollection
    .find({
      menuId: { $in: myFoodIds },
    })
    .sort({ postedAt: -1 })
    .limit(3)
    .toArray();

  const reviewStats = stats[0] || { totalReviews: 0, avgRating: 0 };

  return {
    restaurantName: restaurant?.name,
    foodCount: myFoods.length,
    totalReviews: reviewStats.totalReviews,
    avgRating: reviewStats.avgRating.toFixed(1),
    recentReviews,
  };
};
