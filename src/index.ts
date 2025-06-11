import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import SwaggerParser from '@apidevtools/swagger-parser';
import { generateJestTests, GenerateTestOptions as JestTestOptions } from './generators/jest';
import { generateMochaTests, GenerateTestOptions as MochaTestOptions } from './generators/mocha';
import { generatePostmanCollection } from './generators/postman';

const program = new Command();

program
  .requiredOption('--swagger <pathOrUrl>', 'Path or URL to Swagger/OpenAPI file')
  .requiredOption('--output <outputDir>', 'Output directory for generated test files')
  .requiredOption('--framework <framework>', 'Test framework to use: jest or mocha')
  .option('--output-postman <postmanFile>', 'Path to save generated Postman collection')
  .option('--base-url <baseUrl>', 'Base URL for all requests')
  .option('--token <token>', 'Authorization token')
  .parse(process.argv);

const options = program.opts();

async function loadSwaggerDocument(pathOrUrl: string): Promise<any> {
  if (pathOrUrl.startsWith('http')) {
    const response = await axios.get(pathOrUrl);
    return response.data;
  } else {
    const absolutePath = path.resolve(pathOrUrl);
    const api = await SwaggerParser.parse(absolutePath);
    return api;
  }
}

async function main() {
  try {
    const swagger = await loadSwaggerDocument(options.swagger);
    const outputPath = path.resolve(options.output);

    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    const params = {
      swagger,
      outputDir: outputPath,
      baseUrl: options.baseUrl,
      token: options.token,
    };

    if (options.framework === 'jest') {
      console.log('⚙️ Generating Jest tests...');
      generateJestTests(params);
      console.log(`✅ Jest tests saved to ${outputPath}`);
    } else if (options.framework === 'mocha') {
      console.log('⚙️ Generating Mocha tests...');
      generateMochaTests(params);
      console.log(`✅ Mocha tests saved to ${outputPath}`);
    } else {
      console.error('Unsupported framework. Choose either "jest" or "mocha".');
      process.exit(1);
    }

    if (options.outputPostman) {
      console.log('⚙️ Generating Postman collection...');
      const postmanCollection = generatePostmanCollection(swagger, options.baseUrl, options.token);
      const postmanPath = path.resolve(options.outputPostman);
      fs.writeFileSync(postmanPath, JSON.stringify(postmanCollection, null, 2));
      console.log(`✅ Postman collection saved to ${postmanPath}`);
    }

    console.log('✅ Test files generated successfully.');
  } catch (error) {
    console.error('❌ Error occurred:', error);
    process.exit(1);
  }
}

main();
