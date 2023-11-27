import { createSwaggerSpec } from 'next-swagger-doc';

const apiConfig = {
  title: 'waggledance.ai',
  version: '0.1.0',
  openapi: '3.1.0',
}

export const swaggerOptions =  {
  apiFolder: 'src/pages/api', // define api folder under app folder
  definition: {
    openapi: apiConfig.openapi,
    info: {
      title: apiConfig.title,
      version: apiConfig.version
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [],
  },
}

export const getApiDocs = () => {
  const spec = createSwaggerSpec(swaggerOptions);
  return spec;
};