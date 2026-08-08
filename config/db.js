import { MongoClient, ServerApiVersion } from "mongodb";
import "dotenv/config";

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qk2ebsj.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const tastioDB = client.db("tastioDB");

export const usersCollection = tastioDB.collection("users");
export const reviewsCollection = tastioDB.collection("reviews");
export const favouriteCollection = tastioDB.collection("favourite");
export const restaurantsCollection = tastioDB.collection("restaurants");
export const menuCollection = tastioDB.collection("menu");
export const postsCollection = tastioDB.collection("post");
export const categoriesCollection = tastioDB.collection("categories");

export default client;
