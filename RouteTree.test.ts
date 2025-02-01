import { describe, test, expect, beforeEach } from "vitest";

import { RouteTree } from "./RouteTree";

describe("RadixRouter", () => {
  let router: RouteTree;

  beforeEach(() => {
    router = new RouteTree();
    router.addRoute("/", () => "Root route");
    router.addRoute("/pos", () => "pos route");
    router.addRoute("/pos/hardware", () => "pos hardware route");
    router.addRoute("/pos/:user", (params) => `pos user ${params.user} route`);
    router.addRoute(
      "/pos/:user/profile",
      (params) => `pos user ${params.user} profile route`
    );
    router.addRoute("/pos/$", () => "pos splat route");
    router.addRoute("/pos/hardware/$", () => "pos hardware splat route");
    router.addRoute("/pos/hardware/store", () => "pos hardware store route");
    router.addRoute("/$", () => "catch all splat route");
  });

  test("should match static routes", async () => {
    let { handler } = router.match("/")!;
    expect(handler).toBeDefined();
    expect(handler()).toEqual("Root route");

    handler = router.match("/pos")!.handler;
    expect(handler).toBeDefined();
    expect(handler()).toEqual("pos route");

    handler = router.match("/pos/hardware")!.handler;
    expect(handler).toBeDefined();
    expect(handler()).toEqual("pos hardware route");

    handler = router.match("/pos/hardware/store")!.handler;
    expect(handler).toBeDefined();
    expect(handler()).toEqual("pos hardware store route");
  });

  test("should match dynamic path segment", async () => {
    let { handler } = router.match("/pos/connor")!;
    expect(handler).toBeDefined();
    expect(handler()).toEqual("pos user connor route");

    handler = router.match("/pos/connor/profile")!.handler;
    expect(handler).toBeDefined();
    expect(handler()).toEqual("pos user connor profile route");
  });

  test("should match splat path segment", async () => {
    let { handler } = router.match("/pos/connor/goes/to/store")!;
    expect(handler).toBeDefined();
    expect(handler()).toEqual("pos splat route");

    handler = router.match("/connor/goes/to/store")!.handler;
    expect(handler).toBeDefined();
    expect(handler()).toEqual("catch all splat route");

    handler = router.match("/connor")!.handler;
    expect(handler).toBeDefined();
    expect(handler()).toEqual("catch all splat route");

    handler = router.match("/pos/hardware/store1")!.handler;
    expect(handler).toBeDefined();
    expect(handler()).toEqual("pos hardware splat route");

    handler = router.match("/pos/hardware/store/product/1")!.handler;
    expect(handler).toBeDefined();
    expect(handler()).toEqual("pos hardware splat route");
  });
});
