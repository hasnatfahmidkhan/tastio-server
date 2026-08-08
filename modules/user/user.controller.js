import * as userService from "./user.service.js";

export const getProfile = async (req, res) => {
  const email = req.params.email;
  if (email !== req.token_email)
    return res.status(403).send({ message: "forbidden" });

  const result = await userService.getUserProfileStats(email);
  res.send(result);
};

export const getAllUsers = async (req, res) => {
  const search = req.query.search || "";
  const role = req.query.role || ""; // "admin", "seller", "user"
  const result = await userService.getAllUsers(search, role);
  res.send(result);
};

export const updateProfile = async (req, res) => {
  const email = req.params.email;
  const { name, photo } = req.body;

  // Security check
  if (email !== req.token_email) {
    return res.status(403).send({ message: "Forbidden" });
  }

  const result = await userService.updateUserProfile(email, { name, photo });
  res.send(result);
};

export const updateRole = async (req, res) => {
  const id = req.params.id;
  const { role } = req.body;
  const requesterEmail = req.token_email;

  const result = await userService.updateUserRole(id, role, requesterEmail);

  if (result.error) {
    return res.status(result.status).send({ message: result.message });
  }

  res.send(result);
};

export const deleteUser = async (req, res) => {
  const id = req.params.id;
  const result = await userService.deleteUser(id);
  res.send(result);
};

export const getRole = async (req, res) => {
  const { email } = req.params;
  const result = await userService.getUserRole(email);
  res.status(200).json(result);
};

export const createUser = async (req, res) => {
  const newUser = req.body;
  const result = await userService.createUser(newUser);

  if (result.isExits) {
    return res.send({ message: result.message });
  }

  res.status(200).send(result);
};
