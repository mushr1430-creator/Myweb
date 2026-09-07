const htmlRoutes = new Set([
  "/projects",
  "/contact",
  "/project/kapsul",
  "/project/ling-ling-2",
  "/project/vistria",
  "/project/taylormade",
  "/project/the-fantastic-bowl",
  "/project/irvine-company",
  "/project/four-sigmatic",
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname.length > 1
      ? url.pathname.replace(/\/$/, "")
      : url.pathname;

    if (pathname === "/about") {
      url.pathname = "/";
      return Response.redirect(url, 302);
    }

    if (htmlRoutes.has(pathname)) {
      url.pathname = `${pathname}/index.html`;
      return env.ASSETS.fetch(new Request(url, request));
    }

    return env.ASSETS.fetch(request);
  },
};
