const TOKEN_KEY = 'civicpulse_token';
const USER_KEY = 'civicpulse_user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);

export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getUser = () => {
  try {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) return JSON.parse(stored);

    const token = getToken();
    if (!token) return null;

    // Decode JWT payload
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
};

export const setUser = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const isAuthenticated = () => {
  const token = getToken();
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check expiration
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export const hasRole = (...roles) => {
  const user = getUser();
  return user && roles.includes(user.role);
};
