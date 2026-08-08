import * as categoryService from "./category.service.js";

export const getAll = async (req, res) => {
  const result = await categoryService.getAllCategories();
  res.send(result);
};

export const add = async (req, res) => {
  const category = req.body;
  const result = await categoryService.addCategory(category);
  res.send(result);
};

export const remove = async (req, res) => {
  const id = req.params.id;
  const result = await categoryService.deleteCategory(id);
  res.send(result);
};
