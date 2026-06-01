export const BASE_URL = 'http://192.168.1.5:5000';

export const cleanId = (id) => {
  if (!id) return '';
  let s = String(id).trim();

  // Handle comma-separated IDs (take the first one)
  if (s.includes(',')) {
    s = s.split(',')[0].trim();
  }

  // Handle triple repetition bug (e.g. 202516202516202516)
  if (s.length >= 9 && s.length % 3 === 0) {
    const partLen = s.length / 3;
    const p1 = s.substring(0, partLen);
    const p2 = s.substring(partLen, partLen * 2);
    const p3 = s.substring(partLen * 2);
    if (p1 === p2 && p1 === p3) return p1;
  }

  // Handle double repetition bug (e.g. 202512202512)
  if (s.length >= 6 && s.length % 2 === 0) {
    const partLen = s.length / 2;
    const p1 = s.substring(0, partLen);
    const p2 = s.substring(partLen);
    if (p1 === p2) return p1;
  }

  return s;
};

export const API_ENDPOINTS = {
  LOGIN: `${BASE_URL}/api/login`,
  REGISTER: `${BASE_URL}/api/register`,
  PROFILE: (email) => `${BASE_URL}/api/profile/${email}`,
  MANAGER: (email) => `${BASE_URL}/api/profile/manager?email=${email}`,
  UPDATE_PROFILE: `${BASE_URL}/api/profile/update`,
  UPDATE_ABOUT: `${BASE_URL}/api/profile/about`,
  UPDATE_PASSWORD: `${BASE_URL}/api/profile/update-password`,
  REQUEST_OTP: `${BASE_URL}/api/password/request-otp`,
  RESET_PASSWORD_OTP: `${BASE_URL}/api/password/reset-with-otp`,
  CHANGE_PASSWORD: `${BASE_URL}/api/password/change-password`,
  EMPLOYEE_PROFILE: (id) => `${BASE_URL}/api/employee-profile/${cleanId(id)}`,
  MY_EMPLOYEE_PROFILE: `${BASE_URL}/api/employee-profile/my`,
  UPDATE_EMPLOYEE_PROFILE: `${BASE_URL}/api/employee-profile/update`,

  TEAMS: `${BASE_URL}/api/teams`,
  TEAM: (id) => `${BASE_URL}/api/subordinates/${cleanId(id)}`,
  USERS: `${BASE_URL}/api/users`,
  EMPLOYEES: `${BASE_URL}/api/employees`,
  ROSTER: (type) => `${BASE_URL}/api/roster/${type}`,
  NEW_JOINEE: `${BASE_URL}/api/new-joinee`,
  NEW_JOINEES_GET: `${BASE_URL}/api/new-joinees`,

  HOLIDAYS: `${BASE_URL}/api/holidays`,
  BIRTHDAYS: `${BASE_URL}/api/birthdays`,

  ASSIGN_TASK: `${BASE_URL}/api/master-task`,
  TASKS_ASSIGNED: (userId) => `${BASE_URL}/api/tasks/assigned/${cleanId(userId)}`,
  UPDATE_TASK_STATUS: (taskId) => `${BASE_URL}/api/tasks/status/${cleanId(taskId)}`,
  VERIFY_TASK: (taskId) => `${BASE_URL}/api/tasks/review/${cleanId(taskId)}`,
  TASK_UPDATES: `${BASE_URL}/api/task-updates`,
  TASK_UPDATES_USER: (userId) => `${BASE_URL}/api/task-updates?userId=${cleanId(userId)}`,
  TEAM_REPORTS: (managerId) => `${BASE_URL}/api/task-updates`,
  TASKS: `${BASE_URL}/api/tasks`,
  TASKS_BY_MANAGER: (managerId) => `${BASE_URL}/api/tasks/manager/${cleanId(managerId)}`,
  TASKS_BY_TEAM: (teamName) => `${BASE_URL}/api/tasks/team/${teamName}`,
  TASK_REVIEW: (id) => `${BASE_URL}/api/master-task/review/${cleanId(id)}`,
  TASKS_REVIEW: (id) => `${BASE_URL}/api/master-task/review/${cleanId(id)}`,
  SINGLE_TASK_REVIEW: (id) => `${BASE_URL}/api/master-task/review/${cleanId(id)}`,
  ALL_ASSIGNED_TASKS: `${BASE_URL}/api/tasks/all-assigned`,
  SINGLE_TASK_DETAIL: (id) => `${BASE_URL}/api/master-task/${cleanId(id)}`,

  STATUS: `${BASE_URL}/api/status`,
  TEST_DB: `${BASE_URL}/api/test-db`,
  THREADS: `${BASE_URL}/api/threads`,
  THREAD_REACT: (id) => `${BASE_URL}/api/posts/${id}/react`,
  THREAD_REACTORS: (id, type) => `${BASE_URL}/api/threads/${id}/reactors${type ? `?type=${encodeURIComponent(type)}` : ''}`,
  THREAD_BADGE: (id) => `${BASE_URL}/api/threads/${id}/badge`,
  THREAD_COMMENT: (id) => `${BASE_URL}/api/threads/${id}/comment`,
  THREAD_COMMENTS: (id) => `${BASE_URL}/api/threads/${id}/comments`,
  THREAD_UPDATE: (id) => `${BASE_URL}/api/threads/${id}`,
  THREAD_DELETE: (id) => `${BASE_URL}/api/threads/${id}`,
  THREAD_USER: (userId) => `${BASE_URL}/api/threads/user/${userId}`,
  COMMENT_DELETE: (threadId, commentId) => `${BASE_URL}/api/threads/${threadId}/comments/${commentId}`,
  COMMENT_UPDATE: (threadId, commentId) => `${BASE_URL}/api/threads/${threadId}/comments/${commentId}`,
  SUBORDINATES: (userId) => `${BASE_URL}/api/subordinates/${userId}`,

  NOTIFICATIONS: `${BASE_URL}/api/notifications`,
  SUPPORT_TICKETS: `${BASE_URL}/api/support-tickets`,
  UPDATE_TICKET: (id) => `${BASE_URL}/api/support-tickets/${cleanId(id)}`,
  SUPPORT_AGENTS: `${BASE_URL}/api/support-agents`,
  COURSES: `${BASE_URL}/api/courses`,
  COURSE_PROGRESS: `${BASE_URL}/api/courses/progress`,
  USER_COURSES: `${BASE_URL}/api/user-courses`,
  COURSE_COMPLETE: (id) => `${BASE_URL}/api/courses/${id}/complete`,
  TIMELINE: (managerId) => `${BASE_URL}/api/timeline?managerId=${cleanId(managerId)}`,
  ATTENDANCE_LOGS: (userId) => `${BASE_URL}/api/attendance_logs?userId=${cleanId(userId)}`,
  ALL_ATTENDANCE: `${BASE_URL}/api/attendance_logs`,
  ATTENDANCE_PUNCH: `${BASE_URL}/api/attendance_logs/punch`,
  ATTENDANCE_GAPS: (userId) => `${BASE_URL}/api/attendance/gaps/${cleanId(userId)}`,

  LEAVE_BALANCE: (userId) => `${BASE_URL}/api/leaves/balance/${cleanId(userId)}`,
  LEAVE_STATS_MY: (month) => `${BASE_URL}/api/leaves/stats/my${month ? `?month=${month}` : ''}`,
  LEAVE_REQUEST: `${BASE_URL}/api/leaves/request`,
  UPDATE_LEAVE_STATUS: (id) => `${BASE_URL}/api/leaves/${cleanId(id)}/status`,
  MY_LEAVES_GET: `${BASE_URL}/api/leaves/my`,
  ALL_LEAVES: `${BASE_URL}/api/leaves`,
  ALL_LEAVES_COMPREHENSIVE: `${BASE_URL}/api/leaves/comprehensive`,
  TEAM_LEAVES: `${BASE_URL}/api/leave/team`,
  RESIGNATIONS: `${BASE_URL}/api/resignations`,
  TEAM_RESIGNATIONS: (tlId) => `${BASE_URL}/api/resignations/team/${cleanId(tlId)}`,
  REVOKE_RESIGNATION: (id) => `${BASE_URL}/api/resignations/revoke/${cleanId(id)}`,
  MY_PAYSLIPS: (userId) => `${BASE_URL}/api/pay-slips/my`,
  REWARDS_MY: `${BASE_URL}/api/rewards/my`,
  REWARDS_GIVE: `${BASE_URL}/api/rewards`,
  REWARDS_LEADERBOARD: `${BASE_URL}/api/rewards/leaderboard`,
  REWARDS_HISTORY: `${BASE_URL}/api/admin/rewards/history`,
  LEADERBOARD_ALL: `${BASE_URL}/api/employees/leaderboard/all`,
  USER_SEARCH: (q) => `${BASE_URL}/api/users/search?q=${q}`,
  REWARDS_GIVEN: (userId) => `${BASE_URL}/api/rewards/given?userId=${cleanId(userId)}`,
  REWARDS_USER: (employeeId) => `${BASE_URL}/api/rewards/user/${cleanId(employeeId)}`,
  SERVICE_CERTIFICATES: (id) => `${BASE_URL}/api/service-certificates${id ? `/${cleanId(id)}` : ''}`,
  SERVICE_CERTIFICATES_MY: `${BASE_URL}/api/service-certificates/my`,
  SERVICE_CERTIFICATES_USER: (id) => `${BASE_URL}/api/service-certificates?userId=${cleanId(id)}`,
  QUIZ_ANSWER: (quizId) => `${BASE_URL}/api/quizzes/${quizId}/answer`,
  QUIZ_DATA: (quizId) => `${BASE_URL}/api/quizzes/${quizId}`,
  QUIZZES_ALL: `${BASE_URL}/api/quizzes`,
  FUN_QUIZZES: `${BASE_URL}/api/fun-quizzes`,
  QUIZ_SUBMIT_SESSION: `${BASE_URL}/api/quizzes/submit-session`,
  QUIZ_SUBMIT_TOTAL: `${BASE_URL}/api/quizzes/submit-total`,
  ASSETS: `${BASE_URL}/api/assets`,
  MY_ASSETS: (id) => `${BASE_URL}/api/my-assets?employee_id=${cleanId(id)}`,
  SUGGESTIONS: `${BASE_URL}/api/suggestions`,
  INTERNS: `${BASE_URL}/api/interns`,
  BANK_IFSC: (code) => `${BASE_URL}/api/bank/ifsc/${code}`,
  QUIZ_USER_POINTS: `${BASE_URL}/api/quizzes/user-points`,
  QUIZ_LEADERBOARD: `${BASE_URL}/api/quizzes/leaderboard`
};
