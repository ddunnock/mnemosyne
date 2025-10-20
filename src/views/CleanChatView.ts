import { WorkspaceLeaf, ItemView } from 'obsidian';

export const VIEW_TYPE_CLEAN_CHAT = 'clean-chat-view';

export class CleanChatView extends ItemView {
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
        return VIEW_TYPE_CLEAN_CHAT;
    }

    getDisplayText() {
        return 'Mnemosyne Chat';
    }

    async onOpen() {
        console.log('Opening CleanChatView');
        this.initializeChat();
    }

    async onClose() {
        console.log('Closing CleanChatView');
        // Clean up any event listeners
    }

    private initializeChat() {
        console.log('Initializing clean chat');
        
        // Get agents
        this.agents = this.plugin.agentManager.listAgents();
        console.log('Available agents:', this.agents);

        // Render the chat interface
        this.renderChat();
    }

    private renderChat() {
        this.contentEl.empty();
        this.contentEl.addClass('clean-chat-container');

        // Header
        const header = this.contentEl.createDiv({ cls: 'chat-header' });
        header.innerHTML = `
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
        `;

        // Messages area
        const messagesArea = this.contentEl.createDiv({ cls: 'messages-area' });
        messagesArea.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">👋</div>
                <div class="welcome-text">
                    <strong>Welcome to Mnemosyne Chat!</strong><br>
                    Select an agent above to start chatting.
                </div>
            </div>
        `;

        // Input area
        const inputArea = this.contentEl.createDiv({ cls: 'input-area' });
        inputArea.innerHTML = `
            <div class="input-container">
                <textarea 
                    id="message-input" 
                    class="message-input" 
                    placeholder="Select an agent to start chatting"
                    disabled
                ></textarea>
                <button id="send-button" class="send-button" disabled>Send</button>
            </div>
        `;

        // Attach event listeners
        this.attachEventListeners();
    }

    private attachEventListeners() {
        const dropdown = this.contentEl.querySelector('#agent-dropdown') as HTMLSelectElement;
        const textarea = this.contentEl.querySelector('#message-input') as HTMLTextAreaElement;
        const sendBtn = this.contentEl.querySelector('#send-button') as HTMLButtonElement;

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
        const messagesArea = this.contentEl.querySelector('.messages-area');
        if (!messagesArea) return;

        // Remove welcome message if it exists
        const welcomeMessage = messagesArea.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageDiv = messagesArea.createDiv({ 
            cls: `message ${message.type}-message ${isSystem ? 'system-message' : ''}` 
        });

        const icon = message.type === 'user' ? '👤' : (isSystem ? 'ℹ️' : '🤖');
        const time = new Date(message.timestamp).toLocaleTimeString();

        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-icon">${icon}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">${message.content}</div>
            ${message.sources && message.sources.length > 0 ? `
                <div class="message-sources">
                    <div class="sources-header">📚 Sources:</div>
                    <ul class="sources-list">
                        ${message.sources.map((source: any) => 
                            `<li>${source.documentTitle} - ${source.section}</li>`
                        ).join('')}
                    </ul>
                </div>
            ` : ''}
        `;

        // Scroll to bottom
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }

    private updateTypingIndicator(): void {
        const messagesArea = this.contentEl.querySelector('.messages-area');
        if (!messagesArea) return;

        // Remove existing typing indicator
        const existingTyping = messagesArea.querySelector('.typing-indicator');
        if (existingTyping) {
            existingTyping.remove();
        }

        if (this.isTyping) {
            const typingDiv = messagesArea.createDiv({ cls: 'typing-indicator' });
            typingDiv.innerHTML = `
                <div class="message agent-message">
                    <div class="message-header">
                        <span class="message-icon">🤖</span>
                        <span class="message-time">Now</span>
                    </div>
                    <div class="message-content">
                        <div class="typing-dots">
                            <span></span><span></span><span></span>
                        </div>
                        Agent is typing...
                    </div>
                </div>
            `;
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    }

    private getAgentName(agentId: string): string {
        const agent = this.agents.find(a => a.id === agentId);
        return agent ? agent.name : 'Unknown Agent';
    }
}
