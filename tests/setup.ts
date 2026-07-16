console.log("JEST GLOBAL SETUP RUNNING");

// Initialize global mock state registry
(globalThis as any).supabaseMocks = {
  signUpError: null,
  signInError: null,
  verifyOtpError: null,
  resetPasswordError: null,
  updateUserError: null,
};

jest.mock("@supabase/supabase-js", () => {
  return {
    createClient: () => ({
      auth: {
        signUp: () => {
          const err = (globalThis as any).supabaseMocks?.signUpError;
          return Promise.resolve({ data: { user: err ? null : { id: "mock-user-id" } }, error: err });
        },
        signInWithPassword: () => {
          const err = (globalThis as any).supabaseMocks?.signInError;
          return Promise.resolve({ data: { user: err ? null : { id: "mock-user-id" } }, error: err });
        },
        verifyOtp: () => {
          const err = (globalThis as any).supabaseMocks?.verifyOtpError;
          return Promise.resolve({ data: {}, error: err });
        },
        resetPasswordForEmail: () => {
          const err = (globalThis as any).supabaseMocks?.resetPasswordError;
          return Promise.resolve({ error: err });
        },
        updateUser: () => {
          const err = (globalThis as any).supabaseMocks?.updateUserError;
          return Promise.resolve({ error: err });
        },
      },
      storage: {
        from: jest.fn((bucket: string) => ({
          upload: jest.fn().mockResolvedValue({ data: { path: "mock-path" }, error: null }),
          getPublicUrl: jest.fn(() => {
            const url = bucket === "invoices"
              ? "https://mock-supabase.co/invoice-123.pdf"
              : "https://mock-supabase.co/receipt.jpg";
            return {
              data: { publicUrl: url }
            };
          })
        }))
      },
    }),
  };
});
