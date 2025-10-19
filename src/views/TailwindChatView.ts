import { WorkspaceLeaf, ItemView } from 'obsidian';

export const VIEW_TYPE_TAILWIND_CHAT = 'tailwind-chat-view';

export class TailwindChatView extends ItemView {
    private plugin: any;
    private agents: any[] = [];
    private selectedAgentId: string | null = null;
    private messages: any[] = [];
    private isTyping: boolean = false;

    constructor(leaf: WorkspaceLeaf, plugin: any) {
        super(leaf);
        this.plugin = plugin;
        this.icon = 'message-square';
    }

    getViewType() {
        return VIEW_TYPE_TAILWIND_CHAT;
    }

    getDisplayText() {
        return 'Mnemosyne Chat';
    }

    async onOpen() {
        console.log('Opening TailwindChatView');
        
        // Load scoped Tailwind CSS dynamically to avoid conflicts
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            /* Scoped Tailwind-like styles ONLY for chat interface - Smart2Brain inspired */
            .mnemosyne-chat { 
                display: flex !important; 
                flex-direction: column !important; 
                height: 100% !important; 
                width: 100% !important;
            }
            .mnemosyne-chat .flex { display: flex; }
            .mnemosyne-chat .flex-col { flex-direction: column; }
            .mnemosyne-chat .h-full { height: 100%; }
            .mnemosyne-chat .bg-slate-0o0 { background-color: var(--color-base-00); }
            .mnemosyne-chat .bg-slate-10 { background-color: var(--color-base-10); }
            .mnemosyne-chat .bg-slate-20 { background-color: var(--color-base-20); }
            .mnemosyne-chat .bg-slate-25 { background-color: var(--color-base-25); }
            .mnemosyne-chat .border-slate-20 { border-color: var(--color-base-20); }
            .mnemosyne-chat .border-slate-30 { border-color: var(--color-base-30); }
            .mnemosyne-chat .text-slate-100 { color: var(--color-base-100); }
            .mnemosyne-chat .text-slate-70 { color: var(--color-base-70); }
            .mnemosyne-chat .text-slate-60 { color: var(--color-base-60); }
            .mnemosyne-chat .text-slate-50 { color: var(--color-base-50); }
            .mnemosyne-chat .p-6 { padding: 1.5rem; }
            .mnemosyne-chat .p-4 { padding: 1rem; }
            .mnemosyne-chat .p-3 { padding: 0.75rem; }
            .mnemosyne-chat .px-4 { padding-left: 1rem; padding-right: 1rem; }
            .mnemosyne-chat .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
            .mnemosyne-chat .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .mnemosyne-chat .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
            .mnemosyne-chat .py-12 { padding-top: 3rem; padding-bottom: 3rem; }
            .mnemosyne-chat .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
            .mnemosyne-chat .border-b { border-bottom-width: 1px; }
            .mnemosyne-chat .border-t { border-top-width: 1px; }
            .mnemosyne-chat .border { border-width: 1px; }
            .mnemosyne-chat .border-2 { border-width: 2px; }
            .mnemosyne-chat .rounded-lg { border-radius: 0.5rem; }
            .mnemosyne-chat .rounded-xl { border-radius: 0.75rem; }
            .mnemosyne-chat .rounded-2xl { border-radius: 1rem; }
            .mnemosyne-chat .rounded-full { border-radius: 9999px; }
            .mnemosyne-chat .w-full { width: 100%; }
            .mnemosyne-chat .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
            .mnemosyne-chat .text-2xl { font-size: 1.5rem; line-height: 2rem; }
            .mnemosyne-chat .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
            .mnemosyne-chat .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
            .mnemosyne-chat .text-6xl { font-size: 3.75rem; line-height: 1; }
            .mnemosyne-chat .font-bold { font-weight: 700; }
            .mnemosyne-chat .font-semibold { font-weight: 600; }
            .mnemosyne-chat .font-medium { font-weight: 500; }
            .mnemosyne-chat .gap-3 { gap: 0.75rem; }
            .mnemosyne-chat .gap-2 { gap: 0.5rem; }
            .mnemosyne-chat .gap-4 { gap: 1rem; }
            .mnemosyne-chat .mb-4 { margin-bottom: 1rem; }
            .mnemosyne-chat .mb-2 { margin-bottom: 0.5rem; }
            .mnemosyne-chat .mb-6 { margin-bottom: 1.5rem; }
            .mnemosyne-chat .mt-4 { margin-top: 1rem; }
            .mnemosyne-chat .space-y-2 > * + * { margin-top: 0.5rem; }
            .mnemosyne-chat .space-y-4 > * + * { margin-top: 1rem; }
            .mnemosyne-chat .space-y-6 > * + * { margin-top: 1.5rem; }
            .mnemosyne-chat .flex-shrink-0 { flex-shrink: 0; }
            .mnemosyne-chat .flex-1 { flex: 1 1 0%; }
            .mnemosyne-chat #messages-area { 
                flex: 1 1 0% !important; 
                display: flex !important; 
                flex-direction: column !important; 
                overflow-y: auto !important;
            }
            .mnemosyne-chat .items-center { align-items: center; }
            .mnemosyne-chat .items-start { align-items: flex-start; }
            .mnemosyne-chat .justify-start { justify-content: flex-start; }
            .mnemosyne-chat .justify-end { justify-content: flex-end; }
            .mnemosyne-chat .justify-between { justify-content: space-between; }
            .mnemosyne-chat .block { display: block; }
            .mnemosyne-chat .overflow-y-auto { overflow-y: auto; }
            .mnemosyne-chat .transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
            .mnemosyne-chat .focus\\:border-primary:focus { border-color: var(--color-accent); }
            .mnemosyne-chat .focus\\:ring-2:focus { box-shadow: 0 0 0 2px var(--color-accent); }
            .mnemosyne-chat .focus\\:ring-primary\\/20:focus { box-shadow: 0 0 0 2px rgba(var(--color-accent-rgb), 0.2); }
            .mnemosyne-chat .disabled\\:opacity-50:disabled { opacity: 0.5; }
            .mnemosyne-chat .disabled\\:cursor-not-allowed:disabled { cursor: not-allowed; }
            .mnemosyne-chat .hover\\:bg-slate-10:hover { background-color: var(--color-base-10); }
            .mnemosyne-chat .hover\\:bg-slate-20:hover { background-color: var(--color-base-20); }
            .mnemosyne-chat .hover\\:shadow-lg:hover { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
            .mnemosyne-chat .hover\\:-translate-y-0\\.5:hover { transform: translateY(-0.125rem); }
            .mnemosyne-chat .disabled\\:transform-none:disabled { transform: none; }
            .mnemosyne-chat .max-w-\\[80\\%\\] { max-width: 80%; }
            .mnemosyne-chat .whitespace-pre-wrap { white-space: pre-wrap; }
            .mnemosyne-chat .animate-slide-in { animation: slideIn 0.3s ease-out; }
            .mnemosyne-chat .animate-typing { animation: typing 1.4s infinite ease-in-out; }
            .mnemosyne-chat .resize-none { resize: none; }
            .mnemosyne-chat .placeholder-slate-60::placeholder { color: var(--color-base-60); }
            .mnemosyne-chat .bg-primary { background-color: var(--color-accent); }
            .mnemosyne-chat .text-primary { color: var(--color-accent); }
            .mnemosyne-chat .text-center { text-align: center; }
            .mnemosyne-chat .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
            .mnemosyne-chat .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
            .mnemosyne-chat .min-h-\\[200px\\] { min-height: 200px; }
            .mnemosyne-chat .max-h-\\[400px\\] { max-height: 400px; }
            .mnemosyne-chat .relative { position: relative; }
            .mnemosyne-chat .absolute { position: absolute; }
            .mnemosyne-chat .top-0 { top: 0; }
            .mnemosyne-chat .right-0 { right: 0; }
            .mnemosyne-chat .bottom-0 { bottom: 0; }
            .mnemosyne-chat .left-0 { left: 0; }
            .mnemosyne-chat .z-10 { z-index: 10; }
            .mnemosyne-chat .cursor-pointer { cursor: pointer; }
            .mnemosyne-chat .select-none { user-select: none; }
            .mnemosyne-chat .opacity-0 { opacity: 0; }
            .mnemosyne-chat .opacity-50 { opacity: 0.5; }
            .mnemosyne-chat .opacity-100 { opacity: 1; }
            .mnemosyne-chat .scale-95 { transform: scale(0.95); }
            .mnemosyne-chat .scale-100 { transform: scale(1); }
            .mnemosyne-chat .transform { transform: translateZ(0); }
            .mnemosyne-chat .duration-200 { transition-duration: 200ms; }
            .mnemosyne-chat .duration-300 { transition-duration: 300ms; }
            .mnemosyne-chat .ease-in-out { transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
            
            @keyframes slideIn {
                0% { opacity: 0; transform: translateY(10px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes typing {
                0%, 80%, 100% { transform: scale(0); }
                40% { transform: scale(1); }
            }
        `;
        document.head.appendChild(styleEl);
        
        await this.initializeChat();
    }

    async onClose() {
        console.log('Closing TailwindChatView');
        // Clean up any event listeners
    }

    private async initializeChat() {
        console.log('Initializing Tailwind chat');
        
        // Get agents
        this.agents = this.plugin.agentManager.listAgents();
        console.log('Available agents:', this.agents);

        // Render the beautiful Tailwind chat interface
        this.renderTailwindChat();
    }

    private renderTailwindChat() {
        console.log('Rendering Tailwind chat interface');
        console.log('Content element:', this.contentEl);
        console.log('Content element dimensions:', this.contentEl.offsetWidth, 'x', this.contentEl.offsetHeight);
        this.contentEl.innerHTML = `
            <div class="mnemosyne-chat flex flex-col h-full bg-slate-0o0">
                <!-- Header -->
                <div class="flex-shrink-0 p-4 border-b border-slate-20 bg-slate-10">
                    <div class="flex items-center gap-3 mb-4">
                        <img src="assets/Mnemosyne-Icon-128.svg" alt="Mnemosyne" class="w-8 h-8" />
                        <h2 class="text-xl font-bold text-slate-100">Mnemosyne Chat</h2>
                    </div>
                    <div class="space-y-2">
                        <label for="agent-dropdown" class="block text-sm font-semibold text-slate-70">Select Agent:</label>
                        <select id="agent-dropdown" class="w-full px-3 py-2 border border-slate-30 rounded-lg bg-slate-20 text-slate-100 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all">
                            <option value="">Choose an agent...</option>
                            ${this.agents.map(agent => 
                                `<option value="${agent.id}">${agent.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                
                <!-- Messages Area -->
                <div id="messages-area" class="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-0o0 min-h-[200px]">
                    <div class="text-center py-8">
                        <div class="text-6xl mb-4">👋</div>
                        <h3 class="text-lg font-semibold text-slate-100 mb-2">Welcome to Mnemosyne Chat!</h3>
                        <p class="text-slate-60">Select an agent above to start your conversation.</p>
                    </div>
                </div>
                
                <!-- Input Area -->
                <div class="flex-shrink-0 p-4 border-t border-slate-20 bg-slate-10">
                    <div class="flex gap-3">
                        <div class="flex-1 relative">
                            <textarea 
                                id="message-input" 
                                class="w-full px-3 py-2 border border-slate-30 rounded-xl bg-slate-20 text-slate-100 placeholder-slate-60 focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="Select an agent to start chatting..."
                                disabled
                                rows="1"
                            ></textarea>
                        </div>
                        <button 
                            id="send-button" 
                            class="px-4 py-2 bg-primary text-slate-100 font-medium rounded-xl hover:bg-slate-20 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            disabled
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Attach event listeners
        this.attachTailwindEventListeners();
        
        // Debug layout after rendering
        setTimeout(() => {
            const chatContainer = this.contentEl.querySelector('.mnemosyne-chat') as HTMLElement;
            const messagesArea = this.contentEl.querySelector('#messages-area') as HTMLElement;
            console.log('Chat container:', chatContainer);
            console.log('Chat container computed style:', window.getComputedStyle(chatContainer));
            console.log('Messages area:', messagesArea);
            console.log('Messages area computed style:', window.getComputedStyle(messagesArea));
        }, 100);
    }

    private attachTailwindEventListeners() {
        const dropdown = this.contentEl.querySelector('#agent-dropdown') as HTMLSelectElement;
        const textarea = this.contentEl.querySelector('#message-input') as HTMLTextAreaElement;
        const sendBtn = this.contentEl.querySelector('#send-button') as HTMLButtonElement;
        const messagesArea = this.contentEl.querySelector('#messages-area') as HTMLElement;

        // Agent selection
        dropdown.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            this.selectedAgentId = target.value;
            
            if (target.value) {
                textarea.disabled = false;
                textarea.placeholder = 'Type your message...';
                sendBtn.disabled = false;
                this.addSystemMessage(`Switched to ${this.getAgentName(target.value)}`);
            } else {
                textarea.disabled = true;
                textarea.placeholder = 'Select an agent to start chatting';
                sendBtn.disabled = true;
            }
        });

        // Send message
        const sendMessage = async () => {
            const message = textarea.value.trim();
            if (!message || !this.selectedAgentId) return;

            this.addUserMessage(message);
            textarea.value = '';
            textarea.style.height = 'auto';
            sendBtn.disabled = true;
            sendBtn.textContent = 'Sending...';

            try {
                // Show typing indicator
                this.setTyping(true);

                // Execute agent
                const response = await this.plugin.agentManager.executeAgent(
                    this.selectedAgentId,
                    message
                );

                // Hide typing indicator
                this.setTyping(false);

                // Add agent response
                const sources = response.sources.map((source: any) => ({
                    documentTitle: source.document_title,
                    section: source.section
                }));
                this.addAgentMessage(response.answer, sources);

            } catch (error: unknown) {
                // Hide typing indicator
                this.setTyping(false);
                
                const errorMessage = error instanceof Error ? error.message : String(error);
                
                // Provide more helpful error messages
                if (errorMessage.includes('LLM provider not found')) {
                    this.addAgentMessage(`❌ **LLM Provider Not Configured**\n\nNo AI provider is currently configured and enabled. Please:\n\n1. Go to **Settings** → **AI Providers**\n2. Configure and enable an AI provider (OpenAI, Anthropic, etc.)\n3. Make sure to enter your API key and test the provider\n4. Return to chat and try again`);
                } else if (errorMessage.includes('Master password')) {
                    this.addAgentMessage(`❌ **Authentication Required**\n\nPlease enter your master password to continue. This is required to decrypt your API keys.`);
                } else {
                    this.addAgentMessage(`❌ **Error**: ${errorMessage}`);
                }
            } finally {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send';
            }
        };

        sendBtn.addEventListener('click', sendMessage);
        
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Auto-resize textarea
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        });
    }

    private addUserMessage(content: string): void {
        const message = {
            id: Date.now().toString(),
            type: 'user',
            content,
            timestamp: Date.now()
        };
        this.messages.push(message);
        this.renderMessage(message);
    }

    private addAgentMessage(content: string, sources?: Array<{documentTitle: string; section: string}>): void {
        const message = {
            id: Date.now().toString(),
            type: 'agent',
            content,
            timestamp: Date.now(),
            sources
        };
        this.messages.push(message);
        this.renderMessage(message);
    }

    private addSystemMessage(content: string): void {
        const message = {
            id: Date.now().toString(),
            type: 'system',
            content,
            timestamp: Date.now()
        };
        this.messages.push(message);
        this.renderMessage(message, true);
    }

    private setTyping(isTyping: boolean): void {
        this.isTyping = isTyping;
        this.updateTypingIndicator();
    }

    private renderMessage(message: any, isSystem: boolean = false): void {
        const messagesArea = this.contentEl.querySelector('#messages-area');
        if (!messagesArea) return;

        // Remove welcome message if it exists
        const welcomeMessage = messagesArea.querySelector('.text-center');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in`;
        
        const icon = message.type === 'user' ? '👤' : (isSystem ? 'ℹ️' : '<img src="assets/Mnemosyne-Icon-24.svg" alt="Mnemosyne" class="w-5 h-5" />');
        const time = new Date(message.timestamp).toLocaleTimeString();

        messageDiv.innerHTML = `
            <div class="max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}">
                <div class="flex items-center gap-2 mb-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}">
                    <span class="text-lg">${icon}</span>
                    <span class="text-xs text-slate-60 font-medium">${time}</span>
                </div>
                <div class="px-4 py-3 rounded-2xl ${
                    message.type === 'user' 
                        ? 'bg-primary text-white rounded-br-md' 
                        : isSystem 
                            ? 'bg-slate-0o5 text-slate-60 text-center border border-slate-20' 
                            : 'bg-slate-0o5 text-slate-100 border border-slate-20 rounded-bl-md'
                } shadow-sm">
                    <div class="whitespace-pre-wrap">${message.content}</div>
                    ${message.sources && message.sources.length > 0 ? `
                        <div class="mt-3 pt-3 border-t border-slate-20">
                            <div class="flex items-center gap-2 text-sm font-semibold text-slate-100 mb-2">
                                <span>📚</span>
                                <span>Sources:</span>
                            </div>
                            <ul class="text-xs text-slate-60 space-y-1">
                                ${message.sources.map((source: any) => 
                                    `<li>• ${source.documentTitle} - ${source.section}</li>`
                                ).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        messagesArea.appendChild(messageDiv);
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    private updateTypingIndicator(): void {
        const messagesArea = this.contentEl.querySelector('#messages-area');
        if (!messagesArea) return;

        // Remove existing typing indicator
        const existingTyping = messagesArea.querySelector('.typing-indicator');
        if (existingTyping) {
            existingTyping.remove();
        }

        if (this.isTyping) {
            const typingDiv = document.createElement('div');
            typingDiv.className = 'flex justify-start animate-slide-in typing-indicator';
            typingDiv.innerHTML = `
                <div class="max-w-[80%]">
                    <div class="flex items-center gap-2 mb-2">
                        <img src="assets/Mnemosyne-Icon-24.svg" alt="Mnemosyne" class="w-5 h-5" />
                        <span class="text-xs text-slate-60 font-medium">Now</span>
                    </div>
                    <div class="px-4 py-3 rounded-2xl bg-slate-0o5 text-slate-100 border border-slate-20 rounded-bl-md shadow-sm">
                        <div class="flex items-center gap-2">
                            <div class="flex gap-1">
                                <span class="w-2 h-2 bg-slate-60 rounded-full animate-typing"></span>
                                <span class="w-2 h-2 bg-slate-60 rounded-full animate-typing" style="animation-delay: 0.2s"></span>
                                <span class="w-2 h-2 bg-slate-60 rounded-full animate-typing" style="animation-delay: 0.4s"></span>
                            </div>
                            <span class="text-slate-60 italic">Agent is typing...</span>
                        </div>
                    </div>
                </div>
            `;
            messagesArea.appendChild(typingDiv);
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    }

    private getAgentName(agentId: string): string {
        const agent = this.agents.find(a => a.id === agentId);
        return agent ? agent.name : 'Unknown Agent';
    }
}
