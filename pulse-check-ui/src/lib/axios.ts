import axios from "axios";

const api = axios.create({
  baseURL: "https://excellent-books-1b96ac2551.strapiapp.com/api", // ✅ Correct Strapi API URL
});

export default api;