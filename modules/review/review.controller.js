import * as reviewService from "./review.service.js";

export const getLatest = async (req, res) => {
  try {
    const result = await reviewService.getLatestReviews();
    res.status(200).send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error fetching latest reviews" });
  }
};

export const getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const search = req.query.search || "";
    const rating = req.query.rating;
    const sort = req.query.sort || "newest";

    const result = await reviewService.getAllReviews(
      page,
      limit,
      search,
      rating,
      sort,
    );
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error fetching reviews" });
  }
};

export const getById = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await reviewService.getReviewById(id);

    if (!result) {
      return res.status(404).send({ message: "Review not found" });
    }

    res.status(200).send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error fetching review details" });
  }
};

export const getMyReviews = async (req, res) => {
  const email = req.query.email;
  const limit = req.query.limit;
  const tokenEmail = req.token_email;

  const result = await reviewService.getMyReviews(email, limit, tokenEmail);

  if (result.error) {
    return res.status(result.status).send({ message: result.message });
  }
  res.status(200).send(result);
};

export const create = async (req, res) => {
  const newReview = req.body;
  const tokenEmail = req.token_email;

  const result = await reviewService.createReview(newReview, tokenEmail);

  if (result.error) {
    return res.status(result.status).send({ message: result.message });
  }

  res.status(200).send(result);
};

export const update = async (req, res) => {
  const id = req.params.id;
  const updateData = req.body;
  const result = await reviewService.updateReview(id, updateData);
  res.status(200).send(result);
};

export const remove = async (req, res) => {
  const id = req.params.id;
  const result = await reviewService.deleteReview(id);
  res.status(200).send(result);
};

export const getLeaderboard = async (req, res) => {
  const { limit } = req.query;
  const result = await reviewService.getLeaderboard(limit);
  res.send(result);
};
