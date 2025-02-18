import API from "../api";

// Login function
export const login = async (email, password) => {
  try {
    const res = await API.post("/login", { email, password });
    localStorage.setItem("accessToken", res.data.accessToken);
    return res.data;
  } catch (err) {
    throw err.response?.data?.error || "Login failed.";
  }
};

// Logout function
export const logout = async () => {
  try {
    await API.post("/logout");
    localStorage.removeItem("accessToken");
  } catch (err) {
    console.error("Logout failed:", err);
  }
};

// Refresh token function (automatically called when token expires)
export const refreshAccessToken = async () => {
  try {
    const res = await API.post("/refresh");
    console.log("refresh reached")
    
    localStorage.setItem("accessToken", res.data.accessToken);
    return res.data.accessToken;
  } catch (err) {
    console.error("Failed to refresh token:", err);
    logout();
    return null;
  }
};
