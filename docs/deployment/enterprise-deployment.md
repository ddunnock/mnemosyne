# Enterprise & Corporate LLM Deployment

**Audience**: 🏢 Admin
**Difficulty**: 🟡 Intermediate

Complete guide for deploying Mnemosyne with corporate and enterprise LLM providers, including L3Harris, Azure OpenAI, and other custom endpoints.

## Overview

Mnemosyne fully supports enterprise LLM deployments with:
- Azure-style OpenAI endpoints
- Corporate API gateways (L3Harris, custom internal systems)
- Custom authentication schemes
- Air-gapped and on-premise deployments
- CORS bypass for Electron environments

## Supported Enterprise Platforms

| Platform | Type | Authentication | Status |
|----------|------|----------------|--------|
| **Azure OpenAI** | Cloud | API Key | ✅ Fully Supported |
| **L3Harris AI Platform** | Corporate | API Key | ✅ Fully Supported |
| **Open WebUI** | Self-hosted | API Key/Bearer | ✅ Supported |
| **Ollama** | Local | None | ✅ Supported |
| **vLLM** | Self-hosted | Custom | ✅ Supported |
| **Custom OpenAI-compatible** | Any | Varies | ✅ Supported |

---

## L3Harris / Azure OpenAI Setup

### Overview

L3Harris and Azure OpenAI use a different endpoint format and authentication scheme than standard OpenAI:

**Standard OpenAI:**
```
https://api.openai.com/v1/chat/completions
Authorization: Bearer sk-...
```

**Azure/L3Harris:**
```
https://api-lhxgpt.ai.l3harris.com/cgp/openai/deployments/{model}/chat/completions?api-version=2024-06-01
api-key: 557b875e35a641989ecfe0c6957ef888
```

**Key Differences:**
1. **Endpoint Format**: `/cgp/openai/deployments/{model}` path structure
2. **Authentication**: `api-key` header instead of `Authorization: Bearer`
3. **API Version**: Required `?api-version=YYYY-MM-DD` query parameter
4. **Model Name**: Embedded in URL path, not request body

### Automatic Detection

Mnemosyne **automatically detects** Azure/L3Harris endpoints and adapts:

**Detection Triggers:**
- URL contains `l3harris.com`
- URL contains `/cgp/openai/`
- URL contains `/deployments/`

**Automatic Adaptations:**
1. ✅ Converts `Authorization: Bearer {key}` → `api-key: {key}` header
2. ✅ Adds `?api-version=2024-06-01` query parameter
3. ✅ Constructs correct deployment URL format
4. ✅ Bypasses CORS restrictions using Obsidian's `requestUrl` API
5. ✅ Case-insensitive header handling

### Configuration Steps

#### 1. Add L3Harris Provider

**Settings → Mnemosyne → LLM Providers → Add Provider**

**Basic Settings:**
```
Provider Name: L3Harris GPT-4
Provider Type: Custom (OpenAI-compatible)
API Key: 557b875e35a641989ecfe0c6957ef888
Model: gpt-4o
```

**Advanced Settings** (click to expand):
```
Base URL: https://api-lhxgpt.ai.l3harris.com
Temperature: 0.6
Max Tokens: 4000
```

**Important:**
- Use the **base URL only** (no `/cgp/openai/` suffix)
- Mnemosyne will construct the full deployment URL automatically
- Model name should be the deployment name (e.g., `gpt-4o`, `gpt-35-turbo`)

#### 2. Test Connection

Click **"Test"** button to verify:
- ✅ Endpoint is reachable
- ✅ API key is valid
- ✅ Model deployment exists

**Expected Console Output:**
```
[ObsidianFetch] POST https://api-lhxgpt.ai.l3harris.com/cgp/openai/deployments/gpt-4o/chat/completions?api-version=2024-06-01
[ObsidianFetch] isL3Harris: true
[ObsidianFetch] Converting Authorization header to api-key for L3Harris
✓ Connection successful
```

