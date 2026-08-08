import { menuCollection, restaurantsCollection } from "../../config/db.js";
import { ObjectId } from "mongodb";

export const getTrendingFoods = async () => {
  const result = await menuCollection
    .find()
    .sort({ reviewCount: -1 }) // Sort by most reviewed
    .limit(8) // Get top 8 items
    .toArray();

  return result;
};

export const getTopRatedFoods = async () => {
  const result = await menuCollection
    .find()
    .sort({ averageRating: -1 }) // Highest rating first
    .limit(8)
    .toArray();

  return result;
};

export const getAllFoods = async (
  page,
  limit,
  search,
  category,
  minPrice,
  maxPrice,
  sort,
) => {
  const skip = (page - 1) * limit;

  let query = {
    name: { $regex: search, $options: "i" },
    price: { $gte: minPrice, $lte: maxPrice },
  };

  if (category && category !== "All") {
    query.category = category;
  }

  // Sorting Logic
  let sortOptions = {};
  if (sort === "price-asc") sortOptions = { price: 1 };
  else if (sort === "price-desc") sortOptions = { price: -1 };
  else sortOptions = { _id: -1 };

  const result = await menuCollection
    .find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .toArray();

  const total = await menuCollection.countDocuments(query);

  return { result, total };
};

export const getFoodById = async (id) => {
  // 1. Find the Food Item
  const foodQuery = { _id: new ObjectId(id) };
  const foodItem = await menuCollection.findOne(foodQuery);

  if (!foodItem) {
    return null;
  }

  // 2. Find the Restaurant Details using the 'restaurantId' from the food item
  const restaurantQuery = { _id: new ObjectId(foodItem.restaurantId) };
  const restaurant = await restaurantsCollection.findOne(restaurantQuery);

  // 3. Combine them into one object
  const result = {
    ...foodItem, // Spread all food properties (name, price, image, etc.)
    restaurant: restaurant || {}, // Add a new property 'restaurant' with the details
  };

  return result;
};

export const getSellerMenu = async (email, limit, sort) => {
  let sortOptions = {};
  if (sort) {
    sortOptions = { price: -1 };
  }
  const query = { sellerEmail: email };
  const result = await menuCollection
    .find(query)
    .limit(Number(limit))
    .sort(sortOptions)
    .toArray();

  return result;
};

export const addFood = async (item, email) => {
  // 1. Find the restaurant associated with this Seller
  const restaurant = await restaurantsCollection.findOne({
    ownerEmail: email,
  });

  if (!restaurant) {
    return {
      error: true,
      status: 404,
      message: "Restaurant not found. Please register as a seller first.",
    };
  }

  // 2. Construct the Food Object
  // We strictly take the restaurantId from the database, not the frontend, for security.
  const newItem = {
    name: item.name,
    price: parseFloat(item.price), // Ensure it's stored as a Number
    category: item.category,
    description: item.description,
    image: item.image,

    // Auto-filled System Fields
    restaurantId: restaurant._id.toString(),
    restaurantName: restaurant.restaurantName,
    sellerEmail: email,
    addedAt: new Date(),

    // Default Stats
    reviewCount: 0,
    averageRating: 0,
  };

  const result = await menuCollection.insertOne(newItem);
  return result;
};

export const updateFood = async (id, item) => {
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: {
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description,
      image: item.image,
    },
  };
  const result = await menuCollection.updateOne(filter, updatedDoc);
  return result;
};

export const deleteFood = async (id, email) => {
  const query = { _id: new ObjectId(id) };
  const food = await menuCollection.findOne(query);

  if (food.sellerEmail !== email) {
    return { error: true, status: 403, message: "forbidden action" };
  }

  const result = await menuCollection.deleteOne(query);
  return result;
};
