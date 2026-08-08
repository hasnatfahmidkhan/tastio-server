import * as restaurantService from "./restaurant.service.js";

export const getAll = async (req, res) => {
  const status = req.query.status;
  const search = req.query.search || "";
  const result = await restaurantService.getRestaurants(status, search);
  res.send(result);
};

export const getFeatured = async (req, res) => {
  const result = await restaurantService.getFeaturedRestaurants();
  res.send(result);
};

export const getById = async (req, res) => {
  const id = req.params.id;
  const result = await restaurantService.getRestaurantById(id);

  if (!result) {
    return res.status(404).send({ message: "Restaurant not found" });
  }

  res.send(result);
};

export const remove = async (req, res) => {
  const id = req.params.id;
  const result = await restaurantService.deleteRestaurant(id);
  res.send(result);
};

export const getSellerRestaurant = async (req, res) => {
  const email = req.params.email;
  const result = await restaurantService.getSellerRestaurant(email);
  res.send(result);
};

export const getStatus = async (req, res) => {
  const email = req.params.email;
  const result = await restaurantService.getApplicationStatus(email);
  res.send(result);
};

export const apply = async (req, res) => {
  const sellerRequest = req.body;
  const result = await restaurantService.applyForRestaurant(sellerRequest);
  res.send(result);
};

export const verify = async (req, res) => {
  const id = req.params.id;
  const { email } = req.body;
  const result = await restaurantService.verifyRestaurant(id, email);
  res.send(result);
};

export const reject = async (req, res) => {
  const id = req.params.id;
  const { reason } = req.body;
  const result = await restaurantService.rejectRestaurant(id, reason);
  res.send(result);
};
