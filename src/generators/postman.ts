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
                  value: '{{auth_token}}',
                  type: 'text',
                },
              ]
            : [],
          url: {
            raw: '{{base_url}}' + '${route}',
            host: ['{{base_url}}'],
            path: route.replace(/^\//, '').split('/'),
          },
        },
        event: [
          {
            listen: 'test',
            script: {
              type: 'text/javascript',
              exec: [
                'pm.test("Status code is 200", function () {',
                '  pm.response.to.have.status(200);',
                '});'
              ],
            },
          },
        ],
      });
    });
  });

  return {
    info: {
      name: swagger.info.title,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: items,
    variable: [
      { key: 'base_url', value: baseUrl || '' },
      { key: 'auth_token', value: token || '' },
    ],
  };
}
