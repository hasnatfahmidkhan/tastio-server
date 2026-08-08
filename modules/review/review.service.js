import {
  reviewsCollection,
  menuCollection,
  restaurantsCollection,
} from "../../config/db.js";
import { ObjectId } from "mongodb";

export const getLatestReviews = async () => {
  const result = await reviewsCollection
    .aggregate([
      { $sort: { postedAt: -1 } },
      { $limit: 4 },
      {
        $addFields: {
          restaurantObjId: { $toObjectId: "$restaurantId" },
        },
      },
      {
        $lookup: {
          from: "restaurants",
          localField: "restaurantObjId",
          foreignField: "_id",
          as: "resDetails",
        },
      },
      {
        $unwind: {
          path: "$resDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          foodName: 1,
          reviewText: 1,
          rating: 1,
          postedAt: 1,
          reviewerName: 1,
          reviewerPhoto: 1,
          photo: 1,
          restaurantId: 1,
          restaurantName: "$resDetails.restaurantName",
          location: "$resDetails.location",
        },
      },
    ])
    .toArray();

  return result;
};

export const getAllReviews = async (page, limit, search, rating, sort) => {
  const skip = (page - 1) * limit;

  let matchQuery = {
    $or: [
      { foodName: { $regex: search, $options: "i" } },
      { reviewText: { $regex: search, $options: "i" } },
    ],
  };

  if (rating && rating !== "All") {
    matchQuery.rating = { $gte: parseInt(rating) };
  }

  let sortOptions = {};
  if (sort === "newest") sortOptions = { postedAt: -1 };
  else if (sort === "oldest") sortOptions = { postedAt: 1 };
  else if (sort === "rating-desc") sortOptions = { rating: -1 };
  else if (sort === "rating-asc") sortOptions = { rating: 1 };

  const result = await reviewsCollection
    .aggregate([
      { $match: matchQuery },
      { $sort: sortOptions },
      { $skip: skip },
      { $limit: limit },
      {
        $addFields: {
          restaurantObjId: { $toObjectId: "$restaurantId" },
        },
      },
      {
        $lookup: {
          from: "restaurants",
          localField: "restaurantObjId",
          foreignField: "_id",
          as: "resDetails",
        },
      },
      {
        $unwind: {
          path: "$resDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          foodName: 1,
          reviewText: 1,
          rating: 1,
          postedAt: 1,
          reviewerName: 1,
          reviewerPhoto: 1,
          photo: 1,
          restaurantId: 1,
          restaurantName: "$resDetails.restaurantName",
          location: "$resDetails.location",
        },
      },
    ])
    .toArray();

  const total = await reviewsCollection.countDocuments(matchQuery);

  return { result, total };
};

export const getReviewById = async (id) => {
  const result = await reviewsCollection
    .aggregate([
      { $match: { _id: new ObjectId(id) } },
      {
        $addFields: {
          restaurantObjId: { $toObjectId: "$restaurantId" },
        },
      },
      {
        $lookup: {
          from: "restaurants",
          localField: "restaurantObjId",
          foreignField: "_id",
          as: "resDetails",
        },
      },
      {
        $unwind: {
          path: "$resDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          foodName: 1,
          reviewText: 1,
          rating: 1,
          postedAt: 1,
          reviewerName: 1,
          reviewerEmail: 1,
          reviewerPhoto: 1,
          photo: 1,
          restaurantId: 1,
          restaurantName: "$resDetails.restaurantName",
          location: "$resDetails.location",
        },
      },
    ])
    .toArray();

  if (result.length === 0) {
    return null;
  }
  return result[0];
};

export const getMyReviews = async (email, limit, tokenEmail) => {
  const filter = {};
  if (email === tokenEmail) {
    if (email !== tokenEmail) {
      return { error: true, status: 403, message: "forbidden access" };
    } else {
      filter.reviewerEmail = email;
    }
  }
  const result = await reviewsCollection
    .find(filter)
    .sort({ postedAt: -1 })
    .limit(Number(limit))
    .toArray();
  return result;
};

export const createReview = async (newReview, tokenEmail) => {
  if (tokenEmail !== newReview.reviewerEmail) {
    return { error: true, status: 403, message: "forbidden action" };
  }

  const result = await reviewsCollection.insertOne({
    ...newReview,
  });

  // update the menu
  await menuCollection.updateOne({ _id: new ObjectId(newReview.menuId) }, [
    {
      $set: {
        totalReviews: { $add: [{ $ifNull: ["$totalReviews", 0] }, 1] },
        averageRating: {
          $divide: [
            {
              $add: [
                {
                  $multiply: [
                    { $ifNull: ["$averageRating", 0] },
                    { $ifNull: ["$totalReviews", 0] },
                  ],
                },
                newReview.rating,
              ],
            },
            { $add: [{ $ifNull: ["$totalReviews", 0] }, 1] },
          ],
        },
      },
    },
  ]);

  return result;
};

export const updateReview = async (id, updateData) => {
  const filter = { _id: new ObjectId(id) };
  const { _id, ...update } = updateData;
  const result = await reviewsCollection.updateOne(filter, { $set: update });
  return result;
};

export const deleteReview = async (id) => {
  const filter = { _id: new ObjectId(id) };
  const result = await reviewsCollection.deleteOne(filter);
  return result;
};

export const getLeaderboard = async (limit) => {
  const pipeline = [
    { $group: { _id: "$reviewerEmail", totalReviews: { $sum: 1 } } },
    { $sort: { totalReviews: -1 } },
    ...(limit ? [{ $limit: Number(limit) }] : []),
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "email",
        as: "userInfo",
      },
    },
    { $unwind: "$userInfo" },
    {
      $project: {
        _id: 0,
        reviewerEmail: "$_id",
        name: "$userInfo.name",
        photo: "$userInfo.photo",
        totalReviews: 1,
      },
    },
  ];

  const result = await reviewsCollection.aggregate(pipeline).toArray();
  return result;
};
