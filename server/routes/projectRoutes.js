import express from "express"
import { addMember, createProject, UpdateProject } from "../controllers/projectController.js";

const projectRouter = express.Router();

projectRouter.post('/', createProject)
projectRouter.put('/', UpdateProject)
projectRouter.post('/:projectId/addMember', addMember)

export default projectRouter