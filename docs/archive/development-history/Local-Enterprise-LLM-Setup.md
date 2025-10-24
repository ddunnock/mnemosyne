# Local & Enterprise LLM Setup Guide

This guide shows you how to configure Mnemosyne to work with local LLMs, corporate LLM endpoints, and enterprise AI platforms instead of (or alongside) cloud-based APIs like OpenAI and Anthropic.

## Why Use Local/Enterprise LLMs?

- **Data Privacy**: Keep sensitive data on-premise or within corporate networks
- **Cost Control**: No per-token charges, unlimited usage once deployed
- **Compliance**: Meet regulatory requirements for data sovereignty
- **Air-Gapped Environments**: Work without internet connectivity
- **Customization**: Use fine-tuned models specific to your domain

---

## Supported Platforms

Mnemosyne works with any **OpenAI-compatible API endpoint**, including:

| Platform | Use Case | Default Endpoint |
|----------|----------|------------------|
| **Open WebUI** | Corporate LLM interface | `https://your-company.com/api/v1` |
| **Ollama** | Local LLM runtime | `http://localhost:11434/v1` |
| **LM Studio** | Local LLM with GUI | `http://localhost:1234/v1` |
| **LocalAI** | Self-hosted OpenAI alternative | `http://localhost:8080/v1` |
| **Text Generation Web UI** | Advanced local deployment | `http://localhost:5000/v1` |
| **vLLM** | High-performance serving | `http://localhost:8000/v1` |
| **Custom Enterprise APIs** | Your company's LLM gateway | Custom URL |

---

## Quick Start

### Step 1: Set Up Your LLM Platform

Choose one of the following platforms and follow its setup instructions:

#### Option A: Open WebUI (Corporate/Enterprise)

**What is Open WebUI?**
- Open-source web interface for LLMs
- Supports multiple models and providers
- User management and access control
- Perfect for corporate deployments

**Setup:**
1. Get your Open WebUI endpoint URL from your IT department
   - Example: `https://ai.yourcompany.com/api/v1`
2. Get your API key or access token
3. Verify which models are available (e.g., `gpt-3.5-turbo`, `llama-2-70b`)

**Note:** Some corporate Open WebUI instances may use different authentication methods. Consult your IT department for the correct API key format.

#### Option B: Ollama (Local Development)

**What is Ollama?**
- Easy-to-use local LLM runtime
- Simple CLI for downloading and running models
- OpenAI-compatible API built-in
- Great for development and testing

**Setup:**

1. **Install Ollama**
   ```bash
   # macOS/Linux
   curl https://ollama.ai/install.sh | sh

   # Windows: Download from ollama.ai
   ```

2. **Download a model**
   ```bash
   ollama pull llama2        # Meta's Llama 2 (7B)
   ollama pull mistral       # Mistral 7B (excellent quality)
   ollama pull codellama     # Code-specialized
   ollama pull mixtral       # Mixtral 8x7B (very capable)
   ```

3. **Start Ollama server** (usually runs automatically)
   ```bash
   ollama serve
   ```

4. **Verify it's running**
   ```bash
   curl http://localhost:11434/api/tags
   ```

**Recommended Models for Risk Management:**
- **mistral:latest** - Best general purpose (7B parameters)
- **mixtral:latest** - Most capable (8x7B MoE, similar to GPT-3.5)
- **llama2:13b** - Good balance of quality and speed

#### Option C: LM Studio (Local with GUI)

**What is LM Studio?**
- Desktop app for running local LLMs
- User-friendly interface
- Built-in model browser
- OpenAI-compatible server

**Setup:**

