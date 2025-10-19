import { WorkspaceLeaf, ItemView } from 'obsidian';
import { AgentChatSidebar } from '../ui/sidebar/AgentChatSidebar';

export const VIEW_TYPE_AGENT_CHAT = 'agent-chat-view';

export class AgentChatView extends ItemView {
    private chatSidebar: AgentChatSidebar | null = null;
    private plugin: any; // Will be set by the plugin

    constructor(leaf: WorkspaceLeaf, plugin: any) {
        super(leaf);
        this.plugin = plugin;
        this.icon = 'message-square';
    }

    getViewType() {
        return VIEW_TYPE_AGENT_CHAT;
    }

    getDisplayText() {
        return 'Mnemosyne Chat';
    }

    async onOpen() {
        // Initialize chat when view opens
        this.initializeChat();
    }

    async onClose() {
        // Clean up when view closes
        if (this.chatSidebar) {
            this.chatSidebar.destroy();
            this.chatSidebar = null;
        }
    }

    private initializeChat() {
        console.log('Initializing chat in AgentChatView');
        
        if (this.chatSidebar) {
            this.chatSidebar.destroy();
        }

        this.chatSidebar = new AgentChatSidebar(
            this.plugin,
            (agentId: string) => this.handleAgentChange(agentId),
            (message: string) => this.handleSendMessage(message)
        );

        // Render the chat interface
        console.log('Rendering chat sidebar to contentEl:', this.contentEl);
        this.chatSidebar.render(this.contentEl);

        // Update agents list
        const agents = this.plugin.agentManager.listAgents();
        console.log('Available agents:', agents);
        this.chatSidebar.updateAgents(agents);
    }

    private handleAgentChange(agentId: string): void {
        console.log('Agent changed to:', agentId);
        // Could add agent-specific initialization here
    }

    private async handleSendMessage(message: string): Promise<void> {
        if (!this.chatSidebar || !this.chatSidebar.state.selectedAgentId) return;

        try {
            // Show typing indicator
            this.chatSidebar.setTyping(true);

            // Execute agent
            const response = await this.plugin.agentManager.executeAgent(
                this.chatSidebar.state.selectedAgentId,
                message
            );

            // Hide typing indicator
            this.chatSidebar.setTyping(false);

            // Add agent response
            const sources = response.sources.map((source: any) => ({
                documentTitle: source.document_title,
                section: source.section
            }));
            this.chatSidebar.addAgentMessage(response.answer, sources);

        } catch (error: unknown) {
            // Hide typing indicator
            this.chatSidebar.setTyping(false);
            
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.chatSidebar.addAgentMessage(`❌ Error: ${errorMessage}`);
        }
    }

}
