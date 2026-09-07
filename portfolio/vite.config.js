import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const dataFile = new URL("./d", import.meta.url);
const routeFiles = new Map([
  ["/projects", new URL("./projects/index.html", import.meta.url)],
  ["/contact", new URL("./contact/index.html", import.meta.url)],
  ["/project/kapsul", new URL("./project/kapsul/index.html", import.meta.url)],
  [
    "/project/ling-ling-2",
    new URL("./project/ling-ling-2/index.html", import.meta.url),
  ],
  ["/project/vistria", new URL("./project/vistria/index.html", import.meta.url)],
  [
    "/project/taylormade",
    new URL("./project/taylormade/index.html", import.meta.url),
  ],
  [
    "/project/the-fantastic-bowl",
    new URL("./project/the-fantastic-bowl/index.html", import.meta.url),
  ],
  [
    "/project/irvine-company",
    new URL("./project/irvine-company/index.html", import.meta.url),
  ],
  [
    "/project/four-sigmatic",
    new URL("./project/four-sigmatic/index.html", import.meta.url),
  ],
]);

export default {
  plugins: [
    {
      name: "serve-portfolio-data-raw",
      configurePreviewServer(server) {
        const outputDirectory = resolve(
          server.config.root,
          server.config.build.outDir,
        );

        // Preview must resolve the same extensionless routes as development.
        // Otherwise Vite's SPA fallback returns the homepage for project URLs.
        server.middlewares.use(async (request, response, next) => {
          const pathname = request.url?.split("?")[0] || "/";
          const normalizedPath =
            pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;

          if (normalizedPath === "/about") {
            response.statusCode = 302;
            response.setHeader("Location", "/");
            response.end();
            return;
          }

          const isData = normalizedPath === "/d";
          if (!isData && !routeFiles.has(normalizedPath)) {
            next();
            return;
          }

          try {
            const file = isData
              ? resolve(outputDirectory, "d")
              : resolve(outputDirectory, normalizedPath.slice(1), "index.html");
            const content = await readFile(file);
            response.statusCode = 200;
            response.setHeader(
              "Content-Type",
              isData
                ? "application/json; charset=utf-8"
                : "text/html; charset=utf-8",
            );
            response.setHeader("Cache-Control", "no-store");
            response.end(content);
          } catch (error) {
            next(error);
          }
        });
      },
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          const pathname = request.url?.split("?")[0] || "/";
          const normalizedPath =
            pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;

          if (normalizedPath === "/d") {
            try {
              response.statusCode = 200;
              response.setHeader(
                "Content-Type",
                "application/json; charset=utf-8",
              );
              response.setHeader("Cache-Control", "no-store");
              response.end(await readFile(dataFile));
            } catch (error) {
              next(error);
            }
            return;
          }

          if (normalizedPath === "/about") {
            response.statusCode = 302;
            response.setHeader("Location", "/");
            response.end();
            return;
          }

          const routeFile = routeFiles.get(normalizedPath);
          if (!routeFile) {
            next();
            return;
          }

          try {
            const html = await readFile(routeFile, "utf8");
            response.statusCode = 200;
            response.setHeader("Content-Type", "text/html; charset=utf-8");
            response.setHeader("Cache-Control", "no-store");
            response.end(await server.transformIndexHtml(pathname, html));
          } catch (error) {
            next(error);
          }
        });
      },
    },
  ],
};
