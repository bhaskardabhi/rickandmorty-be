# LLM Configuration

This directory contains JSON configuration files for managing LLM settings, models, and prompts.

## Configuration File: `llm-config.json`

The configuration file is an array of configuration objects. Each object defines settings for a specific template/use case.

### Configuration Object Structure

```json
{
  "template_name": "location_description_generation",
  "model": "openai/gpt-4",
  "temperature": 0.8,
  "system_prompt": "locationDescription.system",
  "user_prompt": "locationDescription.user",
  "max_tokens": null
}
```

### Fields

- **`template_name`** (required): Unique identifier for this configuration. Used to reference it in code.
- **`model`** (required): LLM model to use. Format: `provider/model` (e.g., `openai/gpt-4`, `groq/llama-3.3-70b-versatile`)
- **`temperature`** (optional): Temperature setting (0.0 to 2.0). Default: 0.8
- **`system_prompt`** (optional): Reference to system prompt template (e.g., `locationDescription.system`)
- **`user_prompt`** (optional): Reference to user prompt template (e.g., `locationDescription.user`)
- **`max_tokens`** (optional): Maximum tokens to generate. Set to `null` to use model default.

## Usage

### In Code

```javascript
import {
  getModelForTemplate,
  getTemperatureForTemplate,
  getMaxTokensForTemplate,
  getSystemPromptTemplate,
  getUserPromptTemplate,
} from '../config/configLoader.js';

const templateName = 'location_description_generation';

const model = getModelForTemplate(templateName);
const temperature = getTemperatureForTemplate(templateName);
const maxTokens = getMaxTokensForTemplate(templateName);
```

### Adding New Configurations

1. Add a new object to the `llm-config.json` array:

```json
{
  "template_name": "my_new_template",
  "model": "anthropic/claude-3-opus",
  "temperature": 0.7,
  "system_prompt": "myPrompt.system",
  "user_prompt": "myPrompt.user",
  "max_tokens": 1000
}
```

2. Use it in your service:

```javascript
const templateName = 'my_new_template';
const model = getModelForTemplate(templateName);
// ... rest of your code
```

## Examples

### Example 1: OpenAI GPT-4
```json
{
  "template_name": "location_description_generation",
  "model": "openai/gpt-4",
  "temperature": 0.8,
  "system_prompt": "locationDescription.system",
  "user_prompt": "locationDescription.user",
  "max_tokens": null
}
```

### Example 2: Llama 3.3 via Groq
```json
{
  "template_name": "location_description_generation_llama",
  "model": "groq/llama-3.3-70b-versatile",
  "temperature": 0.6,
  "system_prompt": "locationDescription.system",
  "user_prompt": "locationDescription.user",
  "max_tokens": 500
}
```

### Example 3: Claude 3 Opus
```json
{
  "template_name": "location_description_generation_claude",
  "model": "anthropic/claude-3-opus-20240229",
  "temperature": 0.7,
  "system_prompt": "locationDescription.system",
  "user_prompt": "locationDescription.user",
  "max_tokens": 600
}
```

## Benefits

- ✅ **Centralized Configuration**: All LLM settings in one place
- ✅ **Easy Model Switching**: Change models without code changes
- ✅ **Multiple Configurations**: Different settings for different use cases
- ✅ **Version Control**: Track configuration changes in git
- ✅ **Environment Agnostic**: Same config works across dev/staging/prod

## Notes

- The `model` field supports Groq models (e.g., `llama-3.3-70b-versatile`)
- If a configuration is not found, the system falls back to environment variables
- `max_tokens: null` means the model will use its default maximum
- Prompt template references must match template names in the prompts directory

