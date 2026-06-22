const rawBase = import.meta.env.BASE_URL || '/'
const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`
const baseWithoutTrailingSlash = base === '/' ? '' : base.slice(0, -1)

function isExternalPath(path) {
  return /^(https?:|data:|blob:|mailto:|tel:|#)/.test(path)
}

export function assetPath(path) {
  if (!path || isExternalPath(path)) return path
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${base}${cleanPath}`.replace(/\/{2,}/g, '/')
}

export function routePath(path = '/') {
  if (!path || isExternalPath(path)) return path
  if (path === '/') return base
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${base}${cleanPath}`.replace(/\/{2,}/g, '/')
}

export function currentRoutePath() {
  const pathname = window.location.pathname
  if (!baseWithoutTrailingSlash) return pathname || '/'
  if (pathname === baseWithoutTrailingSlash || pathname === `${baseWithoutTrailingSlash}/`) return '/'
  if (pathname.startsWith(`${baseWithoutTrailingSlash}/`)) return pathname.slice(baseWithoutTrailingSlash.length)
  return pathname || '/'
}
