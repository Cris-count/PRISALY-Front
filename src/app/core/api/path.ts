// Fills ":name" segments of a catalog path; a missing value is an explicit error.
export function buildPath(path: string, params: Readonly<Record<string, string>>): string {
  return path.replace(/:([A-Za-z]+)/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined || value.trim().length === 0) {
      throw new Error(`Falta el parámetro de ruta "${name}"`);
    }
    return encodeURIComponent(value.trim());
  });
}
