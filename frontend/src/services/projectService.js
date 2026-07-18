import { projectApi } from '../api';

export class ProjectService {
  static async getProjects(page = 0, size = 10) {
    return projectApi.getAll(page, size);
  }

  static async getProject(id) {
    return projectApi.getById(id);
  }

  static async createProject(data) {
    return projectApi.create(data);
  }

  static async updateProject(id, data) {
    return projectApi.update(id, data);
  }

  static async deleteProject(id) {
    return projectApi.delete(id);
  }

  static async getBoards(projectId) {
    return projectApi.getBoards(projectId);
  }

  static async getTasks(projectId, params) {
    return projectApi.getTasks(projectId, params);
  }
}
