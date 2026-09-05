import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  accessToken: null,
  status: 'idle',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      state.user = action.payload.user;
      state.accessToken = action.payload.access_token;
      state.status = 'authenticated';
    },
    setUser(state, action) {
      state.user = action.payload;
    },
    logoutSuccess(state) {
      state.user = null;
      state.accessToken = null;
      state.status = 'idle';
    },
  },
});

export const { setCredentials, setUser, logoutSuccess } = authSlice.actions;
export default authSlice.reducer;
