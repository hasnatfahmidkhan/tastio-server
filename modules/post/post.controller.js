import * as postService from "./post.service.js";

export const getLatest = async (req, res) => {
  const result = await postService.getLatestPosts();
  res.send(result);
};

export const getAll = async (req, res) => {
  const result = await postService.getAllPosts();
  res.send(result);
};

export const create = async (req, res) => {
  const post = req.body;
  const result = await postService.createPost(post);
  res.send(result);
};

export const toggleLike = async (req, res) => {
  const id = req.params.id;
  const email = req.token_email;

  const result = await postService.toggleLike(id, email);

  if (result.error) {
    return res.status(result.status).send({ message: result.message });
  }

  res.send(result);
};
