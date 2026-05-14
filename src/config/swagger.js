const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Portaria API',
      version: '1.0.0',
      description: 'API de atendimento automatizado para condominios via ligacao telefonica',
      contact: {
        name: 'Equipe Portaria'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de Desenvolvimento'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Insira o token JWT obtido no endpoint /api/auth/login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Mensagem de erro' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' }
          }
        }
      }
    },
    tags: [
      { name: 'Auth', description: 'Autenticacao e gerenciamento de sessao' },
      { name: 'Condominiums', description: 'Gerenciamento de condominios' },
      { name: 'Units', description: 'Gerenciamento de unidades' },
      { name: 'Contacts', description: 'Gerenciamento de contatos' },
      { name: 'Flows', description: 'Gerenciamento de fluxos de atendimento' },
      { name: 'Calls', description: 'Sessoes de chamadas' },
      { name: 'Audit', description: 'Logs de auditoria' }
    ]
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
