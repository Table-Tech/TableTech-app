/**
 * Environment variable validation for TableTech API
 * Validates required environment variables on startup
 */

interface EnvConfig {
  // Database
  DATABASE_URL: string;
  
  // Server
  PORT: string;
  NODE_ENV: string;
  API_BASE_URL: string;
  
  // Redis
  REDIS_URL: string;
  
  // JWT
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_RESET_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  
  // Sessions
  STAFF_SESSION_DURATION_HOURS: string;
  CUSTOMER_SESSION_DURATION_HOURS: string;
  SESSION_ACTIVITY_THRESHOLD_MINUTES: string;
  SESSION_CLEANUP_INTERVAL_MINUTES: string;
  
  // Payment
  MOLLIE_API_KEY: string;
  MOLLIE_WEBHOOK_SECRET: string;
  
  // Frontend
  FRONTEND_URL: string;
}

const REQUIRED_ENV_VARS: (keyof EnvConfig)[] = [
  // Database
  'DATABASE_URL',
  
  // Server
  'PORT',
  'NODE_ENV',
  'API_BASE_URL',
  
  // Redis
  'REDIS_URL',
  
  // JWT
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_RESET_SECRET',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
  
  // Sessions
  'STAFF_SESSION_DURATION_HOURS',
  'CUSTOMER_SESSION_DURATION_HOURS',
  'SESSION_ACTIVITY_THRESHOLD_MINUTES',
  'SESSION_CLEANUP_INTERVAL_MINUTES',
  
  // Payment
  'MOLLIE_API_KEY',
  'MOLLIE_WEBHOOK_SECRET',
  
  // Frontend
  'FRONTEND_URL'
];

interface ValidationError {
  variable: string;
  issue: string;
  suggestion?: string;
}

/**
 * Validate all required environment variables
 */
export function validateEnvironment(): void {
  const errors: ValidationError[] = [];
  
  // Check for missing variables
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar];
    
    if (!value || value.trim() === '') {
      errors.push({
        variable: envVar,
        issue: 'Missing or empty',
        suggestion: `Add ${envVar}=your_value to your .env file`
      });
      continue;
    }
    
    // Specific validations
    switch (envVar) {
      case 'DATABASE_URL':
        if (!value.startsWith('postgresql://')) {
          errors.push({
            variable: envVar,
            issue: 'Invalid format',
            suggestion: 'Should start with postgresql://'
          });
        }
        break;
        
      case 'REDIS_URL':
        if (!value.startsWith('redis://')) {
          errors.push({
            variable: envVar,
            issue: 'Invalid format',
            suggestion: 'Should start with redis://'
          });
        }
        break;
        
      case 'PORT':
        const port = parseInt(value, 10);
        if (isNaN(port) || port < 1 || port > 65535) {
          errors.push({
            variable: envVar,
            issue: 'Invalid port number',
            suggestion: 'Should be a number between 1 and 65535'
          });
        }
        break;
        
      case 'NODE_ENV':
        if (!['development', 'production', 'test'].includes(value)) {
          errors.push({
            variable: envVar,
            issue: 'Invalid environment',
            suggestion: 'Should be development, production, or test'
          });
        }
        break;
        
      case 'JWT_SECRET':
      case 'JWT_REFRESH_SECRET':
      case 'JWT_RESET_SECRET':
        if (value.length < 32) {
          errors.push({
            variable: envVar,
            issue: 'Too short (security risk)',
            suggestion: 'Should be at least 32 characters long'
          });
        }
        break;
        
      case 'JWT_EXPIRES_IN':
        if (!/^\d+[smhd]$/.test(value)) {
          errors.push({
            variable: envVar,
            issue: 'Invalid format',
            suggestion: 'Should be like 15m, 1h, 7d, etc.'
          });
        }
        break;
        
      case 'JWT_REFRESH_EXPIRES_IN':
        if (!/^\d+[smhd]$/.test(value)) {
          errors.push({
            variable: envVar,
            issue: 'Invalid format',
            suggestion: 'Should be like 7d, 30d, etc.'
          });
        }
        break;
        
      case 'STAFF_SESSION_DURATION_HOURS':
      case 'CUSTOMER_SESSION_DURATION_HOURS':
      case 'SESSION_ACTIVITY_THRESHOLD_MINUTES':
      case 'SESSION_CLEANUP_INTERVAL_MINUTES':
        const num = parseInt(value, 10);
        if (isNaN(num) || num <= 0) {
          errors.push({
            variable: envVar,
            issue: 'Invalid number',
            suggestion: 'Should be a positive integer'
          });
        }
        break;
        
      case 'API_BASE_URL':
      case 'FRONTEND_URL':
        if (!value.startsWith('http://') && !value.startsWith('https://')) {
          errors.push({
            variable: envVar,
            issue: 'Invalid URL format',
            suggestion: 'Should start with http:// or https://'
          });
        }
        break;
        
      case 'MOLLIE_API_KEY':
        if (!value.startsWith('test_') && !value.startsWith('live_')) {
          errors.push({
            variable: envVar,
            issue: 'Invalid Mollie API key format',
            suggestion: 'Should start with test_ or live_'
          });
        }
        break;
    }
  }
  
  // If there are errors, display them and exit
  if (errors.length > 0) {
    console.error('\n❌ Environment Configuration Errors');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    errors.forEach(error => {
      console.error(`\n🔴 ${error.variable}:`);
      console.error(`   Issue: ${error.issue}`);
      if (error.suggestion) {
        console.error(`   Fix: ${error.suggestion}`);
      }
    });
    
    console.error('\n💡 Make sure your .env file is properly configured.');
    console.error('   See .env.example for reference values.');
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(1);
  }
  
  // Validate JWT secret strength in production
  if (process.env.NODE_ENV === 'production') {
    const secrets = [
      process.env.JWT_SECRET,
      process.env.JWT_REFRESH_SECRET,
      process.env.JWT_RESET_SECRET
    ];
    
    for (const secret of secrets) {
      if (secret && secret.length < 64) {
        console.warn('\n⚠️  Security Warning: JWT secrets should be at least 64 characters in production');
        break;
      }
    }
  }
  
  console.log('✅ Environment validation passed');
}

/**
 * Get validated environment configuration
 */
export function getEnvConfig(): EnvConfig {
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    PORT: process.env.PORT!,
    NODE_ENV: process.env.NODE_ENV!,
    API_BASE_URL: process.env.API_BASE_URL!,
    REDIS_URL: process.env.REDIS_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
    JWT_RESET_SECRET: process.env.JWT_RESET_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN!,
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN!,
    STAFF_SESSION_DURATION_HOURS: process.env.STAFF_SESSION_DURATION_HOURS!,
    CUSTOMER_SESSION_DURATION_HOURS: process.env.CUSTOMER_SESSION_DURATION_HOURS!,
    SESSION_ACTIVITY_THRESHOLD_MINUTES: process.env.SESSION_ACTIVITY_THRESHOLD_MINUTES!,
    SESSION_CLEANUP_INTERVAL_MINUTES: process.env.SESSION_CLEANUP_INTERVAL_MINUTES!,
    MOLLIE_API_KEY: process.env.MOLLIE_API_KEY!,
    MOLLIE_WEBHOOK_SECRET: process.env.MOLLIE_WEBHOOK_SECRET!,
    FRONTEND_URL: process.env.FRONTEND_URL!
  };
}