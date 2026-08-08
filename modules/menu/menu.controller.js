import * as menuService from "./menu.service.js";

export const getTrending = async (req, res) => {
  const result = await menuService.getTrendingFoods();
  res.send(result);
};

export const getTopRated = async (req, res) => {
  const result = await menuService.getTopRatedFoods();
  res.send(result);
};

export const getAll = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 9;
  const search = req.query.search || "";
  const category = req.query.category || "";
  const minPrice = parseInt(req.query.minPrice) || 0;
  const maxPrice = parseInt(req.query.maxPrice) || 10000;
  const sort = req.query.sort || "newest";

  const result = await menuService.getAllFoods(
    page,
    limit,
    search,
    category,
    minPrice,
    maxPrice,
    sort,
  );
  res.send(result);
};

export const getById = async (req, res) => {
  try {
    const id = req.params.id;
    console.log(id);

    const result = await menuService.getFoodById(id);

    if (!result) {
      return res.status(404).send({ message: "Food item not found" });
    }

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error fetching details" });
  }
};

export const getSellerMenu = async (req, res) => {
  const email = req.params.email;
  const { limit = 0, sort } = req.query;

  if (email !== req.token_email) {
    return res.status(403).send({ message: "Forbidden access" });
  }

  const result = await menuService.getSellerMenu(email, limit, sort);
  res.send(result);
};

export const addFood = async (req, res) => {
  try {
    const item = req.body;
    const email = req.token_email; // Get email from the valid token

    const result = await menuService.addFood(item, email);

    if (result.error) {
      return res.status(result.status).send({ message: result.message });
    }

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Failed to add food item" });
  }
};

export const updateFood = async (req, res) => {
  const item = req.body;
  const id = req.params.id;
  const result = await menuService.updateFood(id, item);
  res.send(result);
};

export const deleteFood = async (req, res) => {
  const id = req.params.id;
  const email = req.token_email;

  const result = await menuService.deleteFood(id, email);

  if (result.error) {
    return res.status(result.status).send({ message: result.message });
  }

  res.send(result);
};
