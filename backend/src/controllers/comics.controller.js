import mongoose from "mongoose";
import Comic from "../models/Comic.js";
import Autor from "../models/Autor.js";

// POST /api/comics  → crear un cómic
export async function crearComic(req, res) {
  try {
    const { autor } = req.body;

    // Validamos que el autor referenciado exista
    if (!mongoose.isValidObjectId(autor) || !(await Autor.exists({ _id: autor }))) {
      return res.status(400).json({ mensaje: "El autor indicado no existe" });
    }

    const comic = await Comic.create(req.body);
    res.status(201).json(comic);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
}

// GET /api/comics  → listar cómics (con filtros opcionales)
export async function listarComics(req, res) {
  try {
    const filtro = {};
    if (req.query.editorial) filtro.editorial = req.query.editorial;
    if (req.query.autor) filtro.autor = req.query.autor;

    // Búsqueda por título (sin distinguir mayúsculas), escapando caracteres especiales
    if (req.query.titulo) {
      const textoSeguro = req.query.titulo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filtro.titulo = { $regex: textoSeguro, $options: "i" };
    }

    const comics = await Comic.find(filtro).populate("autor", "nombre nacionalidad");
    res.json(comics);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
}

// GET /api/comics/:id  → consultar un cómic por su id
export async function obtenerComic(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ mensaje: "ID inválido" });
    }

    const comic = await Comic.findById(id).populate(
      "autor",
      "nombre nacionalidad fechaNacimiento"
    );

    if (!comic) {
      return res.status(404).json({ mensaje: "Cómic no encontrado" });
    }

    res.json(comic);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
}

// PUT /api/comics/:id → actualizar un cómic
export async function actualizarComic(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ mensaje: "ID inválido" });
    }

    // Si se envía un autor nuevo, comprobar que exista
    if (req.body.autor !== undefined) {
      if (
        !mongoose.isValidObjectId(req.body.autor) ||
        !(await Autor.exists({ _id: req.body.autor }))
      ) {
        return res.status(400).json({ mensaje: "El autor indicado no existe" });
      }
    }

    const comic = await Comic.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    }).populate("autor", "nombre nacionalidad");

    if (!comic) {
      return res.status(404).json({ mensaje: "Cómic no encontrado" });
    }

    res.json(comic);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
}

// DELETE /api/comics/:id → eliminar un cómic
export async function eliminarComic(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ mensaje: "ID inválido" });
    }

    const comic = await Comic.findByIdAndDelete(id);

    if (!comic) {
      return res.status(404).json({ mensaje: "Cómic no encontrado" });
    }

    res.json({ mensaje: "Cómic eliminado correctamente", comic });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
}
