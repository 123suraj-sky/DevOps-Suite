import { taskApi } from '../api';

export class TaskService {
  static async getTask(id) {
    return taskApi.getById(id);
  }

  static async createTask(data) {
    return taskApi.create(data);
  }

  static async updateTask(id, data) {
    return taskApi.update(id, data);
  }

  static async updateTaskStatus(id, status) {
    return taskApi.updateStatus(id, status);
  }

  static async deleteTask(id) {
    return taskApi.delete(id);
  }

  static async reorderTasks(projectId, boardId, tasks) {
    return taskApi.reorder(projectId, boardId, tasks);
  }
}