#### 3. Enable Provider

Toggle the provider **ON** to make it available to agents.

---

### Embeddings Support

L3Harris/Azure endpoints also support embeddings for the RAG (Retrieval Augmented Generation) system.

#### Discovering Available Models

Mnemosyne includes a built-in discovery tool:

**Cmd+P → "Test Embedding Models (Discover Available Deployments)"**

This tests common embedding deployment names:
- `text-embedding-ada-002` (1536 dimensions)
- `text-embedding-3-small` (1536 dimensions)
- `text-embedding-3-large` (3072 dimensions)
- Plus custom deployment names

**Example Output:**
```
Testing embedding deployments...
✓ Found 1 model(s): text-embedding-ada-002 (1536D)
```

#### Configuring Embeddings

**Settings → Mnemosyne → Knowledge Base → Embedding Provider**

1. Select **"Azure/L3Harris Embeddings"**
2. Enter deployment/model name:
   ```
   text-embedding-ada-002
   ```
3. Click **"Save Configuration"**

**What Happens:**
- Mnemosyne uses your configured L3Harris provider
- Embeddings requests go to:
  ```
  https://api-lhxgpt.ai.l3harris.com/cgp/openai/deployments/text-embedding-ada-002/embeddings?api-version=2024-06-01
  ```
- Same authentication and CORS bypass as chat

**Benefits:**
- ✅ All embeddings stay within corporate network
- ✅ No data sent to external OpenAI servers
- ✅ Uses existing L3Harris account/quota
- ✅ Supports semantic search in knowledge base

---

## Azure OpenAI (Direct)

For standard Azure OpenAI deployments (not L3Harris).

### Configuration

**Base URL Format:**
```
https://{resource-name}.openai.azure.com
```

**Example:**
```
Provider Name: Azure GPT-4
Base URL: https://my-company.openai.azure.com
Model: gpt-4-deployment  # Your deployment name
API Key: abc123...
```

**Settings:**
- Provider Type: Custom (OpenAI-compatible)
- Base URL: Your Azure OpenAI resource URL
- Model: Your deployment name (not the model name!)
- API Key: Your Azure OpenAI API key

**Testing:**
```bash
# Verify your endpoint with curl
curl "https://my-company.openai.azure.com/openai/deployments/gpt-4-deployment/chat/completions?api-version=2024-06-01" \
  -H "api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "test"}],
    "max_tokens": 10
  }'
```

---

## Open WebUI (Corporate Interface)

Open WebUI is a popular open-source LLM interface used by many organizations.

### Configuration

**Base URL Format:**
```
https://ai.yourcompany.com/api/v1
```

**Authentication:**
- Usually standard `Authorization: Bearer {token}`
- Sometimes custom authentication schemes
- Check with your IT department

**Example:**
```
Provider Name: Company AI
Base URL: https://ai.company.com/api/v1
Model: gpt-3.5-turbo  # Or custom models
API Key: sk-company-key-...
```

**Common Issues:**
1. **Model not found**: Ask IT for exact model names available
2. **Unauthorized**: Verify API key has permissions
3. **Different /v1 path**: Try `https://ai.company.com/v1` (no `/api`)

---

## Local / Air-Gapped Deployment

For environments without external internet access.

### Option 1: Ollama (Recommended)

**Setup:**
```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Download models
ollama pull mistral:latest
ollama pull text-embedding-ada-002

# Start server
ollama serve
```

**Mnemosyne Configuration:**
```
Provider Name: Ollama Mistral
Provider Type: Custom
Base URL: http://localhost:11434/v1
Model: mistral
API Key: ollama  # Any value (not used)
```

**Embeddings:**
```
Provider: Local Embeddings (Transformers.js)
Model: Xenova/all-MiniLM-L6-v2
```

**Benefits:**
- ✅ 100% offline operation
- ✅ Zero API costs
- ✅ Complete data privacy
- ✅ No external dependencies

