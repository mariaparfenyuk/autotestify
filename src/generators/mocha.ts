import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

export interface GenerateTestOptions {
  swagger: any;
  outputDir: string;
  baseUrl?: string;
  token?: string;
}

export function generateMochaTests({
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
      const testFilePath = path.join(outputDir, `${testName}.spec.ts`);
      const responses = operation.responses || {};
      const successCode = Object.keys(responses).find(code => code.startsWith('2')) || '200';
      const schema = responses[successCode]?.content?.['application/json']?.schema;
      const requiresAuth = Object.keys(globalSecurity).length > 0 || operation.security;

      // Подстановка значений в path-параметры
      const paramValues: Record<string, string> = {};
      (operation.parameters || []).forEach((param: any) => {
        if (param.in === 'path') {
          paramValues[param.name] = generateFakeValue(param.schema?.type);
        }
      });

      let resolvedUrl = route;
      for (const [name, value] of Object.entries(paramValues)) {
        resolvedUrl = resolvedUrl.replace(`{${name}}`, value);
      }

      const url = baseUrl ? `${baseUrl}${resolvedUrl}` : resolvedUrl;

      let content = `
import axios from 'axios';
import { expect } from 'chai';
import Ajv from 'ajv';

const ajv = new Ajv();

describe('${operation.summary || testName}', () => {
  it('should return ${successCode} for valid request', async () => {
    const response = await axios.${method}('${url}', {
      headers: {
        Authorization: '${token || ''}'
      }
    });
    expect(response.status).to.equal(${successCode});
`;

      if (schema) {
        if (schema.items) {
          const itemSchemaStr = JSON.stringify(schema.items, null, 2);
          content += `
    const validate = ajv.compile(${itemSchemaStr});
    expect(Array.isArray(response.data)).to.equal(true);
    for (const item of response.data) {
      const valid = validate(item);
      expect(valid).to.equal(true);
    }
`;
        } else {
          const fullSchema = JSON.stringify(schema, null, 2);
          content += `
    const validate = ajv.compile(${fullSchema});
    const valid = validate(response.data);
    expect(valid).to.equal(true);
`;
        }
      } else {
        content += `
    // No response schema to validate
`;
      }

      content += `  });\n`;

      if (requiresAuth) {
        content += `
  it('should return 401 if no token provided', async () => {
    try {
      await axios.${method}('${url}');
      throw new Error('Expected unauthorized error');
    } catch (error) {
      const status = error.response?.status;
      expect([401, 403]).to.include(status);
    }
  });
`;
      }

      content += `});\n`;

      fs.writeFileSync(testFilePath, content);
    });
  });
}

function generateFakeValue(type?: string): string {
  switch (type) {
    case 'integer':
    case 'number':
      return '1';
    case 'boolean':
      return 'true';
    case 'string':
    default:
      return 'test';
  }
}
