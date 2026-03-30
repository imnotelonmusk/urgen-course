// @vitest-environment node

import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const { getSession } = await import("@/lib/auth");

const SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: object, expiresIn = "7d") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

test("getSession retorna null cuando no hay cookie", async () => {
  mockCookieStore.get.mockReturnValue(undefined);

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession retorna null cuando la cookie no tiene valor", async () => {
  mockCookieStore.get.mockReturnValue({ value: undefined });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession retorna el payload con userId y email cuando el token es válido", async () => {
  const token = await makeToken({ userId: "user-42", email: "test@example.com" });
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session?.userId).toBe("user-42");
  expect(session?.email).toBe("test@example.com");
});

test("getSession retorna null cuando el JWT está malformado", async () => {
  mockCookieStore.get.mockReturnValue({ value: "not.a.valid.jwt" });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession retorna null cuando el JWT está firmado con un secreto incorrecto", async () => {
  const wrongSecret = new TextEncoder().encode("wrong-secret");
  const token = await new SignJWT({ userId: "u1", email: "a@b.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(wrongSecret);
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession retorna null cuando el JWT ha expirado", async () => {
  const token = await makeToken({ userId: "u1", email: "a@b.com" }, "-1s");
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession lee la cookie con el nombre 'auth-token'", async () => {
  mockCookieStore.get.mockReturnValue(undefined);

  await getSession();

  expect(mockCookieStore.get).toHaveBeenCalledWith("auth-token");
});

test("getSession llama a cookies().get exactamente una vez", async () => {
  mockCookieStore.get.mockReturnValue(undefined);

  await getSession();

  expect(mockCookieStore.get).toHaveBeenCalledOnce();
});