### Option 2: vLLM (High Performance)

**Setup:**
```bash
# Install vLLM
pip install vllm

# Start server with model
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-2-13b-chat-hf \
  --port 8000
```

**Mnemosyne Configuration:**
```
Provider Name: vLLM Llama 2
Base URL: http://localhost:8000/v1
Model: meta-llama/Llama-2-13b-chat-hf
API Key: none  # Any value
```

---

## CORS and Security

### CORS Bypass (Built-in)

Mnemosyne automatically bypasses CORS restrictions in Electron:

**How it works:**
```typescript
// Standard fetch (blocked by CORS)
fetch('https://corporate-api.com/...')  // ❌ CORS error

// Obsidian requestUrl (bypasses CORS)
requestUrl('https://corporate-api.com/...')  // ✅ Works
```

**Benefits:**
- ✅ Works with any corporate endpoint
- ✅ No proxy or CORS configuration needed
- ✅ No browser extension required
- ✅ Secure (Electron security model)

### SSL/TLS Configuration

**For Production:**
```
Provider Settings:
  Base URL: https://api.company.com  # Use HTTPS
  SSL Verification: Enabled
```

**For Development/Testing:**
```
Provider Settings:
  Base URL: http://localhost:8000  # HTTP OK for localhost
  SSL Verification: Disabled
```

**Certificate Issues:**
- If using self-signed certificates, you may need to disable SSL verification
- Contact IT for proper certificate installation
- Never disable SSL for external endpoints!

---

## Troubleshooting

### Authentication Errors

**401 Unauthorized:**
```
Symptom: "Invalid API key" or "401 status code"
```

**Solutions:**
1. Verify API key is correct (copy-paste carefully)
2. Check key has not expired
3. Verify key has permissions for the model/deployment
4. Check if key format is correct (api-key vs Bearer token)
5. Contact IT to verify your account status

**L3Harris-Specific:**
- API key should be hex string (32 characters)
- Example: `557b875e35a641989ecfe0c6957ef888`
- No `sk-` prefix like OpenAI

### Endpoint Not Found (404)

**404 Resource not found:**
```
Symptom: "404 Resource not found"
```

**Solutions:**
1. Verify base URL is correct (no trailing slash)
2. Check model/deployment name exact spelling
3. Verify deployment exists in your Azure/L3Harris portal
4. Check api-version parameter (try different versions)
5. Test endpoint with curl to isolate issue

**L3Harris-Specific:**
```bash
# Test with curl
curl "https://api-lhxgpt.ai.l3harris.com/cgp/openai/deployments/gpt-4o/chat/completions?api-version=2024-06-01" \
  -H "api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "test"}],
    "max_tokens": 10
  }'
```

### Network/Firewall Issues

**Connection timeout or refused:**

**Solutions:**
1. Check VPN is connected (if required)
2. Verify firewall allows connection
3. Test with curl outside Obsidian
4. Check if proxy is required
5. Verify port is not blocked

**Corporate Networks:**
- Some corporate networks block non-standard ports
- Verify 443 (HTTPS) is accessible
- Check if HTTP proxy is required
- May need to whitelist Obsidian in firewall

### Performance Issues

**Slow responses (>10 seconds):**

**Solutions:**
1. Check network latency:
   ```bash
   ping api-lhxgpt.ai.l3harris.com
   ```
2. Reduce Max Tokens setting
3. Use faster model (gpt-35-turbo vs gpt-4)
4. Check corporate network bandwidth
5. Verify endpoint isn't rate-limiting

**L3Harris-Specific:**
- Corporate endpoints may have rate limits
- Check with IT for quotas and limits
- Consider caching strategies
- Use local embeddings to reduce API calls

---

## Best Practices

### Security

1. **API Key Management:**
   - ✅ Use Mnemosyne's encrypted storage (master password)
   - ✅ Never commit API keys to version control
   - ✅ Rotate keys periodically
   - ❌ Don't share keys between users

