// appsyncClient.ts
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

interface AppSyncRequestOptions {
  endpoint: string;
  token: string;
  query: string;
  variables?: { [key: string]: any };
  region?: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: { [key: string]: any };
  }>;
}

export async function makeAppSyncRequest<T>(
  options: AppSyncRequestOptions
): Promise<GraphQLResponse<T>> {
  const { endpoint, token, query, variables, region } = options;

  const requestBody = {
    query,
    variables,
  };

  const axiosConfig: AxiosRequestConfig = {
    method: "POST",
    url: endpoint,
    data: requestBody,
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
  };

  try {
    const response: AxiosResponse<GraphQLResponse<T>> = await axios(
      axiosConfig
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Axios Error making AppSync request:");
      console.error("  Message:", error.message);
      console.error("  Status:", error.response?.status);
      console.error("  Data:", error.response?.data);
      return (
        error.response?.data || {
          errors: [{ message: error.message || "Unknown network error" }],
        }
      );
    } else {
      console.error("Unexpected Error:", error);
      return {
        errors: [{ message: (error as Error).message || "Unknown error" }],
      };
    }
  }
}
