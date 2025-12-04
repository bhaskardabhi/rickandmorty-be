# Prompt Templates

This directory contains prompt templates for LLM interactions. Templates use `{{variableName}}` syntax for variable replacement.

## Usage

### Basic Usage

```javascript
import { renderPrompt } from './locationDescription.js';

// Get a prompt without variables
const systemPrompt = renderPrompt('locationDescription.system');

// Get a prompt with variables
const userPrompt = renderPrompt('locationDescription.user', {
  locationName: 'Earth (C-137)',
  locationType: 'Planet',
  locationDimension: 'Dimension C-137',
  residentCount: 10,
  residentsList: '1. Rick Sanchez - Alive Human, Male...'
});
```

### Adding New Prompts

1. Add your prompt template to the `prompts` object in the appropriate file:

```javascript
export const prompts = {
  locationDescription: {
    system: `...`,
    user: `...`,
  },
  // Add new prompt category
  characterDescription: {
    system: `You are a creative writer...`,
    user: `Describe the character {{characterName}}...`,
  },
};
```

2. Use it in your service:

```javascript
import { renderPrompt } from '../prompts/locationDescription.js';

const prompt = renderPrompt('characterDescription.user', {
  characterName: 'Rick Sanchez',
  // ... other variables
});
```

## Template Syntax

- Use `{{variableName}}` for variable replacement
- Variables are case-sensitive
- Missing variables will log a warning and leave the placeholder

## Example

**Template:**
```
Hello {{name}}, you are {{age}} years old.
```

**Usage:**
```javascript
renderPrompt('myTemplate', { name: 'Rick', age: 70 });
// Returns: "Hello Rick, you are 70 years old."
```

