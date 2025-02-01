interface RouteParams {
  [key: string]: string;
}

interface RouteMatch {
  handler: (params?: RouteParams) => string;
  params: RouteParams;
}

// Make RouteNode accessible to RouteTree but not exported
class RouteNode {
  children: Map<string, RouteNode> = new Map();
  dynamicChild?: { node: RouteNode; paramName: string };
  splatChild?: RouteNode;
  handler?: (params?: RouteParams) => string;

  constructor(handler?: (params?: RouteParams) => string) {
    this.handler = handler;
  }

  getNodeVisual(
    prefix: string = "",
    isLast: boolean = true,
    path: string = ""
  ): string {
    const connector = isLast ? "└── " : "├── ";
    const childPrefix = isLast ? "    " : "│   ";
    let result = prefix + connector;

    // Add node information
    if (this.handler) {
      result += `${path || "/"} [✓]\n`;
    } else {
      result += `${path || "/"}\n`;
    }

    // Process static children
    const staticChildren = Array.from(this.children.entries());
    const hasOtherChildren = this.dynamicChild || this.splatChild;

    staticChildren.forEach(([segment, node], index) => {
      const isLastChild =
        index === staticChildren.length - 1 && !hasOtherChildren;
      const newPath = path ? `${path}/${segment}` : `/${segment}`;
      result += node.getNodeVisual(prefix + childPrefix, isLastChild, newPath);
    });

    // Process dynamic child
    if (this.dynamicChild) {
      const isLastChild = !this.splatChild;
      const paramPath = path
        ? `${path}/:<${this.dynamicChild.paramName}>`
        : `/:<${this.dynamicChild.paramName}>`;
      result += this.dynamicChild.node.getNodeVisual(
        prefix + childPrefix,
        isLastChild,
        paramPath
      );
    }

    // Process splat child
    if (this.splatChild) {
      const splatPath = path ? `${path}/*` : "/*";
      result += this.splatChild.getNodeVisual(
        prefix + childPrefix,
        true,
        splatPath
      );
    }

    return result;
  }
}

export class RouteTree {
  private root: RouteNode = new RouteNode();

  addRoute(path: string, handler: (params?: RouteParams) => string): void {
    // Check for double slashes before any normalization
    if (path.includes("//")) {
      throw new Error(
        `Invalid route path "${path}": Double slashes are not allowed`
      );
    }

    // Normalize path by removing trailing slash unless it's the root path
    if (path !== "/" && path.endsWith("/")) {
      path = path.slice(0, -1);
    }

    const segments = path.split("/");
    // Remove first empty segment from leading slash
    segments.shift();
    let current = this.root;

    if (path === "/") {
      current.handler = handler;
      return;
    }

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (segment === "$") {
        // Splat route - matches everything after
        if (!current.splatChild) {
          current.splatChild = new RouteNode();
        }
        current.splatChild.handler = handler;
        return;
      } else if (segment.startsWith(":")) {
        // Dynamic segment
        const paramName = segment.slice(1);
        if (!current.dynamicChild) {
          current.dynamicChild = {
            node: new RouteNode(),
            paramName,
          };
        }
        if (i === segments.length - 1) {
          current.dynamicChild.node.handler = handler;
        }
        current = current.dynamicChild.node;
      } else {
        // Static segment
        if (!current.children.has(segment)) {
          current.children.set(segment, new RouteNode());
        }
        if (i === segments.length - 1) {
          current.children.get(segment)!.handler = handler;
        }
        current = current.children.get(segment)!;
      }
    }
  }

  match(path: string): RouteMatch | undefined {
    // Ensure path starts with a slash
    if (!path.startsWith("/")) {
      return undefined;
    }

    // Normalize double slashes to single slashes
    path = path.replace(/\/+/g, "/");

    // Normalize path by removing trailing slash unless it's the root path
    if (path !== "/" && path.endsWith("/")) {
      path = path.slice(0, -1);
    }

    const segments = path.split("/");
    // Remove first empty segment from leading slash
    segments.shift();

    if (path === "/") {
      return this.root.handler
        ? { handler: this.root.handler, params: {} }
        : undefined;
    }

    const result = this.matchSegments(segments, this.root);

    // If no specific match found and we have a root splat route, use that
    if (!result && this.root.splatChild?.handler && path.startsWith("/")) {
      return {
        handler: this.root.splatChild.handler,
        params: {},
      };
    }

    return result;
  }

  private matchSegments(
    segments: string[],
    node: RouteNode,
    params: RouteParams = {}
  ): RouteMatch | undefined {
    if (segments.length === 0) {
      return node.handler ? { handler: node.handler, params } : undefined;
    }

    const segment = segments[0];
    const remaining = segments.slice(1);

    // Try static match first
    if (node.children.has(segment)) {
      const match = this.matchSegments(
        remaining,
        node.children.get(segment)!,
        params
      );
      if (match) return match;
    }

    // Try dynamic match
    if (node.dynamicChild) {
      const dynamicParams = { ...params };
      dynamicParams[node.dynamicChild.paramName] = segment;
      const match = this.matchSegments(
        remaining,
        node.dynamicChild.node,
        dynamicParams
      );
      if (match) return match;
    }

    // Try splat match at current level
    if (node.splatChild?.handler) {
      return {
        handler: node.splatChild.handler,
        params,
      };
    }

    return undefined;
  }

  // Returns a visual representation of the route tree
  toVisualTree(): string {
    return "Route Tree Structure:\n" + this.root.getNodeVisual();
  }
}
