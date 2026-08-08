import * as adminService from "./admin.service.js";

export const getReviews = async (req, res) => {
  const search = req.query.search || "";
  const result = await adminService.getAdminReviews(search);
  res.send(result);
};

export const deleteReview = async (req, res) => {
  const id = req.params.id;
  const result = await adminService.deleteAdminReview(id);
  res.send(result);
};

export const getStats = async (req, res) => {
  const result = await adminService.getAdminStats();
  res.send(result);
};

export const getSellerStats = async (req, res) => {
  const email = req.params.email;
  const tokenEmail = req.token_email;

  const result = await adminService.getSellerStats(email, tokenEmail);

  if (result.error) {
    return res.status(result.status).send({ message: result.message });
  }

  res.send(result);
};
