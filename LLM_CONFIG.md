# LLM Provider Configuration Guide

This project uses [Litellm](https://github.com/BerriAI/litellm) to support multiple LLM providers. Switch between providers easily by changing environment variables - no code changes needed!

## Quick Start

Set these environment variables in your `.env` file:

```bash
LLM_MODEL=provider/model-name
LLM_API_KEY=your_api_key
```

## Supported Providers

### OpenAI
```bash
LLM_MODEL=openai/gpt-4
# or
LLM_MODEL=openai/gpt-4-turbo-preview
# or
LLM_MODEL=openai/gpt-3.5-turbo
LLM_API_KEY=sk-...
```

### Anthropic (Claude)
```bash
LLM_MODEL=anthropic/claude-3-opus-20240229
# or
LLM_MODEL=anthropic/claude-3-sonnet-20240229
# or
LLM_MODEL=anthropic/claude-3-haiku-20240307
LLM_API_KEY=sk-ant-...
```

### Groq (Grok)
```bash
LLM_MODEL=groq/grok-beta
# or
LLM_MODEL=groq/llama-3-70b-8192
# or
LLM_MODEL=groq/mixtral-8x7b-32768
LLM_API_KEY=gsk_...
```

### Google (Gemini)
```bash
LLM_MODEL=gemini/gemini-pro
# or
LLM_MODEL=gemini/gemini-pro-vision
LLM_API_KEY=your_google_api_key
```

### Mistral
```bash
LLM_MODEL=mistral/mistral-large-latest
# or
LLM_MODEL=mistral/mistral-medium-latest
LLM_API_KEY=your_mistral_api_key
```

### Cohere
```bash
LLM_MODEL=cohere/command
# or
LLM_MODEL=cohere/command-light
LLM_API_KEY=your_cohere_api_key
```

### Hugging Face
```bash
LLM_MODEL=huggingface/meta-llama/Llama-2-70b-chat-hf
LLM_API_KEY=hf_...
```

## Provider-Specific API Keys

You can also use provider-specific environment variables that Litellm will automatically detect:

- `OPENAI_API_KEY` - for OpenAI models
- `ANTHROPIC_API_KEY` - for Anthropic models
- `GROQ_API_KEY` - for Groq models
- `MISTRAL_API_KEY` - for Mistral models
- `COHERE_API_KEY` - for Cohere models

## Example Configurations

### Using OpenAI GPT-4
```bash
LLM_MODEL=openai/gpt-4
OPENAI_API_KEY=sk-...
```

### Using Grok via Groq
```bash
LLM_MODEL=groq/grok-beta
GROQ_API_KEY=gsk_...
```

### Using Claude 3 Opus
```bash
LLM_MODEL=anthropic/claude-3-opus-20240229
ANTHROPIC_API_KEY=sk-ant-...
```

## Full List of Supported Providers

Litellm supports 100+ providers. See the [official documentation](https://docs.litellm.ai/docs/providers) for the complete list.

## Benefits

- ✅ **No code changes** - switch providers via environment variables
- ✅ **Unified API** - same code works with all providers
- ✅ **Easy testing** - test different models without refactoring
- ✅ **Cost optimization** - switch to cheaper models when appropriate
- ✅ **Fallback support** - can implement automatic fallbacks if one provider fails

