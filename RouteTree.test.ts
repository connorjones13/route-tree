import { describe, test, expect, beforeEach } from "vitest";

import { RouteTree } from "./RouteTree";

describe("RadixRouter", () => {
  let router: RouteTree;

  beforeEach(() => {
    router = new RouteTree();
    router.addRoute("/", () => "Root route");
    router.addRoute("/pos", () => "pos route");
    router.addRoute("/pos/hardware", () => "pos hardware route");
    router.addRoute("/pos/:user", (params) => `pos user ${params!.user} route`);
    router.addRoute(
      "/pos/:user/profile",
      (params) => `pos user ${params!.user} profile route`
    );
    router.addRoute("/pos/$", () => "pos splat route");
    router.addRoute("/pos/hardware/$", () => "pos hardware splat route");
    router.addRoute("/pos/hardware/store", () => "pos hardware store route");
    router.addRoute("/$", () => "catch all splat route");
  });

  test("should match static routes", async () => {
    let match = router.match("/")!;
    expect(match.handler).toBeDefined();
    expect(match.handler()).toEqual("Root route");

    match = router.match("/pos")!;
    expect(match.handler).toBeDefined();
    expect(match.handler()).toEqual("pos route");

    match = router.match("/pos/hardware")!;
    expect(match.handler).toBeDefined();
    expect(match.handler()).toEqual("pos hardware route");

    match = router.match("/pos/hardware/store")!;
    expect(match.handler).toBeDefined();
    expect(match.handler()).toEqual("pos hardware store route");
  });

  test("should match dynamic path segment", async () => {
    let match = router.match("/pos/connor")!;
    expect(match.handler).toBeDefined();
    expect(match.params).toEqual({ user: "connor" });
    expect(match.handler(match.params)).toEqual("pos user connor route");

    match = router.match("/pos/connor/profile")!;
    expect(match.handler).toBeDefined();
    expect(match.params).toEqual({ user: "connor" });
    expect(match.handler(match.params)).toEqual(
      "pos user connor profile route"
    );
  });

  test("should match splat path segment", async () => {
    let match = router.match("/pos/connor/goes/to/store")!;
    expect(match.handler).toBeDefined();
    expect(match.handler()).toEqual("pos splat route");

    match = router.match("/connor/goes/to/store")!;
    expect(match.handler).toBeDefined();
    expect(match.handler()).toEqual("catch all splat route");

    match = router.match("/connor")!;
    expect(match.handler).toBeDefined();
    expect(match.handler()).toEqual("catch all splat route");

    match = router.match("/pos/hardware/store1")!;
    expect(match.handler).toBeDefined();
    expect(match.handler()).toEqual("pos hardware splat route");

    match = router.match("/pos/hardware/store/product/1")!;
    expect(match.handler).toBeDefined();
    expect(match.handler()).toEqual("pos hardware splat route");
  });

  test("should handle multiple dynamic parameters", () => {
    router.addRoute(
      "/users/:userId/posts/:postId",
      (params) => `User ${params!.userId} post ${params!.postId}`
    );

    const match = router.match("/users/123/posts/456")!;
    expect(match.handler).toBeDefined();
    expect(match.params).toEqual({ userId: "123", postId: "456" });
    expect(match.handler(match.params)).toEqual("User 123 post 456");
  });

  test("should handle paths with special characters", () => {
    router.addRoute("/path-with-dashes", () => "dashes");
    router.addRoute("/path.with.dots", () => "dots");
    router.addRoute("/path_with_underscores", () => "underscores");
    router.addRoute("/path@with@at", () => "at");

    expect(router.match("/path-with-dashes")!.handler()).toEqual("dashes");
    expect(router.match("/path.with.dots")!.handler()).toEqual("dots");
    expect(router.match("/path_with_underscores")!.handler()).toEqual(
      "underscores"
    );
    expect(router.match("/path@with@at")!.handler()).toEqual("at");
  });

  test("should handle trailing slashes", () => {
    router.addRoute("/trailing/slash", () => "trailing slash");

    expect(router.match("/trailing/slash/")!.handler()).toEqual(
      "trailing slash"
    );
    expect(router.match("/trailing/slash")!.handler()).toEqual(
      "trailing slash"
    );
  });

  test("should handle overlapping dynamic and static routes", () => {
    router.addRoute("/api/users/:id", (params) => `user ${params!.id}`);
    router.addRoute("/api/users/me", () => "current user");

    expect(router.match("/api/users/me")!.handler()).toEqual("current user");
    expect(router.match("/api/users/123")!.handler({ id: "123" })).toEqual(
      "user 123"
    );
  });

  test("should handle non-existent routes", () => {
    const routerWithoutSplat = new RouteTree();
    routerWithoutSplat.addRoute("/", () => "Root route");
    routerWithoutSplat.addRoute("/pos", () => "pos route");

    expect(routerWithoutSplat.match("/non/existent/path")).toBeUndefined();
    expect(routerWithoutSplat.match("")).toBeUndefined();
    expect(
      routerWithoutSplat.match("invalid-path-without-slash")
    ).toBeUndefined();
  });

  test("should handle dynamic segments with special characters", () => {
    router.addRoute(
      "/users/:user-name/posts/:post.id",
      (params) => `User ${params!["user-name"]} post ${params!["post.id"]}`
    );

    const match = router.match("/users/john-doe/posts/123.456")!;
    expect(match.handler).toBeDefined();
    expect(match.params).toEqual({
      "user-name": "john-doe",
      "post.id": "123.456",
    });
    expect(match.handler(match.params)).toEqual("User john-doe post 123.456");
  });

  test("should prioritize static routes over dynamic routes", () => {
    router.addRoute(
      "/api/:version/specs",
      (params) => `API ${params!.version} specs`
    );
    router.addRoute("/api/v1/specs", () => "API v1 specs static");

    expect(router.match("/api/v1/specs")!.handler()).toEqual(
      "API v1 specs static"
    );
    expect(router.match("/api/v2/specs")!.handler({ version: "v2" })).toEqual(
      "API v2 specs"
    );
  });

  test("should handle double slashes in match paths", () => {
    expect(router.match("/pos//hardware")!.handler()).toEqual(
      "pos hardware route"
    );
    expect(router.match("/pos///hardware//store")!.handler()).toEqual(
      "pos hardware store route"
    );
    expect(router.match("//pos//connor")!.handler({ user: "connor" })).toEqual(
      "pos user connor route"
    );
    expect(router.match("/pos//hardware//unknown//path")!.handler()).toEqual(
      "pos hardware splat route"
    );
  });

  test("should reject routes with double slashes", () => {
    expect(() =>
      router.addRoute("/empty//path", () => "empty segments")
    ).toThrow(
      'Invalid route path "/empty//path": Double slashes are not allowed'
    );

    expect(() =>
      router.addRoute("//start/path", () => "double slash at start")
    ).toThrow(
      'Invalid route path "//start/path": Double slashes are not allowed'
    );

    expect(() =>
      router.addRoute("/end//", () => "double slash at end")
    ).toThrow('Invalid route path "/end//": Double slashes are not allowed');
  });

  test("should handle router with single splat route", () => {
    const router = new RouteTree();
    router.addRoute("/$", () => "root route");

    expect(router.match("/pos///hardware//store")!.handler()).toEqual(
      "root route"
    );
    expect(router.match("/pos/hardware//store")!.handler()).toEqual(
      "root route"
    );
  });

  test("should handle router with single root route", () => {
    const router = new RouteTree();
    router.addRoute("/", () => "root route");

    expect(router.match("/")!.handler()).toEqual("root route");
    expect(router.match("")).toBeUndefined();
    expect(router.match("/p")).toBeUndefined();
  });
});
