import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();

vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
const mockCreateProject = vi.fn();

vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

const { useAuth } = await import("@/hooks/use-auth");

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-project-id" });
});

describe("useAuth — isLoading", () => {
  test("inicia en false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("es true durante signIn y vuelve a false al terminar", async () => {
    let resolveSignIn!: (v: unknown) => void;
    mockSignIn.mockReturnValue(new Promise((res) => (resolveSignIn = res)));
    mockGetProjects.mockResolvedValue([{ id: "p1" }]);

    const { result } = renderHook(() => useAuth());

    let signInPromise: Promise<unknown>;
    act(() => {
      signInPromise = result.current.signIn("a@b.com", "password");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn({ success: true });
      await signInPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("vuelve a false incluso si signIn lanza un error", async () => {
    mockSignIn.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("a@b.com", "password").catch(() => {});
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("signIn", () => {
  test("llama a signInAction con email y password", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@test.com", "secret123");
    });

    expect(mockSignIn).toHaveBeenCalledWith("user@test.com", "secret123");
  });

  test("devuelve el resultado de signInAction", async () => {
    const authResult = { success: false, error: "Invalid credentials" };
    mockSignIn.mockResolvedValue(authResult);

    const { result } = renderHook(() => useAuth());
    let returned: unknown;
    await act(async () => {
      returned = await result.current.signIn("a@b.com", "pass");
    });

    expect(returned).toEqual(authResult);
  });

  test("no redirige cuando signIn falla", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "wrong");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("redirige al proyecto existente más reciente cuando no hay trabajo anónimo", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "proj-99" }, { id: "proj-1" }]);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockPush).toHaveBeenCalledWith("/proj-99");
  });

  test("crea proyecto nuevo y redirige cuando no hay proyectos existentes ni trabajo anónimo", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "brand-new" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockPush).toHaveBeenCalledWith("/brand-new");
  });
});

describe("signUp", () => {
  test("llama a signUpAction con email y password", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("new@user.com", "mypassword");
    });

    expect(mockSignUp).toHaveBeenCalledWith("new@user.com", "mypassword");
  });

  test("devuelve el resultado de signUpAction", async () => {
    const authResult = { success: true };
    mockSignUp.mockResolvedValue(authResult);
    mockGetProjects.mockResolvedValue([{ id: "p1" }]);

    const { result } = renderHook(() => useAuth());
    let returned: unknown;
    await act(async () => {
      returned = await result.current.signUp("a@b.com", "pass");
    });

    expect(returned).toEqual(authResult);
  });

  test("no redirige cuando signUp falla", async () => {
    mockSignUp.mockResolvedValue({ success: false, error: "Email already registered" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("a@b.com", "pass");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("isLoading vuelve a false tras signUp exitoso", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "p1" }]);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("a@b.com", "pass");
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe("trabajo anónimo pendiente", () => {
  test("crea proyecto con el trabajo anónimo y redirige a él tras signIn exitoso", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({
      messages: [{ role: "user", content: "hello" }],
      fileSystemData: { "/App.jsx": {} },
    });
    mockCreateProject.mockResolvedValue({ id: "anon-project" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: "user", content: "hello" }],
        data: { "/App.jsx": {} },
      })
    );
    expect(mockClearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/anon-project");
  });

  test("crea proyecto con trabajo anónimo tras signUp exitoso", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({
      messages: [{ role: "user", content: "hello" }],
      fileSystemData: {},
    });
    mockCreateProject.mockResolvedValue({ id: "anon-signup-project" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("a@b.com", "pass");
    });

    expect(mockClearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/anon-signup-project");
  });

  test("no crea proyecto de trabajo anónimo si messages está vacío", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
    mockGetProjects.mockResolvedValue([{ id: "existing" }]);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockClearAnonWork).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/existing");
  });

  test("no consulta proyectos existentes cuando hay trabajo anónimo pendiente", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetAnonWorkData.mockReturnValue({
      messages: [{ role: "user", content: "hi" }],
      fileSystemData: {},
    });
    mockCreateProject.mockResolvedValue({ id: "anon-p" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "pass");
    });

    expect(mockGetProjects).not.toHaveBeenCalled();
  });
});
