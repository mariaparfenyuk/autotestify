import fs from 'fs';
import path from 'path';

export function generateMochaTests(
  swagger: any,
  outputDir: string,
  baseUrl?: string,
  token?: string
) {
  const paths = swagger.paths || {};
  Object.entries(paths as Record<string, any>).forEach(([route, methods]) => {
    Object.entries(methods as Record<string, any>).forEach(([method, operation]) => {
      const testName = operation.operationId || `${method}_${route.replace(/[\/{}]/g, '_')}`;

      const testFilePath = path.join(outputDir, `${testName}.spec.ts`);
      const url = baseUrl ? `${baseUrl}${route}` : route;

      const content = `
import axios from 'axios';
import { expect } from 'chai';

describe('${operation.summary || testName}', () => {
  it('should call ${method.toUpperCase()} ${url}', async () => {
    const response = await axios.${method}('${url}', {
      headers: {
        Authorization: '${token || ''}'
      }
    });
    expect(response.status).to.equal(200);
  });
});
`;

      fs.writeFileSync(testFilePath, content);
    });
  });
}