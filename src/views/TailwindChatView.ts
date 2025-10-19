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
                        <svg viewBox="0 0 128 128" fill="currentColor" style="width: 64px; height: 64px;">
                            <path d="M60.05,113.45c-.3,2.81-.36,5.59-.47,8.41-.04,1.04-.61,2.14.03,3.27,1.68.03,8.33,1.2,8.7-.86l-.65-10.81c38.47-1.92,63.45-43.68,47.07-78.73C97.52-3.12,44.98-8.81,19.68,24.08c-27.11,34.69-3.34,86.93,40.37,89.36ZM64.09,81.44c-.35.09-.4-.22-.57-.41-1.48-2.18-3.31-4.09-5.32-5.79-21.8-16.12,8.61-38.21,18.64-16.07,2.97,10.67-8.14,14.79-12.75,22.27ZM59.21,7.7c67.21-6.25,75.1,97.02,7.7,100.35v-16.36l13.93.14c1.41-.47,1.29-4.28.35-5.27h-13.8c6.85-10.41,19.34-15.52,14.65-30.76,8.75,4.94,13.57,16.15,14.03,25.89.44.75,4.33.72,4.72-.17.45-1.03.09-1.51.04-2.39-.75-15.75-11.9-28.28-26.61-32.97,8.37-4.06,13.82-13.02,12.94-22.46.07-4.1-4.7-1.94-7.05-1.31,4.7,24.71-34.29,27.36-32.75,2.29.1-1.05.96-1.93-.18-2.51-.94-.48-5.14-1.25-5.81-.55-.23.23-.49,1.29-.54,1.66-1.24,8.89,4.25,18.49,12.03,22.52.25.23.44.35.36.73-13.61,3.23-25.06,16.89-26.13,30.89-.05.76-.14,3.57.04,4.12.26.82,4.77,1.41,5.08-.71-.19-9.78,5.23-19.69,13.44-25.01-1.98,6.04-.64,12.27,3.08,17.31,3.53,4.98,9.2,7.88,11.57,13.45h-13.55c-1.31,0-.89,4.23-.61,5.13h14.65v16.36C-.08,105.81-2.2,12.67,59.21,7.7Z"/>
                            <path d="M62.69,56.59c-10.77,3.15-2.17,18.62,5.92,10.56,3.74-4.53-.07-11.56-5.92-10.56Z" fill="#0A66FF"/>
                        </svg>
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

            // First, try to automatically initialize the system
            await this.attemptAutoInitialization();

            // Check initialization status after auto-init attempt
            const initStatus = await this.checkInitializationStatus();
            if (!initStatus.isReady) {
                this.showInitializationMessage(initStatus);
                return;
            }

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
        
        const icon = message.type === 'user' ? '👤' : (isSystem ? 'ℹ️' : '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.26,21.27c-.06.53-.07,1.05-.09,1.58,0,.19-.11.4,0,.61.31,0,1.56.22,1.63-.16l-.12-2.03c7.21-.36,11.9-8.19,8.83-14.76C18.28-.59,8.43-1.65,3.69,4.52c-5.08,6.5-.63,16.3,7.57,16.76ZM12.02,15.27c-.07.02-.08-.04-.11-.08-.28-.41-.62-.77-1-1.09-4.09-3.02,1.61-7.16,3.5-3.01.56,2-1.53,2.77-2.39,4.18ZM11.1,1.44c12.6-1.17,14.08,18.19,1.44,18.82v-3.07l2.61.03c.26-.09.24-.8.07-.99h-2.59c1.28-1.95,3.63-2.91,2.75-5.77,1.64.93,2.54,3.03,2.63,4.85.08.14.81.14.89-.03.08-.19.02-.28,0-.45-.14-2.95-2.23-5.3-4.99-6.18,1.57-.76,2.59-2.44,2.43-4.21.01-.77-.88-.36-1.32-.25.88,4.63-6.43,5.13-6.14.43.02-.2.18-.36-.03-.47-.18-.09-.96-.23-1.09-.1-.04.04-.09.24-.1.31-.23,1.67.8,3.47,2.25,4.22.05.04.08.07.07.14-2.55.61-4.7,3.17-4.9,5.79-.01.14-.03.67,0,.77.05.15.89.26.95-.13-.03-1.83.98-3.69,2.52-4.69-.37,1.13-.12,2.3.58,3.25.66.93,1.73,1.48,2.17,2.52h-2.54c-.25,0-.17.79-.11.96h2.75v3.07C-.01,19.84-.41,2.38,11.1,1.44Z"/><path d="M11.75,10.61c-2.02.59-.41,3.49,1.11,1.98.7-.85-.01-2.17-1.11-1.98Z"/></svg>');
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
                        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.26,21.27c-.06.53-.07,1.05-.09,1.58,0,.19-.11.4,0,.61.31,0,1.56.22,1.63-.16l-.12-2.03c7.21-.36,11.9-8.19,8.83-14.76C18.28-.59,8.43-1.65,3.69,4.52c-5.08,6.5-.63,16.3,7.57,16.76ZM12.02,15.27c-.07.02-.08-.04-.11-.08-.28-.41-.62-.77-1-1.09-4.09-3.02,1.61-7.16,3.5-3.01.56,2-1.53,2.77-2.39,4.18ZM11.1,1.44c12.6-1.17,14.08,18.19,1.44,18.82v-3.07l2.61.03c.26-.09.24-.8.07-.99h-2.59c1.28-1.95,3.63-2.91,2.75-5.77,1.64.93,2.54,3.03,2.63,4.85.08.14.81.14.89-.03.08-.19.02-.28,0-.45-.14-2.95-2.23-5.3-4.99-6.18,1.57-.76,2.59-2.44,2.43-4.21.01-.77-.88-.36-1.32-.25.88,4.63-6.43,5.13-6.14.43.02-.2.18-.36-.03-.47-.18-.09-.96-.23-1.09-.1-.04.04-.09.24-.1.31-.23,1.67.8,3.47,2.25,4.22.05.04.08.07.07.14-2.55.61-4.7,3.17-4.9,5.79-.01.14-.03.67,0,.77.05.15.89.26.95-.13-.03-1.83.98-3.69,2.52-4.69-.37,1.13-.12,2.3.58,3.25.66.93,1.73,1.48,2.17,2.52h-2.54c-.25,0-.17.79-.11.96h2.75v3.07C-.01,19.84-.41,2.38,11.1,1.44Z"/>
                            <path d="M11.75,10.61c-2.02.59-.41,3.49,1.11,1.98.7-.85-.01-2.17-1.11-1.98Z"/>
                        </svg>
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

    /**
     * Attempt to automatically initialize the system
     */
    private async attemptAutoInitialization(): Promise<void> {
        try {
            console.log('=== Attempting Automatic Initialization ===');
            
            // First, ensure KeyManager is ready (needed for LLM providers)
            const keyManagerReady = this.plugin.keyManager && this.plugin.keyManager.hasMasterPassword();
            const sessionPasswordReady = this.plugin.sessionPasswordCache !== null;
            console.log('KeyManager ready:', keyManagerReady);
            console.log('Session password ready:', sessionPasswordReady);
            
            if (!keyManagerReady && !sessionPasswordReady) {
                console.log('Neither KeyManager nor session password ready - cannot initialize LLM providers');
                
                // First, try to restore password from KeyManager if it exists
                if (this.plugin.keyManager) {
                    console.log('Attempting to restore password from KeyManager...');
                    try {
                        // Check if KeyManager has a password but it's not in session cache
                        const hasPassword = this.plugin.keyManager.hasMasterPassword();
                        console.log('KeyManager has password:', hasPassword);
                        
                        if (hasPassword) {
                            // KeyManager has password but session cache is empty - try to restore it
                            console.log('KeyManager has password but session cache is empty - attempting to restore session cache');
                            
                            // Try to restore the password from KeyManager to session cache
                            // This is a workaround for the session cache synchronization issue
                            try {
                                // We can't directly get the password from KeyManager, but we can try to initialize
                                // the LLM Manager directly since KeyManager is ready
                                if (this.plugin.llmManager && !this.plugin.llmManager.isReady()) {
                                    console.log('Attempting to initialize LLM Manager with existing KeyManager password...');
                                    await this.plugin.llmManager.initialize();
                                    console.log('LLM Manager initialized with existing KeyManager password');
                                    
                                    // If successful, we don't need to prompt for password
                                    return;
                                }
                            } catch (error) {
                                console.warn('Failed to initialize LLM Manager with existing KeyManager password:', error);
                            }
                        }
                    } catch (error) {
                        console.warn('Failed to check KeyManager password:', error);
                    }
                }
                
                console.log('Attempting to prompt for master password...');
                
                // Try to prompt for master password if not available
                try {
                    await this.plugin.settingsController.ensureMasterPasswordLoaded();
                    console.log('Master password prompt completed');
                    
                    // Check if the session cache was set after the prompt
                    console.log('Session password cache after prompt:', this.plugin.sessionPasswordCache ? 'Set' : 'Not set');
                    console.log('KeyManager ready after prompt:', this.plugin.keyManager && this.plugin.keyManager.hasMasterPassword());
                    
                    // Now that we have the password, try to initialize LLM Manager
                    if (this.plugin.llmManager && !this.plugin.llmManager.isReady()) {
                        console.log('Attempting to initialize LLM Manager after password prompt...');
                        try {
                            await this.plugin.llmManager.initialize();
                            console.log('LLM Manager initialization after password prompt completed');
                        } catch (error) {
                            console.error('LLM Manager initialization after password prompt failed:', error);
                        }
                    }
                } catch (error) {
                    console.warn('Failed to prompt for master password:', error);
                }
                return;
            }
            
            // Try to initialize LLM Manager if not ready
            if (this.plugin.llmManager && !this.plugin.llmManager.isReady()) {
                console.log('Initializing LLM Manager...');
                try {
                    await this.plugin.llmManager.initialize();
                    console.log('LLM Manager initialization completed');
                } catch (error) {
                    console.error('LLM Manager initialization failed:', error);
                }
            } else {
                console.log('LLM Manager already ready');
            }
            
            // Check LLM Manager status after initialization attempt
            const llmReadyAfter = this.plugin.llmManager && this.plugin.llmManager.isReady();
            console.log('LLM Manager ready after initialization:', llmReadyAfter);
            
            // Try to initialize Agent Manager if not ready
            if (this.plugin.agentManager && !this.plugin.agentManager.isReady()) {
                console.log('Initializing Agent Manager...');
                await this.plugin.agentManager.initialize();
                console.log('Agent Manager initialization completed');
            } else {
                console.log('Agent Manager already ready');
            }
            
            // Try to initialize RAG Retriever if not ready
            if (this.plugin.ragRetriever && !this.plugin.ragRetriever.isReady()) {
                console.log('Initializing RAG Retriever...');
                await this.plugin.ragRetriever.initialize();
                console.log('RAG Retriever initialization completed');
            } else {
                console.log('RAG Retriever already ready');
            }
            
            console.log('=== Automatic initialization completed ===');
        } catch (error) {
            console.warn('Automatic initialization failed:', error);
        }
    }

    /**
     * Check if all required components are initialized
     */
    private async checkInitializationStatus(): Promise<{
        isReady: boolean;
        missingComponents: string[];
        message: string;
    }> {
        const missingComponents: string[] = [];
        
        // Debug: Check each component
        console.log('=== Initialization Status Check ===');
        
        // Check if LLM Manager is ready
        const llmManagerReady = this.plugin.llmManager && this.plugin.llmManager.isReady();
        console.log('LLM Manager ready:', llmManagerReady);
        if (this.plugin.llmManager) {
            console.log('LLM Manager exists, checking internal state...');
            // Let's check what the LLM Manager's isReady() method is actually checking
            console.log('LLM Manager stats:', this.plugin.llmManager.getStats());
        }
        if (!llmManagerReady) {
            missingComponents.push('LLM Provider');
        }
        
        // Check if Agent Manager is ready
        const agentManagerReady = this.plugin.agentManager && this.plugin.agentManager.isReady();
        console.log('Agent Manager ready:', agentManagerReady);
        if (!agentManagerReady) {
            missingComponents.push('Agent Manager');
        }
        
        // Check if RAG Retriever is ready (optional but good to check)
        const ragRetrieverReady = !this.plugin.ragRetriever || this.plugin.ragRetriever.isReady();
        console.log('RAG Retriever ready:', ragRetrieverReady);
        if (!ragRetrieverReady) {
            missingComponents.push('RAG System');
        }
        
        // Check if agents exist
        console.log('Agents count:', this.agents.length);
        if (this.agents.length === 0) {
            missingComponents.push('Agents');
        }
        
        // Check if LLM providers exist in settings
        const llmProviders = this.plugin.settings.llmConfigs || [];
        console.log('LLM Providers in settings:', llmProviders.length);
        if (llmProviders.length === 0) {
            missingComponents.push('LLM Providers');
        }
        
        // Check if KeyManager is ready (needed for LLM providers)
        const keyManagerReady = this.plugin.keyManager && this.plugin.keyManager.hasMasterPassword();
        console.log('KeyManager ready:', keyManagerReady);
        console.log('Plugin session password cache:', this.plugin.sessionPasswordCache ? 'Set' : 'Not set');
        if (!keyManagerReady) {
            missingComponents.push('Master Password');
        }
        
        const isReady = missingComponents.length === 0;
        
        let message = '';
        if (!isReady) {
            if (missingComponents.includes('LLM Providers')) {
                message = 'No AI providers configured. Please set up an OpenAI or Anthropic API key in Settings.';
            } else if (missingComponents.includes('Agents')) {
                message = 'No agents available. Please configure agents in Settings.';
            } else {
                message = `System not ready. Missing: ${missingComponents.join(', ')}. Please check Settings.`;
            }
        }
        
        return {
            isReady,
            missingComponents,
            message
        };
    }
    
    /**
     * Show initialization message to user
     */
    private showInitializationMessage(status: {
        isReady: boolean;
        missingComponents: string[];
        message: string;
    }): void {
        const messagesArea = this.containerEl.querySelector('#messages-area');
        if (!messagesArea) return;
        
        // Clear existing messages
        messagesArea.innerHTML = '';
        
        // Add initialization message
        const initMessage = document.createElement('div');
        initMessage.className = 'text-center py-8';
        initMessage.innerHTML = `
            <div class="text-6xl mb-4">⚠️</div>
            <h3 class="text-lg font-semibold text-slate-100 mb-2">Setup Required</h3>
            <p class="text-slate-60 mb-4">${status.message}</p>
            <div class="flex gap-3 justify-center">
                <button 
                    id="open-settings-btn"
                    class="px-4 py-2 bg-primary text-slate-100 font-medium rounded-xl hover:bg-slate-20 hover:shadow-md transition-all"
                >
                    Open Settings
                </button>
                <button 
                    id="refresh-status-btn"
                    class="px-4 py-2 bg-slate-20 text-slate-100 font-medium rounded-xl hover:bg-slate-30 hover:shadow-md transition-all"
                >
                    Refresh Status
                </button>
            </div>
        `;
        
        messagesArea.appendChild(initMessage);
        
        // Add click handlers
        const settingsBtn = initMessage.querySelector('#open-settings-btn');
        const refreshBtn = initMessage.querySelector('#refresh-status-btn');
        
        console.log('Settings button found:', !!settingsBtn);
        console.log('Refresh button found:', !!refreshBtn);
        
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.plugin.app.setting.open();
                this.plugin.app.setting.openTabById('mnemosyne-settings');
            });
        }
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const button = refreshBtn as HTMLButtonElement;
                
                // Show loading state
                button.textContent = 'Checking...';
                button.disabled = true;
                
                try {
                    const newStatus = await this.checkInitializationStatus();
                    if (newStatus.isReady) {
                        this.showWelcomeMessage();
                    } else {
                        // Update the message with current status
                        this.showInitializationMessage(newStatus);
                    }
                } catch (error) {
                    console.error('Error checking initialization status:', error);
                    button.textContent = 'Refresh Status';
                    button.disabled = false;
                }
            });
        }
    }
    
    /**
     * Show welcome message when system is ready
     */
    private showWelcomeMessage(): void {
        const messagesArea = this.containerEl.querySelector('#messages-area');
        if (!messagesArea) return;
        
        // Clear existing messages
        messagesArea.innerHTML = '';
        
        // Add welcome message
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'text-center py-8';
        welcomeMessage.innerHTML = `
            <div class="text-6xl mb-4">👋</div>
            <h3 class="text-lg font-semibold text-slate-100 mb-2">Welcome to Mnemosyne Chat!</h3>
            <p class="text-slate-60">Select an agent above to start your conversation.</p>
        `;
        
        messagesArea.appendChild(welcomeMessage);
        
        // Re-enable the input area
        const textarea = this.containerEl.querySelector('#message-input') as HTMLTextAreaElement;
        const sendBtn = this.containerEl.querySelector('#send-button') as HTMLButtonElement;
        
        if (textarea && sendBtn) {
            textarea.disabled = false;
            sendBtn.disabled = false;
            textarea.placeholder = 'Type your message...';
        }
    }
}
