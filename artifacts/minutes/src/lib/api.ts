import { setBaseUrl } from "@workspace/api-client-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

setBaseUrl(API_BASE);