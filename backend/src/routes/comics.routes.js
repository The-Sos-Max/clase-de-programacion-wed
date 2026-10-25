
import { Router } from "express";
import {
  crearComic,
  listarComics,
  obtenerComic,
  actualizarComic,
  eliminarComic
} from "../controllers/comics.controller.js";

const router = Router();

router.post("/", crearComic);
router.get("/", listarComics);
router.get("/:id", obtenerComic);

// Nuevas rutas
router.put("/:id", actualizarComic);
router.delete("/:id", eliminarComic);

export default router;
