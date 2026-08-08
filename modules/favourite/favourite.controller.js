import * as favouriteService from "./favourite.service.js";

export const getAll = async (req, res) => {
  const email = req.query.email;
  const tokenEmail = req.token_email;

  const result = await favouriteService.getFavourites(email, tokenEmail);

  if (result.error) {
    return res.status(result.status).send({ message: result.message });
  }

  res.status(200).send(result);
};

export const add = async (req, res) => {
  const favourite = req.body;
  const result = await favouriteService.addFavourite(favourite);
  res.status(200).send(result);
};

export const remove = async (req, res) => {
  const id = req.params.id;
  const result = await favouriteService.deleteFavourite(id);
  res.send(result);
};
