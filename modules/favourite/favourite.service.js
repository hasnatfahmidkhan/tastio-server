import { favouriteCollection } from "../../config/db.js";
import { ObjectId } from "mongodb";

export const getFavourites = async (email, tokenEmail) => {
  const filter = {};
  if (email) {
    if (email !== tokenEmail) {
      return { error: true, status: 403, message: "forbidden access" };
    }
    filter.email = email;
  }
  const result = await favouriteCollection.find(filter).toArray();
  return result;
};

export const addFavourite = async (favourite) => {
  const result = await favouriteCollection.insertOne(favourite);
  return result;
};

export const deleteFavourite = async (id) => {
  const filter = { _id: new ObjectId(id) };
  const result = await favouriteCollection.deleteOne(filter);
  return result;
};
