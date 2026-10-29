import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
} from "@/services/auth/session.service";

describe("session service", () => {
  it("creates and verifies a session token", async () => {
    const token = await createSessionToken({
      userId: "6f1f0f4a-5b1f-4a4f-9f4e-2a1d3c4b5a69",
      username: "lydev",
      sessionVersion: 3,
    });

    const payload = await verifySessionToken(token);

    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe("6f1f0f4a-5b1f-4a4f-9f4e-2a1d3c4b5a69");
    expect(payload?.username).toBe("lydev");
    expect(payload?.ver).toBe(3);
    expect(payload?.jti).toBeTruthy();
  });

  it("rejects a tampered token", async () => {
    const token = await createSessionToken({
      userId: "6f1f0f4a-5b1f-4a4f-9f4e-2a1d3c4b5a69",
      username: "lydev",
      sessionVersion: 0,
    });

    await expect(verifySessionToken(`${token}tampered`)).resolves.toBeNull();
  });
});
