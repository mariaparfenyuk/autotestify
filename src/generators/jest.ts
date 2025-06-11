import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

export interface GenerateTestOptions {
  swagger: any;
  outputDir: string;
  baseUrl?: string;
  token?: string;
}

export function generateJestTests({
  swagger,
  outputDir,
  baseUrl,
  token,
}: GenerateTestOptions): void {
  const paths = swagger.paths || {};
  const globalSecurity = swagger.components?.securitySchemes || {};

  Object.entries(paths as Record<string, any>).forEach(([route, methods]) => {
    Object.entries(methods as Record<string, any>).forEach(([method, operation]) => {
      const testName = operation.operationId || `${method}_${route.replace(/[\\/{}]/g, '_')}`;
      const testFilePath = path.join(outputDir, `${testName}.test.ts`);
      const url = baseUrl ? `${baseUrl}${route}` : route;
      const responses = operation.responses || {};
      const successCode = Object.keys(responses).find(code => code.startsWith('2')) || '200';
      const schema = responses[successCode]?.content?.['application/json']?.schema;
      const requiresAuth = Object.keys(globalSecurity).length > 0 || operation.security;

      let content = `
import axios from 'axios';
import Ajv from 'ajv';

const ajv = new Ajv();

describe('${operation.summary || testName}', () => {
  it('should return ${successCode} for valid request', async () => {
    const response = await axios.${method}('${url}', {
      headers: {
        Authorization: '${token || ''}'
      }
    });
    expect(response.status).toBe(${successCode});
`;

      // Schema validation
      if (schema) {
        if (schema.items) {
          const itemSchemaStr = JSON.stringify(schema.items, null, 2);
          content += `
    const validate = ajv.compile(${itemSchemaStr});
    expect(Array.isArray(response.data)).toBe(true);
    for (const item of response.data) {
      const valid = validate(item);
      expect(valid).toBe(true);
    }
`;
        } else {
          const fullSchema = JSON.stringify(schema, null, 2);
          content += `
    const validate = ajv.compile(${fullSchema});
    const valid = validate(response.data);
    expect(valid).toBe(true);
`;
        }
      } else {
        content += `
    // No response schema to validate
`;
      }

      content += `  });\n`;

      // Negative auth test
      if (requiresAuth) {
        content += `
  it('should return 401 if no token provided', async () => {
    try {
      await axios.${method}('${url}');
      throw new Error('Expected unauthorized error');
    } catch (error) {
      const status = error.response?.status;
      expect([401, 403]).toContain(status);
    }
  });
`;
      }

      content += `});\n`;

      fs.writeFileSync(testFilePath, content);
    });
  });
}
