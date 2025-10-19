import { Plugin, Notice } from 'obsidian';
import { AgentConfig } from '../../types';

export interface AgentInfo {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
}

export interface AgentChatSidebarState {
    selectedAgentId: string | null;
    messages: ChatMessage[];
    isTyping: boolean;
}

export interface ChatMessage {
    id: string;
    type: 'user' | 'agent';
    content: string;
    timestamp: number;
    sources?: Array<{
        documentTitle: string;
        section: string;
    }>;
}

export class AgentChatSidebar {
    private plugin: Plugin;
    private container: HTMLElement | null = null;
    public state: AgentChatSidebarState;
    private onAgentChange: (agentId: string) => void;
    private onSendMessage: (message: string) => void;

    constructor(
        plugin: Plugin,
        onAgentChange: (agentId: string) => void,
        onSendMessage: (message: string) => void
    ) {
        this.plugin = plugin;
        this.onAgentChange = onAgentChange;
        this.onSendMessage = onSendMessage;
        this.state = {
            selectedAgentId: null,
            messages: [],
            isTyping: false,
        };
    }

    render(container: HTMLElement): void {
        console.log('AgentChatSidebar.render called with container:', container);
        this.container = container;
        this.container.empty();
        this.container.addClass('agent-chat-sidebar');

        // Main container with flex layout
        const mainContainer = this.container.createDiv({ cls: 'chat-main-container' });
        console.log('Created main container:', mainContainer);
        
        // Header with agent selection
        this.renderHeader(mainContainer);
        
        // Messages area (flexible, takes up remaining space)
        this.renderMessagesArea(mainContainer);
        
        // Input area (fixed at bottom)
        this.renderInputArea(mainContainer);
        
        console.log('AgentChatSidebar render complete');
    }

    private renderHeader(container: HTMLElement): void {
        const header = container.createDiv({ cls: 'chat-header' });
        
        // Title
        const title = header.createDiv({ cls: 'chat-title' });
        title.innerHTML = `
            <div class="title-content">
                <span class="title-icon">🧠</span>
                <span class="title-text">Mnemosyne Chat</span>
            </div>
        `;

        // Agent selector
        const agentSelector = header.createDiv({ cls: 'agent-selector' });
        agentSelector.innerHTML = `
            <label for="agent-dropdown" class="agent-label">Agent:</label>
            <select id="agent-dropdown" class="agent-dropdown">
                <option value="">Select an agent...</option>
            </select>
        `;

        // Attach event listener
        const dropdown = agentSelector.querySelector('#agent-dropdown') as HTMLSelectElement;
        dropdown.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            if (target.value) {
                this.state.selectedAgentId = target.value;
                this.onAgentChange(target.value);
                this.addSystemMessage(`Switched to ${this.getAgentName(target.value)}`);
            }
        });
    }

    private renderMessagesArea(container: HTMLElement): void {
        const messagesArea = container.createDiv({ cls: 'messages-area' });
        messagesArea.innerHTML = `
            <div class="welcome-message">
                <div class="message-content">
                    <div class="welcome-icon">👋</div>
                    <div class="welcome-text">
                        <strong>Welcome to Mnemosyne Chat!</strong><br>
                        Select an agent above to start chatting.
                    </div>
                </div>
            </div>
        `;
    }

    private renderInputArea(container: HTMLElement): void {
        const inputArea = container.createDiv({ cls: 'input-area' });
        
        const inputContainer = inputArea.createDiv({ cls: 'input-container' });
        
        const textarea = inputContainer.createEl('textarea', {
            placeholder: 'Type your message...',
            cls: 'message-input'
        });
        textarea.disabled = !this.state.selectedAgentId;

        const sendBtn = inputContainer.createEl('button', { 
            text: 'Send',
            cls: 'send-button'
        });
        sendBtn.disabled = !this.state.selectedAgentId;

        // Auto-resize textarea
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        });

        // Send message
        const sendMessage = () => {
            const message = textarea.value.trim();
            if (!message || !this.state.selectedAgentId) return;

            this.addUserMessage(message);
            textarea.value = '';
            textarea.style.height = 'auto';
            sendBtn.disabled = true;
            sendBtn.textContent = 'Sending...';

            this.onSendMessage(message);
        };

        sendBtn.addEventListener('click', sendMessage);
        
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    updateAgents(agents: AgentInfo[]): void {
        const dropdown = this.container?.querySelector('#agent-dropdown') as HTMLSelectElement;
        if (!dropdown) return;

        // Clear existing options
        dropdown.innerHTML = '<option value="">Select an agent...</option>';

        // Add agent options
        agents.forEach(agent => {
            const option = dropdown.createEl('option', {
                value: agent.id,
                text: agent.name
            });
            if (agent.id === this.state.selectedAgentId) {
                option.selected = true;
            }
        });
    }

    addUserMessage(content: string): void {
        const message: ChatMessage = {
            id: Date.now().toString(),
            type: 'user',
            content,
            timestamp: Date.now()
        };
        this.state.messages.push(message);
        this.renderMessage(message);
    }

    addAgentMessage(content: string, sources?: Array<{documentTitle: string; section: string}>): void {
        const message: ChatMessage = {
            id: Date.now().toString(),
            type: 'agent',
            content,
            timestamp: Date.now(),
            sources
        };
        this.state.messages.push(message);
        this.renderMessage(message);
    }

    addSystemMessage(content: string): void {
        const message: ChatMessage = {
            id: Date.now().toString(),
            type: 'agent',
            content,
            timestamp: Date.now()
        };
        this.state.messages.push(message);
        this.renderMessage(message, true);
    }

    setTyping(isTyping: boolean): void {
        this.state.isTyping = isTyping;
        this.updateTypingIndicator();
    }

    private renderMessage(message: ChatMessage, isSystem: boolean = false): void {
        const messagesArea = this.container?.querySelector('.messages-area');
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
                        ${message.sources.map(source => 
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
        const messagesArea = this.container?.querySelector('.messages-area');
        if (!messagesArea) return;

        // Remove existing typing indicator
        const existingTyping = messagesArea.querySelector('.typing-indicator');
        if (existingTyping) {
            existingTyping.remove();
        }

        if (this.state.isTyping) {
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
        // This would need to be passed from the parent or looked up
        return 'Agent'; // Placeholder
    }

    clearMessages(): void {
        this.state.messages = [];
        const messagesArea = this.container?.querySelector('.messages-area');
        if (messagesArea) {
            messagesArea.innerHTML = `
                <div class="welcome-message">
                    <div class="message-content">
                        <div class="welcome-icon">👋</div>
                        <div class="welcome-text">
                            <strong>Welcome to Mnemosyne Chat!</strong><br>
                            Select an agent above to start chatting.
                        </div>
                    </div>
                </div>
            `;
        }
    }

    destroy(): void {
        if (this.container) {
            this.container.empty();
            this.container.removeClass('agent-chat-sidebar');
        }
    }
}
