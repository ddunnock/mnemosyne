import { WorkspaceLeaf, ItemView } from 'obsidian';

export const VIEW_TYPE_SVELTE_CHAT = 'svelte-chat-view';

export class SvelteChatView extends ItemView {
    private chatComponent: any = null;
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
        return VIEW_TYPE_SVELTE_CHAT;
    }

    getDisplayText() {
        return 'Mnemosyne Chat';
    }

    async onOpen() {
        console.log('Opening SvelteChatView');
        await this.initializeChat();
    }

    async onClose() {
        console.log('Closing SvelteChatView');
        if (this.chatComponent) {
            this.chatComponent.$destroy();
            this.chatComponent = null;
        }
    }

    private async initializeChat() {
        console.log('Initializing Svelte chat');
        
        if (this.chatComponent) {
            this.chatComponent.$destroy();
        }

        // Get agents
        this.agents = this.plugin.agentManager.listAgents();
        console.log('Available agents:', this.agents);

        try {
            // Load the built Svelte component via script tag
            await this.loadSvelteComponent();
            
        } catch (error) {
            console.error('Failed to load Svelte component:', error);
            // Fallback to vanilla implementation
            this.renderFallbackChat();
        }
    }

    private setupEventListeners() {
        // Listen for agent change events
        document.addEventListener('agentChange', (event: any) => {
            console.log('Agent changed to:', event.detail.agentId);
            this.selectedAgentId = event.detail.agentId;
            this.addSystemMessage(`Switched to ${this.getAgentName(event.detail.agentId)}`);
        });

        // Listen for send message events
        document.addEventListener('sendMessage', async (event: any) => {
            console.log('Sending message:', event.detail.message);
            await this.handleSendMessage(event.detail.message);
        });
    }

    private async handleSendMessage(message: string): Promise<void> {
        if (!this.selectedAgentId) return;

        try {
            // Add user message
            this.addUserMessage(message);

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
            this.addAgentMessage(`❌ Error: ${errorMessage}`);
        }
    }

    private addUserMessage(content: string): void {
        const message = {
            id: Date.now().toString(),
            type: 'user',
            content,
            timestamp: Date.now()
        };
        this.messages.push(message);
        this.updateComponent();
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
        this.updateComponent();
    }

    private addSystemMessage(content: string): void {
        const message = {
            id: Date.now().toString(),
            type: 'system',
            content,
            timestamp: Date.now()
        };
        this.messages.push(message);
        this.updateComponent();
    }

    private setTyping(isTyping: boolean): void {
        this.isTyping = isTyping;
        this.updateComponent();
    }

    private updateComponent(): void {
        if (this.chatComponent) {
            this.chatComponent.$set({
                agents: this.agents,
                selectedAgentId: this.selectedAgentId,
                messages: this.messages,
                isTyping: this.isTyping
            });
        }
    }

    private getAgentName(agentId: string): string {
        const agent = this.agents.find(a => a.id === agentId);
        return agent ? agent.name : 'Unknown Agent';
    }

    private async loadSvelteComponent() {
        // For now, let's use a simple approach and render a nice vanilla chat
        // We can enhance this later with proper Svelte integration
        this.renderModernChat();
    }

    private renderModernChat() {
        console.log('Rendering modern chat interface');
        this.contentEl.innerHTML = `
            <div class="modern-chat-container">
                <div class="chat-header">
                    <div class="chat-title">
                        <span class="title-icon">🧠</span>
                        <span class="title-text">Mnemosyne Chat</span>
                    </div>
                    <div class="agent-selector">
                        <label for="agent-dropdown" class="agent-label">Agent:</label>
                        <select id="agent-dropdown" class="agent-dropdown">
                            <option value="">Select an agent...</option>
                            ${this.agents.map(agent => 
                                `<option value="${agent.id}">${agent.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="messages-area" id="messages-area">
                    <div class="welcome-message">
                        <div class="welcome-icon">👋</div>
                        <div class="welcome-text">
                            <strong>Welcome to Mnemosyne Chat!</strong><br>
                            Select an agent above to start chatting.
                        </div>
                    </div>
                </div>
                
                <div class="input-area">
                    <div class="input-container">
                        <textarea 
                            id="message-input" 
                            class="message-input" 
                            placeholder="Select an agent to start chatting"
                            disabled
                        ></textarea>
                        <button id="send-button" class="send-button" disabled>Send</button>
                    </div>
                </div>
            </div>
        `;

        // Attach event listeners
        this.attachModernEventListeners();
    }

    private attachModernEventListeners() {
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
                this.addAgentMessage(`❌ Error: ${errorMessage}`);
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

    private renderFallbackChat() {
        console.log('Rendering fallback chat interface');
        this.contentEl.innerHTML = `
            <div class="fallback-chat">
                <div class="chat-header">
                    <h3>🧠 Mnemosyne Chat</h3>
                    <p>Loading Svelte components...</p>
                </div>
                <div class="messages-area">
                    <div class="welcome-message">
                        <p>Welcome to Mnemosyne Chat!</p>
                        <p>Setting up the interface...</p>
                    </div>
                </div>
            </div>
        `;
    }
}
