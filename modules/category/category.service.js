import { categoriesCollection } from "../../config/db.js";
import { ObjectId } from "mongodb";

export const getAllCategories = async () => {
  const result = await categoriesCollection
    .aggregate([
      {
        $lookup: {
          from: "menu", // Join with menu collection
          localField: "name", // Category name (e.g. "Burger")
          foreignField: "category", // Menu category field
          as: "foods",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          image: 1,
          count: { $size: "$foods" }, // Count how many foods matched
        },
      },
    ])
    .toArray();

  return result;
};

export const addCategory = async (category) => {
  const result = await categoriesCollection.insertOne(category);
  return result;
};

export const deleteCategory = async (id) => {
  const result = await categoriesCollection.deleteOne({
    _id: new ObjectId(id),
  });
  return result;
};
