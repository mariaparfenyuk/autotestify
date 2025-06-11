export function generatePostmanCollection(
  swagger: any,
  baseUrl?: string,
  token?: string
) {
  const items: any[] = [];
  const paths = swagger.paths || {};

  Object.entries(paths as Record<string, any>).forEach(([route, methods]) => {
    Object.entries(methods as Record<string, any>).forEach(([method, operation]) => {
      items.push({
        name: operation.summary || `${method.toUpperCase()} ${route}`,
        request: {
          method: method.toUpperCase(),
          header: token
            ? [
                {
                  key: 'Authorization',
                  value: token,
                  type: 'text',
                },
              ]
            : [],
          url: {
            raw: `${baseUrl}${route}`,
            host: [baseUrl || ''],
            path: route.replace(/^\//, '').split('/'),
          },
        },
      });
    });
  });

  return {
    info: {
      name: swagger.info.title,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: items,
  };
}
