export function validateJsonSchema(input: any, schema: any): string | null {
  if (!schema) return null; // No schema means valid
  
  if (schema.type === 'object') {
    if (typeof input !== 'object' || input === null) return 'Input must be an object';
    
    if (schema.required) {
      for (const req of schema.required) {
        if (input[req] === undefined) {
          return `Missing required field: ${req}`;
        }
      }
    }
    
    if (schema.properties) {
      for (const [key, value] of Object.entries(input)) {
        const propSchema = schema.properties[key];
        if (!propSchema) {
          // Strict validation: reject unknown fields to prevent prototype pollution
          return `Unknown field: ${key}`;
        }
        
        if (propSchema.type) {
          if (propSchema.type === 'string' && typeof value !== 'string') return `Field ${key} must be a string`;
          if (propSchema.type === 'number' && typeof value !== 'number') return `Field ${key} must be a number`;
          if (propSchema.type === 'boolean' && typeof value !== 'boolean') return `Field ${key} must be a boolean`;
          if (propSchema.type === 'array' && !Array.isArray(value)) return `Field ${key} must be an array`;
          if (propSchema.type === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) return `Field ${key} must be an object`;
        }
      }
    }
  }
  return null;
}
