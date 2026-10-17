/**
 * Project Catalogue for Practical Career Engineering Tracks
 * Curated practical projects with ordered milestones, concrete acceptance criteria,
 * and verified official learning resources.
 */

import { ProjectDifficulty, RecommendedProject } from './roadmapTypes.js';

export interface CatalogueProjectTemplate {
  id: string;
  title: string;
  track: 'backend' | 'frontend' | 'fullstack' | 'ai_ml' | 'devops' | 'data';
  difficulty: ProjectDifficulty;
  description: string;
  estimatedEffort: string;
  prerequisites: string[];
  skillsCovered: string[];
  roleFitExplanationTemplate: string;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    acceptanceCriteria: string[];
    expectedEvidence: string;
  }>;
  learningResources: Array<{
    title: string;
    url: string;
    type: 'docs' | 'tutorial' | 'spec';
    description: string;
  }>;
}

export const PROJECT_CATALOGUE: CatalogueProjectTemplate[] = [
  // ==========================================
  // BACKEND ENGINEERING TRACK
  // ==========================================
  {
    id: 'backend_foundational_crud_sql',
    title: 'Relational REST API with Automated Migration & Validation',
    track: 'backend',
    difficulty: 'foundational',
    description:
      'Design and build a robust backend REST API featuring typed relational schemas, foreign-key relationships, transactional integrity, and automated schema migrations.',
    estimatedEffort: '10-14 hours (1-2 weeks)',
    prerequisites: ['Basic JavaScript / TypeScript or Python syntax', 'Basic HTTP understanding'],
    skillsCovered: ['Node.js', 'Express.js', 'TypeScript', 'PostgreSQL', 'REST API'],
    roleFitExplanationTemplate:
      'Foundational requirement for Backend and Full-Stack roles: proves ability to structure relational data models, manage transactions, and expose standard RESTful endpoints.',
    milestones: [
      {
        id: 'm1_schema_migrations',
        title: 'Relational Database Schema & Migrations',
        description: 'Define relational entities with primary keys, indexes, and write repeatable SQL migration files.',
        acceptanceCriteria: [
          'Two related tables with foreign key constraints and ON DELETE handling',
          'Automated migration up/down scripts using a tool like Knex, Prisma, or raw SQL migrations',
          'At least one unique index and one compound index for search queries',
        ],
        expectedEvidence: 'Migration scripts in src/db/migrations or prisma/schema.prisma with table definitions',
      },
      {
        id: 'm2_rest_endpoints',
        title: 'CRUD Endpoints with Request Validation',
        description: 'Implement typed CRUD endpoints with input validation middleware and structured HTTP status codes.',
        acceptanceCriteria: [
          'GET, POST, PUT/PATCH, and DELETE handlers with parameterized queries',
          'Schema validation middleware (Zod, Joi, or express-validator) rejecting invalid payloads with 400 Bad Request',
          'Consistent JSON error format ({ error: string, details?: any }) across all routes',
        ],
        expectedEvidence: 'Express route handlers in src/routes/ and schema validation in src/schemas/',
      },
      {
        id: 'm3_database_pooling',
        title: 'Connection Pooling & Health Diagnostics',
        description: 'Configure production connection pooling and a database health check endpoint.',
        acceptanceCriteria: [
          'Configured pg.Pool with max connections and idle timeouts via environment variables',
          'GET /health endpoint verifying active database connectivity with latency reporting',
        ],
        expectedEvidence: 'Database client setup in src/db/connection.ts and health route in src/routes/health.ts',
      },
    ],
    learningResources: [
      {
        title: 'PostgreSQL Official Documentation',
        url: 'https://www.postgresql.org/docs/current/',
        type: 'docs',
        description: 'Core reference for PostgreSQL schema design, indexes, and transactions.',
      },
      {
        title: 'Express.js Routing Guide',
        url: 'https://expressjs.com/en/guide/routing.html',
        type: 'docs',
        description: 'Standard patterns for Express middleware, parameters, and route handling.',
      },
      {
        title: 'TypeScript Node.js Best Practices',
        url: 'https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html',
        type: 'tutorial',
        description: 'Configuring TypeScript compiler options and typing Node modules.',
      },
    ],
  },
  {
    id: 'backend_intermediate_auth_service',
    title: 'Stateless Authentication & Role-Based Access Control (RBAC)',
    track: 'backend',
    difficulty: 'intermediate',
    description:
      'Build a secure token-based authentication and authorization micro-module featuring salted password hashing (Argon2/bcrypt), JWT access/refresh token rotation, and role-based route guards.',
    estimatedEffort: '14-18 hours (2 weeks)',
    prerequisites: ['Relational REST API with Automated Migration & Validation'],
    skillsCovered: ['Node.js', 'TypeScript', 'REST API', 'Unit Testing', 'PostgreSQL'],
    roleFitExplanationTemplate:
      'Crucial for intermediate Backend roles: demonstrates security awareness, cryptographic token handling, and robust middleware authorization.',
    milestones: [
      {
        id: 'm1_password_hashing',
        title: 'Cryptographic Credential Hashing',
        description: 'Implement secure registration with salted password hashing and credential validation.',
        acceptanceCriteria: [
          'Passwords hashed using bcrypt (cost factor >= 12) or Argon2id before database persistence',
          'Plaintext passwords never logged or returned in API responses',
          'Rate limiting on login endpoint to mitigate brute-force attempts',
        ],
        expectedEvidence: 'Auth service in src/services/authService.ts and auth middleware in src/middleware/auth.ts',
      },
      {
        id: 'm2_token_rotation',
        title: 'JWT Access & Refresh Token Rotation',
        description: 'Issue short-lived access tokens and implement secure refresh token rotation in database.',
        acceptanceCriteria: [
          'Short-lived access token (e.g., 15m expiration) signed with asymmetric or HMAC secret',
          'Refresh token stored in database with revocation support upon logout',
          'POST /auth/refresh endpoint exchanging valid refresh tokens for new access tokens',
        ],
        expectedEvidence: 'Token generation & verification logic in src/utils/jwt.ts',
      },
      {
        id: 'm3_automated_tests',
        title: 'Integration Test Suite for Auth Flows',
        description: 'Write automated unit and integration tests covering happy paths and edge cases.',
        acceptanceCriteria: [
          'Test suite verifying successful login returns valid JWT',
          'Test suite verifying expired or tampered tokens return 401 Unauthorized',
          'Role-based guard test verifying 403 Forbidden for non-admin accounts',
        ],
        expectedEvidence: 'Vitest or Jest test files in tests/auth.test.ts',
      },
    ],
    learningResources: [
      {
        title: 'OWASP Authentication Cheat Sheet',
        url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html',
        type: 'spec',
        description: 'Industry-standard guidelines for password storage, tokens, and credential management.',
      },
      {
        title: 'RFC 7519 JSON Web Token (JWT)',
        url: 'https://datatracker.ietf.org/doc/html/rfc7519',
        type: 'spec',
        description: 'Official internet standards track specification for JSON Web Tokens.',
      },
    ],
  },
  {
    id: 'backend_advanced_container_ci_service',
    title: 'Containerized Microservice with CI/CD Pipeline & Health Checks',
    track: 'backend',
    difficulty: 'advanced',
    description:
      'Package a production backend service into multi-stage Docker containers and configure an automated GitHub Actions CI workflow with linting, testing, and vulnerability scanning.',
    estimatedEffort: '16-20 hours (2-3 weeks)',
    prerequisites: ['Stateless Authentication & Role-Based Access Control (RBAC)'],
    skillsCovered: ['Docker', 'CI/CD', 'Unit Testing', 'TypeScript', 'Node.js', 'Microservices'],
    roleFitExplanationTemplate:
      'High-value demonstration for production engineering: shows proficiency in DevOps practices, container hygiene, and automated continuous integration.',
    milestones: [
      {
        id: 'm1_docker_multistage',
        title: 'Multi-Stage Dockerfile & Compose Configuration',
        description: 'Create an optimized multi-stage Docker build separating compile time from minimal production runtime.',
        acceptanceCriteria: [
          'Multi-stage Dockerfile using node:alpine or distroless base image for minimal attack surface',
          'Non-root user (USER node) configured for execution',
          'docker-compose.yml orchestrating the API and a PostgreSQL container with health checks',
        ],
        expectedEvidence: 'Dockerfile in root and docker-compose.yml with healthcheck configuration',
      },
      {
        id: 'm2_github_actions_ci',
        title: 'Automated GitHub Actions CI Workflow',
        description: 'Write a GitHub Actions pipeline triggering on pull requests and pushes to main.',
        acceptanceCriteria: [
          'Pipeline runs linting, type-checking (tsc --noEmit), and automated unit tests in parallel',
          'Runs test suite against an ephemeral PostgreSQL service container in GitHub Actions',
          'Fails build if any test fails or linting reports errors',
        ],
        expectedEvidence: 'Workflow file in .github/workflows/ci.yml',
      },
      {
        id: 'm3_observability',
        title: 'Graceful Shutdown & Structured Logging',
        description: 'Implement SIGTERM/SIGINT signal trapping and structured JSON logging.',
        acceptanceCriteria: [
          'SIGTERM handler stops receiving new connections and drains database pool before process exit',
          'Structured JSON logs (Pino or Winston) including request ID, duration, and status code',
        ],
        expectedEvidence: 'Server lifecycle handling in src/server.ts and logger utility in src/utils/logger.ts',
      },
    ],
    learningResources: [
      {
        title: 'Docker Documentation: Multi-stage Builds',
        url: 'https://docs.docker.com/build/building/multi-stage/',
        type: 'docs',
        description: 'Official Docker guide for creating lightweight, secure production images.',
      },
      {
        title: 'GitHub Actions Documentation',
        url: 'https://docs.github.com/en/actions',
        type: 'docs',
        description: 'Official documentation for GitHub Actions workflow syntax and service containers.',
      },
    ],
  },

  // ==========================================
  // FULL-STACK WEB DEVELOPMENT TRACK
  // ==========================================
  {
    id: 'fullstack_foundational_react_node',
    title: 'Full-Stack Dashboard with Responsive React & Express REST Backend',
    track: 'fullstack',
    difficulty: 'foundational',
    description:
      'Develop an interactive data management web application connecting a modern React frontend (Tailwind CSS, custom hooks) with an Express REST backend.',
    estimatedEffort: '14-18 hours (2 weeks)',
    prerequisites: ['Basic HTML/CSS and JavaScript/TypeScript knowledge'],
    skillsCovered: ['React', 'TypeScript', 'Node.js', 'Express.js', 'REST API'],
    roleFitExplanationTemplate:
      'Directly demonstrates full-stack capability: bridges clientside state management with serverside persistence and API contracts.',
    milestones: [
      {
        id: 'm1_react_ui_tailwind',
        title: 'Responsive Component Architecture & Tailwind UI',
        description: 'Build modular, accessible React components with clean state management.',
        acceptanceCriteria: [
          'Component hierarchy separating layout, presentational cards, and interactive forms',
          'Fully responsive design supporting mobile and desktop viewport widths via Tailwind',
          'Custom hook (e.g. useFetch / useData) managing loading, error, and cached data states',
        ],
        expectedEvidence: 'React components in src/components/ and custom hooks in src/hooks/',
      },
      {
        id: 'm2_typed_api_client',
        title: 'Shared TypeScript Contracts & API Client',
        description: 'Establish shared interface models between frontend and backend to eliminate type drift.',
        acceptanceCriteria: [
          'Shared interfaces (or types package) consumed by both frontend fetcher and backend routes',
          'Centralized API service class handling HTTP errors, base URLs, and timeout fallbacks',
        ],
        expectedEvidence: 'API service in src/services/api.ts and shared types in src/types/',
      },
      {
        id: 'm3_form_optimistic_ui',
        title: 'Interactive Form Handling & Optimistic Updates',
        description: 'Implement creation/edit forms with clientside validation and optimistic UI updates.',
        acceptanceCriteria: [
          'Accessible form controls with inline validation messages',
          'Optimistic UI update on list view with automated rollback if backend request fails',
        ],
        expectedEvidence: 'Form component in src/components/DataForm.tsx with state rollbacks',
      },
    ],
    learningResources: [
      {
        title: 'React Official Documentation',
        url: 'https://react.dev/learn',
        type: 'docs',
        description: 'Official React guides for modern hooks, component lifecycle, and state.',
      },
      {
        title: 'Tailwind CSS Documentation',
        url: 'https://tailwindcss.com/docs',
        type: 'docs',
        description: 'Comprehensive utility classes reference for responsive layouts.',
      },
    ],
  },
  {
    id: 'fullstack_intermediate_realtime_collab',
    title: 'Real-Time Event-Driven Collaboration Board',
    track: 'fullstack',
    difficulty: 'intermediate',
    description:
      'Build a real-time collaborative workspace featuring WebSocket bidirectional updates, optimistic concurrency handling, and persistent data storage.',
    estimatedEffort: '18-22 hours (2-3 weeks)',
    prerequisites: ['Full-Stack Dashboard with Responsive React & Express REST Backend'],
    skillsCovered: ['React', 'Node.js', 'TypeScript', 'Docker', 'REST API', 'Unit Testing'],
    roleFitExplanationTemplate:
      'Demonstrates advanced full-stack systems engineering: shows how to synchronize distributed clients via WebSockets alongside traditional REST APIs.',
    milestones: [
      {
        id: 'm1_websocket_server',
        title: 'Bidirectional WebSocket Server',
        description: 'Implement a WebSocket server (ws or socket.io) with room broadcast support and heartbeat keepalives.',
        acceptanceCriteria: [
          'WebSocket server handling connection, disconnection, and reconnection protocols',
          'Channel/room partitioning so events are only broadcast to active workspace members',
          'Heartbeat ping-pong mechanism terminating dead client sockets',
        ],
        expectedEvidence: 'WebSocket server handling in src/realtime/socketServer.ts',
      },
      {
        id: 'm2_client_sync_hook',
        title: 'React Real-Time Synchronization Hook',
        description: 'Create a custom React hook that maintains socket connection and handles incoming broadcast events.',
        acceptanceCriteria: [
          'Hook auto-reconnects with exponential backoff on network drop',
          'Dispatches state updates directly into React state or reducer without full page reloads',
        ],
        expectedEvidence: 'React hook in src/hooks/useRealtimeRoom.ts',
      },
      {
        id: 'm3_conflict_resilience',
        title: 'Optimistic Updates & Conflict Prevention',
        description: 'Handle concurrent edits gracefully using version timestamps or sequence IDs.',
        acceptanceCriteria: [
          'Payloads carry entity version numbers; stale updates are rejected with conflict notifications',
          'Unit test verifying server rejects concurrent edit with older version timestamp',
        ],
        expectedEvidence: 'Conflict resolution logic in src/services/boardService.ts and unit tests',
      },
    ],
    learningResources: [
      {
        title: 'MDN WebSockets API',
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API',
        type: 'docs',
        description: 'Complete reference for clientside WebSocket connection and event handling.',
      },
      {
        title: 'Socket.io Production Guide',
        url: 'https://socket.io/docs/v4/',
        type: 'docs',
        description: 'Architectural patterns for scaling real-time WebSocket applications.',
      },
    ],
  },

  // ==========================================
  // AI & MACHINE LEARNING ENGINEERING TRACK
  // ==========================================
  {
    id: 'ai_foundational_model_serving_api',
    title: 'Model Serving & Inference Microservice with FastAPI',
    track: 'ai_ml',
    difficulty: 'foundational',
    description:
      'Package a machine learning model into a production-ready asynchronous Python REST API using FastAPI, Pydantic data validation, and automated batching.',
    estimatedEffort: '12-16 hours (2 weeks)',
    prerequisites: ['Basic Python programming and NumPy / Pandas familiarity'],
    skillsCovered: ['Python', 'FastAPI', 'Machine Learning', 'Docker', 'REST API'],
    roleFitExplanationTemplate:
      'Core capability for AI/ML Engineers: demonstrates taking trained models out of notebooks and deploying them as robust, production-grade microservices.',
    milestones: [
      {
        id: 'm1_pydantic_schemas',
        title: 'Validated Input/Output Schemas with Pydantic',
        description: 'Define strict type validation schemas for model inference requests and responses.',
        acceptanceCriteria: [
          'Pydantic BaseModel with field constraints (ranges, string lengths, regex patterns)',
          'Automated OpenAPI / Swagger interactive documentation generated at /docs',
          'Explicit 422 Unprocessable Entity error payloads returned on malformed feature inputs',
        ],
        expectedEvidence: 'Pydantic schemas in app/schemas/inference.py and FastAPI app in app/main.py',
      },
      {
        id: 'm2_async_inference_pipeline',
        title: 'Model Loading & Asynchronous Predict Endpoint',
        description: 'Load serialized model artifacts at startup and expose high-throughput prediction endpoints.',
        acceptanceCriteria: [
          'Model loaded into memory once on application lifespan startup (not on every request)',
          'POST /predict endpoint running inference and returning structured predictions with confidence scores',
          'Batch prediction endpoint POST /predict/batch processing arrays of items efficiently',
        ],
        expectedEvidence: 'Model loader in app/services/model_service.py and inference route in app/api/routes.py',
      },
      {
        id: 'm3_docker_packaging',
        title: 'Docker Containerization for ML Runtime',
        description: 'Containerize the FastAPI model service with pinned Python dependencies and health checks.',
        acceptanceCriteria: [
          'Dockerfile with pinned pip versions via requirements.txt or poetry.lock',
          'Container runs as non-root user with Uvicorn worker configuration',
          'Automated test running pytest over sample inference requests inside container',
        ],
        expectedEvidence: 'Dockerfile in root and tests in tests/test_inference.py',
      },
    ],
    learningResources: [
      {
        title: 'FastAPI Official Documentation',
        url: 'https://fastapi.tiangolo.com/',
        type: 'docs',
        description: 'Complete guide to asynchronous Python web frameworks, Pydantic, and dependency injection.',
      },
      {
        title: 'Scikit-Learn Model Persistence Guide',
        url: 'https://scikit-learn.org/stable/model_persistence.html',
        type: 'docs',
        description: 'Best practices for serializing and loading trained ML models safely.',
      },
    ],
  },
  {
    id: 'ai_intermediate_rag_pipeline',
    title: 'Retrieval-Augmented Generation (RAG) & Vector Search Service',
    track: 'ai_ml',
    difficulty: 'intermediate',
    description:
      'Build an end-to-end semantic search and Retrieval-Augmented Generation system using text embeddings, vector similarity indexing, and structured prompt engineering.',
    estimatedEffort: '16-20 hours (2-3 weeks)',
    prerequisites: ['Model Serving & Inference Microservice with FastAPI'],
    skillsCovered: ['Python', 'FastAPI', 'LLM & Generative AI', 'PostgreSQL', 'Docker'],
    roleFitExplanationTemplate:
      'Essential for modern GenAI roles: proves hands-on ability to build retrieval pipelines, integrate embeddings, and prevent hallucination with grounded context.',
    milestones: [
      {
        id: 'm1_chunking_embeddings',
        title: 'Document Ingestion, Chunking & Embeddings',
        description: 'Build a document processor that extracts text, splits it into overlapping semantic chunks, and generates embeddings.',
        acceptanceCriteria: [
          'Recursive character or token-aware chunking pipeline with configurable chunk size and overlap',
          'Embedding generator generating normalized dense vectors using an open model or API',
        ],
        expectedEvidence: 'Chunking logic in app/ingestion/chunker.py and embeddings client in app/services/embeddings.py',
      },
      {
        id: 'm2_vector_indexing',
        title: 'Vector Store & Cosine Similarity Indexing',
        description: 'Store and query dense vectors using pgvector in PostgreSQL or an in-memory vector index.',
        acceptanceCriteria: [
          'Vector table with IVFFlat or HNSW cosine similarity index',
          'Query endpoint retrieving top-k most relevant text chunks based on semantic distance threshold',
        ],
        expectedEvidence: 'Vector store adapter in app/db/vector_store.py with SQL similarity queries',
      },
      {
        id: 'm3_grounded_synthesis',
        title: 'Grounded Answer Generation with Citations',
        description: 'Assemble retrieved context chunks into a prompt and return answers with source document citations.',
        acceptanceCriteria: [
          'Prompt template injecting retrieved context and instructing model to cite chunk sources',
          'Structured JSON response including the synthesized answer alongside verified chunk IDs and source titles',
          'Fall-back mechanism when semantic similarity is below minimum confidence threshold',
        ],
        expectedEvidence: 'Synthesis pipeline in app/services/rag_synthesizer.py and API route in app/api/rag.py',
      },
    ],
    learningResources: [
      {
        title: 'pgvector Official Documentation',
        url: 'https://github.com/pgvector/pgvector',
        type: 'docs',
        description: 'Open-source vector similarity search for PostgreSQL.',
      },
      {
        title: 'HuggingFace Embeddings & Sentence Transformers',
        url: 'https://www.sbert.net/',
        type: 'docs',
        description: 'Comprehensive library for state-of-the-art sentence, text, and image embeddings.',
      },
    ],
  },

  // ==========================================
  // DATA ENGINEERING & ANALYTICS TRACK
  // ==========================================
  {
    id: 'data_foundational_etl_pipeline',
    title: 'Automated Data Extraction, Transformation & Loading (ETL) Pipeline',
    track: 'data',
    difficulty: 'foundational',
    description:
      'Build a resilient, idempotent ETL pipeline in Python that extracts raw semi-structured data, cleanses and normalizes records, and loads them into a dimensional data store with automated validation.',
    estimatedEffort: '12-16 hours (2 weeks)',
    prerequisites: ['Python basics and fundamental SQL'],
    skillsCovered: ['Python', 'PostgreSQL', 'Unit Testing', 'CI/CD'],
    roleFitExplanationTemplate:
      'Direct requirement for Data Analyst and Data Engineer roles: demonstrates clean data wrangling, idempotent batch processing, and schema validation.',
    milestones: [
      {
        id: 'm1_data_extraction_cleansing',
        title: 'Ingestion & Data Cleansing Engine',
        description: 'Parse raw CSV/JSON files, cleanse null values, cast types, and handle date format normalization.',
        acceptanceCriteria: [
          'Data cleansing module handling invalid characters, duplicate rows, and date timezone normalization',
          'Error logging capturing malformed rows without crashing the batch pipeline',
        ],
        expectedEvidence: 'Cleansing module in src/transformers/cleaner.py with unit tests',
      },
      {
        id: 'm2_dimensional_loading',
        title: 'Idempotent UPSERT & Star Schema Loading',
        description: 'Design star-schema destination tables and implement idempotent UPSERT operations.',
        acceptanceCriteria: [
          'Fact and dimension tables with surrogate keys and audit timestamps',
          'ON CONFLICT DO UPDATE (UPSERT) logic preventing duplicate records during re-runs',
        ],
        expectedEvidence: 'Database loader in src/loaders/postgres_loader.py with SQL queries',
      },
      {
        id: 'm3_pipeline_testing',
        title: 'Automated Pipeline Testing & Data Quality Checks',
        description: 'Write automated unit tests verifying schema conformance and boundary values.',
        acceptanceCriteria: [
          'Tests verifying cleansing handles edge cases (empty strings, future dates, negative values)',
          'Automated data quality check validating non-null constraints and primary key uniqueness',
        ],
        expectedEvidence: 'Pytest test cases in tests/test_etl.py',
      },
    ],
    learningResources: [
      {
        title: 'Python Pandas Documentation',
        url: 'https://pandas.pydata.org/docs/',
        type: 'docs',
        description: 'Authoritative documentation for high-performance data manipulation in Python.',
      },
      {
        title: 'PostgreSQL Tutorial: UPSERT using INSERT ON CONFLICT',
        url: 'https://www.postgresqltutorial.com/postgresql-tutorial/postgresql-upsert/',
        type: 'tutorial',
        description: 'Idempotent loading patterns for relational databases.',
      },
    ],
  },

  // ==========================================
  // CLOUD & DEVOPS ENGINEERING TRACK
  // ==========================================
  {
    id: 'cloud_foundational_iac_docker',
    title: 'Cloud Infrastructure Automation & Container Orchestration',
    track: 'devops',
    difficulty: 'intermediate',
    description:
      'Automate cloud infrastructure provisioning and containerized deployment with infrastructure as code, health probes, and automated rollback policies.',
    estimatedEffort: '14-18 hours (2 weeks)',
    prerequisites: ['Basic Docker containerization understanding'],
    skillsCovered: ['Docker', 'AWS', 'CI/CD', 'Unit Testing'],
    roleFitExplanationTemplate:
      'Essential for DevOps and Cloud roles: demonstrates declarative infrastructure management, continuous deployment, and self-healing container architectures.',
    milestones: [
      {
        id: 'm1_docker_compose_orchestration',
        title: 'Multi-Container Stack with Networking & Volumes',
        description: 'Configure isolated multi-container topologies with persistent volumes and bridge networking.',
        acceptanceCriteria: [
          'docker-compose setup separating application, database, and cache onto isolated networks',
          'Named volumes configured for database persistence across container restarts',
          'Liveness and readiness probes defined for each container',
        ],
        expectedEvidence: 'docker-compose.yml with healthcheck and volume definitions',
      },
      {
        id: 'm2_ci_cd_deployment_pipeline',
        title: 'Continuous Deployment & Artifact Versioning',
        description: 'Create an automated deployment workflow building tagged container images on git tags.',
        acceptanceCriteria: [
          'GitHub Actions workflow building Docker image and pushing to a registry using git SHA tags',
          'Vulnerability scanning step (e.g., Trivy or Docker Scout) running in CI',
        ],
        expectedEvidence: 'GitHub Actions workflow in .github/workflows/deploy.yml',
      },
      {
        id: 'm3_infrastructure_manifests',
        title: 'Declarative Cloud Configuration / Terraform',
        description: 'Write declarative infrastructure specifications (Terraform or CloudFormation) for cloud services.',
        acceptanceCriteria: [
          'Terraform / declarative configuration for cloud storage bucket, database instance, and network security group',
          'Variables parameterized for staging and production environments',
        ],
        expectedEvidence: 'Terraform configuration files in terraform/main.tf and variables.tf',
      },
    ],
    learningResources: [
      {
        title: 'Docker Compose Specification',
        url: 'https://docs.docker.com/compose/compose-file/',
        type: 'spec',
        description: 'Specification for multi-container orchestration with Docker.',
      },
      {
        title: 'Terraform AWS Provider Documentation',
        url: 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs',
        type: 'docs',
        description: 'Official HashiCorp documentation for provisioning AWS cloud infrastructure.',
      },
    ],
  },
];
