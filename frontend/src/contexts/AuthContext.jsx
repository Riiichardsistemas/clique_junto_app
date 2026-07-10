import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { getToken, setToken } from '../api/axios';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  loading: true, // true ate verificarmos o token inicial
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, loading: false };
    case 'LOGOUT':
      return { ...state, user: null, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Ao montar, se houver token, busca o usuario
  useEffect(() => {
    const token = getToken();
    if (!token) {
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }
    authApi
      .me()
      .then((data) => dispatch({ type: 'SET_USER', payload: data.user }))
      .catch(() => {
        setToken(null);
        dispatch({ type: 'LOGOUT' });
      });
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    setToken(data.token);
    dispatch({ type: 'SET_USER', payload: data.user });
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authApi.register(payload);
    setToken(data.token);
    dispatch({ type: 'SET_USER', payload: data.user });
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    dispatch({ type: 'LOGOUT' });
  }, []);

  const setUser = useCallback((user) => {
    dispatch({ type: 'SET_USER', payload: user });
  }, []);

  const value = {
    user: state.user,
    loading: state.loading,
    isAuthenticated: !!state.user,
    login,
    register,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
