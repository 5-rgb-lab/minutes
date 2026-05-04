import { setBaseUrl } from "@workspace/api-client-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000/api";

setBaseUrl(API_BASE);