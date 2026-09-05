import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  employee: null,
  status: 'bootstrapping', // 'bootstrapping' | 'idle' | 'authenticated'
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      state.user = action.payload.user;
      state.employee = action.payload.employee || null;
      state.status = 'authenticated';
    },
    setUser(state, action) {
      state.user = action.payload;
      state.status = 'authenticated';
    },
    bootstrapDone(state) {
      if (state.status === 'bootstrapping') {
        state.status = 'idle';
      }
    },
    logoutSuccess(state) {
      state.user = null;
      state.employee = null;
      state.status = 'idle';
    },
  },
});

export const { setCredentials, setUser, bootstrapDone, logoutSuccess } = authSlice.actions;
export default authSlice.reducer;
