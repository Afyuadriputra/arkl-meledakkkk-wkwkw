import type {
  components,
} from "@/types/schema";

import {
  apiRequest,
} from "@/api/client";

import {
  clearStoredToken,
  setStoredToken,
} from "@/api/tokenStorage";


type LoginRequest =
  components["schemas"]["Login"];

type LoginResponse =
  components["schemas"]["LoginResponse"];

type CurrentUser =
  components["schemas"]["CurrentUser"];

type AccountCreateRequest =
  components["schemas"]["AccountCreate"];

type AccountProfile =
  components["schemas"]["AccountProfile"];
export async function login(
  payload: LoginRequest,
): Promise<LoginResponse> {
  const response =
    await apiRequest<LoginResponse>({
      method: "POST",
      url: "/auth/login/",
      data: payload,
    });

  setStoredToken(
    response.token,
  );

  return response;
}


export async function logout(): Promise<void> {
  try {
    await apiRequest<void>({
      method: "POST",
      url: "/auth/logout/",
    });
  } finally {
    clearStoredToken();
  }
}


export async function getCurrentUser(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>({
    method: "GET",
    url: "/auth/me/",
  });
}


export async function createAccount(
  payload: AccountCreateRequest,
): Promise<AccountProfile> {
  return apiRequest<AccountProfile>({
    method: "POST",
    url: "/accounts/",
    data: payload,
  });
}