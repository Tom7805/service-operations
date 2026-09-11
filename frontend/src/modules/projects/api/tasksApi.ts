import { apiClient } from '../../configs/apiclient';
import { API_PATHS } from '../../constants/apiPaths';

/**
 * Generic task API stub – other functions would exist in the real codebase.
 * Here we add the helper for setting the hour budget.
 */
export const setTaskHourBudget = (taskId: number, hourBudget?: number) =>
  apiClient.post(
    API_PATHS.TASK_HOUR_BUDGET.replace(':taskId', String(taskId)),
    { hourBudget }
  );

// Example placeholder for other task operations (create / update) –
// they are assumed to exist elsewhere in the project.
export const createTask = (payload: any) => apiClient.post(API_PATHS.TASK_CREATE, payload);
export const updateTask = (taskId: number, payload: any) =>
  apiClient.put(API_PATHS.TASK_UPDATE.replace(':taskId', String(taskId)), payload);
