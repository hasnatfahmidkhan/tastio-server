import { postsCollection } from "../../config/db.js";
import { ObjectId } from "mongodb";

export const getLatestPosts = async () => {
  const result = await postsCollection
    .find()
    .sort({ date: -1 })
    .limit(3)
    .toArray();
  return result;
};

export const getAllPosts = async () => {
  const result = await postsCollection.find().sort({ date: -1 }).toArray();
  return result;
};

export const createPost = async (post) => {
  const result = await postsCollection.insertOne(post);
  return result;
};

export const toggleLike = async (id, email) => {
  const filter = { _id: new ObjectId(id) };
  const post = await postsCollection.findOne(filter);

  if (!post) {
    return { error: true, status: 404, message: "Post not found" };
  }

  const isLiked = post.likes?.includes(email);

  let updateDoc;
  if (isLiked) {
    updateDoc = { $pull: { likes: email } }; // Unlike
  } else {
    updateDoc = { $addToSet: { likes: email } }; // Like
  }

  const result = await postsCollection.updateOne(filter, updateDoc);
  return result;
};
