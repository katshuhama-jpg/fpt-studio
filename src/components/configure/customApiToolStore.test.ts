import { it, expect, vi } from "vitest";
import { CURRENT_USER } from "@/components/knowledge/knowledgeBaseStore";
import { customApiToolStore, AUTH_TYPE_LABEL, defaultAuthConfig } from "./customApiToolStore";

it("auth is only 'Không có' or 'Header', and seeded tools use headers", () => {
  expect(Object.keys(AUTH_TYPE_LABEL)).toEqual(["none", "header"]);
  expect(defaultAuthConfig("header")).toEqual({ type: "header", headers: [{ key: "", value: "" }] });
  const tools = customApiToolStore.list();
  const gmailLike = tools.find(t => t.id === "api-1")!;
  expect(gmailLike.auth).toEqual({ type: "header", headers: [{ key: "X-API-Key", value: "sk_live_••••••••••••cd42" }] });
  expect(tools.find(t => t.id === "api-2")!.auth).toMatchObject({ type: "header", headers: [{ key: "Authorization" }] });
});

it("folds legacy api_key / bearer configs saved by older sessions into headers", async () => {
  const legacy = (id: string, auth: object) => [id, { id, name: id, description: "", method: "GET", url: "https://x.io", auth, headers: [], params: [], timeoutSec: 30, ownerId: CURRENT_USER.id, ownerName: "x", createdAt: 1, updatedAt: 1 }];
  sessionStorage.setItem("custom_api_tool_store_seeded_v1", "1");
  sessionStorage.setItem("custom_api_tool_store_v1", JSON.stringify([
    legacy("k", { type: "api_key", headerName: "X-Key", apiKey: "abc" }),
    legacy("b", { type: "bearer", token: "tok" }),
    legacy("u", { type: "basic", username: "u", password: "p" }),
  ]));
  vi.resetModules();
  const { customApiToolStore: fresh } = await import("./customApiToolStore");
  const by = (id: string) => fresh.list().find(t => t.id === id)!.auth;
  expect(by("k")).toEqual({ type: "header", headers: [{ key: "X-Key", value: "abc" }] });
  expect(by("b")).toEqual({ type: "header", headers: [{ key: "Authorization", value: "Bearer tok" }] });
  expect(by("u")).toEqual({ type: "none" });
});