1. Download and install LM Studio from [lmstudio.ai](https://lmstudio.ai)
2. Browse and download a model (Mistral 7B recommended)
3. Click "Start Server" in the Local Server tab
4. Note the endpoint (default: `http://localhost:1234/v1`)

**Recommended Settings:**
- Context Length: 4096 or higher
- Temperature: 0.6-0.7 for risk management
- Enable "CORS" if accessing from Obsidian

---

### Step 2: Configure in Mnemosyne

1. **Open Mnemosyne Settings**
   - Open Obsidian Settings
   - Navigate to Mnemosyne plugin
   - Go to "LLM Providers" tab

2. **Add New Provider**
   - Click "+ Add Provider" button
   - You'll see the AI Provider Configuration modal

3. **Configure Provider Type**
   - Select "Local/Enterprise LLM (Ollama, Open WebUI, etc.)" from Provider Type dropdown

4. **Fill in Basic Settings:**
   - **Provider Name**: Give it a descriptive name
     - Examples: "Company LLM", "Ollama Mistral", "Local Mixtral"
   - **API Key**:
     - For Open WebUI: Enter your API key/token
     - For Ollama/LM Studio: Enter `ollama` or any dummy value (required but not used)
   - **Model Name**: The model identifier
     - Open WebUI: Check your platform's available models
     - Ollama: `mistral`, `mixtral`, `llama2`, etc.
     - LM Studio: Usually the model file name

5. **Expand Advanced Configuration**
   - Click "Advanced Configuration" to expand

6. **Set Base URL:**

   **For Open WebUI:**
   ```
   https://ai.yourcompany.com/api/v1
   ```

   **For Ollama:**
   ```
   http://localhost:11434/v1
   ```

   **For LM Studio:**
   ```
   http://localhost:1234/v1
   ```

   **For Other Platforms:** Check their documentation for the correct endpoint

7. **Configure Model Parameters:**
   - **Max Tokens**: 4000-8000 (depending on model)
   - **Temperature**: 0.6-0.7 for risk management work

8. **Save and Test**
   - Click "Save Provider"
   - Click "Test" to verify connection
   - Should see "✓ Connection successful"

---

## Example Configurations

### Configuration 1: Corporate Open WebUI

```yaml
Provider Name: Company AI Platform
Provider Type: Local/Enterprise LLM
API Key: sk-your-company-api-key-here
Model: gpt-3.5-turbo  # Or whatever your company provides
Base URL: https://ai.company.com/api/v1
Max Tokens: 4000
Temperature: 0.6
```

### Configuration 2: Ollama with Mistral

```yaml
Provider Name: Ollama Mistral 7B
Provider Type: Local/Enterprise LLM
API Key: ollama
Model: mistral
Base URL: http://localhost:11434/v1
Max Tokens: 8000
Temperature: 0.7
```

### Configuration 3: LM Studio with Mixtral

```yaml
Provider Name: LM Studio Mixtral
Provider Type: Local/Enterprise LLM
API Key: lm-studio
Model: mixtral-8x7b-instruct
Base URL: http://localhost:1234/v1
Max Tokens: 4096
Temperature: 0.6
```

### Configuration 4: Air-Gapped vLLM Server

```yaml
Provider Name: Internal vLLM Server
Provider Type: Local/Enterprise LLM
API Key: internal-api-key
Model: meta-llama/Llama-2-13b-chat-hf
Base URL: http://llm-server.internal:8000/v1
Max Tokens: 4096
Temperature: 0.6
```

---

## Using with Agents

Once you've configured your local/enterprise LLM provider, you can use it with any agent:

1. **Create or Edit an Agent**
   - Settings → Mnemosyne → Agents
   - Click "+ Add Agent" or edit existing

2. **Select Your LLM Provider**
   - In "LLM Provider" dropdown, select your local/enterprise provider
   - Example: "Ollama Mistral 7B" or "Company AI Platform"

3. **Configure Agent as Normal**
   - Set system prompt, retrieval settings, etc.
   - All features work the same as with cloud providers

4. **Test the Agent**
   - Click "Test Agent" to verify it works with your local LLM

---

## Performance Considerations

### Local LLMs (Ollama, LM Studio)

**Model Size vs Quality:**
- **7B models** (Mistral, Llama2-7B): Fast, good for most tasks, ~8GB RAM
- **13B models** (Llama2-13B): Better quality, moderate speed, ~16GB RAM
- **70B+ models** (Mixtral, Llama2-70B): Excellent quality, slow, requires GPU

**Recommended for Risk Management:**
- **Minimum**: Mistral 7B (comparable to GPT-3.5 for many tasks)
- **Recommended**: Mixtral 8x7B (better reasoning, closer to GPT-4)
- **Best**: Llama-2-70B or equivalent (if you have GPU resources)

### Enterprise/Open WebUI

Performance depends on your corporate infrastructure:
- **Response time**: Usually 1-5 seconds for typical queries
- **Throughput**: Check with IT for rate limits
- **Model quality**: Varies by deployment (many use GPT-4, Claude, or fine-tuned models)

---

## Troubleshooting

### Connection Failed

**Problem**: "Failed to connect to LLM endpoint"

**Solutions:**
1. **Verify the server is running**
   ```bash
   # For Ollama
   curl http://localhost:11434/api/tags

   # For LM Studio
   curl http://localhost:1234/v1/models
   ```

2. **Check the Base URL**
   - Make sure it ends with `/v1` for most platforms
   - Open WebUI might use `/api/v1` or `/v1` depending on configuration

3. **CORS Issues** (Obsidian desktop app)
   - LM Studio: Enable CORS in server settings
   - Ollama: Should work by default
   - Open WebUI: Check with IT department

4. **Firewall/Network**
   - Corporate networks may block localhost ports
   - Ensure firewall allows the connection
   - Check VPN settings for enterprise endpoints

### Model Not Found

**Problem**: "Model 'xxx' not found"

**Solutions:**
1. **Ollama**: Run `ollama list` to see downloaded models
   ```bash
   ollama pull mistral  # Download if missing
   ```

2. **LM Studio**: Check loaded model in the UI

3. **Open WebUI**: Verify model name with IT department
   - May be case-sensitive
   - May have version suffix (e.g., `gpt-4-0613`)

### Slow Responses

**Problem**: Responses take 30+ seconds

**Solutions:**
1. **Use smaller models** (7B instead of 70B)
2. **Reduce max_tokens** in agent configuration
3. **Enable GPU acceleration** if available
   - Ollama: Automatically uses GPU if available
   - LM Studio: Check GPU settings
4. **Consider enterprise endpoint** instead of local for production use

### API Key Rejected (Open WebUI)

**Problem**: "Invalid API key" or "Unauthorized"

**Solutions:**
1. **Check key format**
   - Some systems use `Bearer` tokens
   - Some use `sk-` prefix
   - Verify with IT department

2. **Check key permissions**
   - Ensure your key has access to the specified model
   - May need specific roles/permissions

3. **Check endpoint URL**
   - Some Open WebUI instances use `/api/v1`
   - Others use just `/v1`
   - Try both if unsure

---

## Security Best Practices

### For Local LLMs

1. **Network Isolation**
   - Only bind to localhost (`127.0.0.1`)
   - Don't expose to network unless necessary
   - Use firewall rules

2. **Model Source Verification**
   - Download models from official sources only
   - Verify checksums when available
   - Be cautious with fine-tuned models from unknown sources

### For Enterprise/Open WebUI

1. **API Key Management**
   - Never commit API keys to version control
   - Use Mnemosyne's encrypted storage
   - Set master password for encryption

2. **Network Security**
   - Use HTTPS for all enterprise endpoints
   - Verify SSL certificates
   - Use VPN if required by company policy

3. **Data Handling**
   - Be aware of what data is sent to LLM
   - Follow company data classification policies
   - Don't send PII to unauthorized endpoints

4. **Compliance**
   - Check with IT/Legal before deployment
   - Ensure setup meets regulatory requirements
   - Document which LLM endpoints are used for what purpose

---

## Advanced: Multiple LLM Strategy

You can configure multiple LLM providers for different use cases:

**Example Setup:**

1. **Cloud (OpenAI GPT-4)**: For most critical analysis
   - High-stakes risk assessments
   - Complex mitigation planning
   - When best quality is essential

2. **Enterprise (Open WebUI)**: For sensitive data
   - Processing proprietary information
   - Compliance-critical workflows
   - When data can't leave corporate network

3. **Local (Ollama Mistral)**: For development/testing
   - Testing agent configurations
   - Development workflows
   - When offline or on VPN

**How to set this up:**
1. Add all three providers in Mnemosyne settings
2. Create different agents using different providers
3. Use master agent to automatically route to the right specialist

---

## FAQ

### Q: Can I use multiple local models simultaneously?

**A:** Yes! Configure each model as a separate provider with its own endpoint. For Ollama, you can run multiple instances on different ports, or use LM Studio + Ollama together.

###Q: Do I need an API key for Ollama/LM Studio?

**A:** Technically no, but Mnemosyne requires a value in the API key field. Use any placeholder like `ollama` or `local`. The field is required for encryption purposes but the value isn't used for local endpoints.

### Q: Which local model is best for risk management?

**A:** **Mistral 7B** offers the best quality-to-speed ratio. **Mixtral 8x7B** is better but slower. Avoid very small models (< 7B) as they struggle with complex analysis.

### Q: Can I fine-tune models for my company's risk taxonomy?

**A:** Yes! You can fine-tune Llama2, Mistral, or other open models on your company's risk data, then serve them via Ollama or vLLM. This requires ML expertise but can significantly improve results.

### Q: Does this work in air-gapped environments?

**A:** Yes! Once you have:
1. Ollama/LM Studio installed
2. Models downloaded
3. Mnemosyne configured

Everything works offline. Perfect for classified/secure environments.

### Q: What about embeddings for RAG?

**A:** ✨ **Local embeddings are now fully supported!** Mnemosyne offers two embedding providers:

**Option 1: OpenAI Embeddings (Cloud)**
- Models: text-embedding-3-small (1536 dim), text-embedding-3-large (3072 dim)
- Pros: High quality, well-tested
- Cons: Requires API key, sends documents to OpenAI, costs money

**Option 2: Local Embeddings (100% Privacy-Preserving)**
- Model: Xenova/all-MiniLM-L6-v2 (384 dimensions)
- Pros: 100% local, no API calls, no external data sharing, works offline, free
- Cons: Different dimension than OpenAI (requires re-indexing if switching)

**How to Configure:**
1. Go to Mnemosyne Settings → Vector Store
2. Under "🧠 Embedding Provider", select:
   - **OpenAI** for cloud embeddings (default)
   - **Local** for privacy-preserving local embeddings
3. If you already have indexed documents, you'll need to re-ingest your vault after changing providers

**Perfect Combination for Complete Privacy:**
- Local LLM (Ollama/LM Studio) + Local Embeddings = Zero external API calls!
- Ideal for air-gapped environments, HIPAA compliance, or highly sensitive data

---

## Support

**For Local LLM Issues:**
- Ollama: [https://ollama.ai/](https://ollama.ai/)
- LM Studio: [https://lmstudio.ai/](https://lmstudio.ai/)

**For Mnemosyne Issues:**
- GitHub Issues: [https://github.com/anthropics/mnemosyne/issues](https://github.com/anthropics/claude-code/issues)
- Plugin Settings → Help

**For Corporate/Enterprise Setup:**
- Contact your IT department
- Refer them to this document
- Provide Open WebUI documentation if needed

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2025-10-21 | Added local embeddings support (Transformers.js) |
| 1.0 | 2025-10-21 | Initial guide for local/enterprise LLM support |

---

*This guide is maintained alongside the Mnemosyne plugin. For updates, check the latest plugin release notes.*