2. **Network Security:**
   - ✅ Use HTTPS for all endpoints
   - ✅ Enable SSL verification
   - ✅ Use VPN if required by company policy
   - ❌ Don't disable SSL in production

3. **Data Classification:**
   - ✅ Understand what data is sent to LLM
   - ✅ Follow company data classification policies
   - ✅ Don't send PII/PHI to unauthorized endpoints
   - ❌ Don't use cloud LLMs for classified data

### Cost Management

1. **Monitor Usage:**
   - Track token consumption in provider dashboard
   - Set up alerts for high usage
   - Review agent configurations regularly

2. **Optimization:**
   - Use local embeddings (Settings → Knowledge Base)
   - Disable auto-completion for cost savings
   - Use smaller models when appropriate
   - Set appropriate Max Tokens limits

### Compliance

1. **Data Sovereignty:**
   - Verify LLM endpoint location (US, EU, etc.)
   - Ensure compliance with GDPR, HIPAA, etc.
   - Document data flows for audits

2. **Audit Trail:**
   - Enable logging if required
   - Track which agents use which endpoints
   - Maintain records of configuration changes

---

## Multi-Provider Strategy

You can configure multiple providers for different use cases:

```
Provider 1: L3Harris GPT-4
  Use for: Sensitive corporate data
  Agents: Risk Management, Program Analysis

Provider 2: OpenAI GPT-4
  Use for: General research, non-sensitive
  Agents: Writing assistance, summaries

Provider 3: Ollama (Local)
  Use for: Development, testing
  Agents: Testing new agents, prototypes
```

**Benefits:**
- Optimize cost (use expensive models selectively)
- Maintain compliance (route sensitive data appropriately)
- Ensure availability (fallback options)
- Performance tuning (fast models for quick tasks)

---

## Migration Checklist

When migrating to enterprise LLM:

### Pre-Deployment
- [ ] Get API endpoint URL from IT
- [ ] Obtain API key with appropriate permissions
- [ ] Verify firewall/VPN requirements
- [ ] Test endpoint with curl
- [ ] Identify available models/deployments
- [ ] Review data classification policies

### Configuration
- [ ] Add provider in Mnemosyne settings
- [ ] Test connection successfully
- [ ] Configure embeddings (if using RAG)
- [ ] Test embedding discovery
- [ ] Update agent configurations
- [ ] Set appropriate Max Tokens limits

### Testing
- [ ] Test with simple query
- [ ] Verify agent routing works
- [ ] Test embedding generation
- [ ] Verify knowledge base search
- [ ] Test inline AI features
- [ ] Validate performance

### Production
- [ ] Document configuration
- [ ] Train users
- [ ] Set up monitoring
- [ ] Establish support process
- [ ] Schedule regular reviews

---

## Support Resources

### L3Harris Users
- Contact: Your company's IT department
- Internal documentation: L3Harris AI Platform guides
- API Documentation: Request from IT

### Azure OpenAI Users
- [Azure OpenAI Documentation](https://learn.microsoft.com/en-us/azure/cognitive-services/openai/)
- [Azure OpenAI API Reference](https://learn.microsoft.com/en-us/azure/cognitive-services/openai/reference)

### Mnemosyne Issues
- [GitHub Issues](https://github.com/anthropics/mnemosyne/issues)
- [Discussions](https://github.com/anthropics/mnemosyne/discussions)

---

## Related Documentation

- **[LLM Providers Guide](../user-guides/llm-providers.md)** - All provider types
- **[Security Architecture](../capabilities/security.md)** - Security details
- **[Docker Setup](./docker-setup.md)** - PostgreSQL deployment
- **[Vector Store Backends](./vector-store-backends.md)** - Embeddings storage

---

**Version**: 1.0+
**Last Updated**: 2025-10-24
**Tested With**: L3Harris AI Platform, Azure OpenAI, Open WebUI
