<script lang="ts">
    import { onMount } from 'svelte';
    import MessageContainer from './MessageContainer.svelte';
    import ChatInput from './ChatInput.svelte';
    import AgentSelector from './AgentSelector.svelte';
    
    export let plugin: any;
    export let agents: any[] = [];
    export let selectedAgentId: string | null = null;
    export let messages: any[] = [];
    export let isTyping: boolean = false;
    
    let chatContainer: HTMLDivElement;
    let isAutoScrolling = true;
    
    $: if (chatContainer && isTyping && isAutoScrolling) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    function handleAgentChange(agentId: string) {
        selectedAgentId = agentId;
        // Dispatch event to parent
        const event = new CustomEvent('agentChange', { detail: { agentId } });
        document.dispatchEvent(event);
    }
    
    function handleSendMessage(message: string) {
        // Dispatch event to parent
        const event = new CustomEvent('sendMessage', { detail: { message } });
        document.dispatchEvent(event);
    }
    
    function handleScroll() {
        isAutoScrolling = chatContainer.scrollTop + chatContainer.clientHeight + 1 >= chatContainer.scrollHeight;
    }
</script>

<div class="chat-container">
    <!-- Header with agent selection -->
    <div class="chat-header">
        <div class="chat-title">
            <span class="title-icon">🧠</span>
            <span class="title-text">Mnemosyne Chat</span>
        </div>
        <AgentSelector 
            {agents} 
            {selectedAgentId} 
            on:agentChange={(e) => handleAgentChange(e.detail.agentId)}
        />
    </div>
    
    <!-- Messages area -->
    <div 
        bind:this={chatContainer}
        class="messages-area"
        on:scroll={handleScroll}
    >
        {#if messages.length === 0}
            <div class="welcome-message">
                <div class="welcome-icon">👋</div>
                <div class="welcome-text">
                    <strong>Welcome to Mnemosyne Chat!</strong><br>
                    Select an agent above to start chatting.
                </div>
            </div>
        {:else}
            {#each messages as message (message.id)}
                <MessageContainer {message} />
            {/each}
        {/if}
        
        {#if isTyping}
            <div class="typing-indicator">
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
                <span>Agent is typing...</span>
            </div>
        {/if}
    </div>
    
    <!-- Input area -->
    <div class="input-area">
        <ChatInput 
            {selectedAgentId}
            on:sendMessage={(e) => handleSendMessage(e.detail.message)}
        />
    </div>
</div>

<style>
    .chat-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--background-primary);
    }
    
    .chat-header {
        padding: 16px;
        border-bottom: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
        flex-shrink: 0;
    }
    
    .chat-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: var(--text-normal);
        margin-bottom: 12px;
    }
    
    .title-icon {
        font-size: 1.2em;
    }
    
    .title-text {
        font-size: 1.1em;
    }
    
    .messages-area {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-height: 0;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        background: var(--background-primary);
    }
    
    .welcome-message {
        background: var(--background-secondary);
        border-radius: 12px;
        padding: 16px;
        border-left: 4px solid var(--interactive-accent);
        text-align: center;
    }
    
    .welcome-icon {
        font-size: 2em;
        margin-bottom: 8px;
    }
    
    .welcome-text {
        color: var(--text-normal);
        line-height: 1.4;
    }
    
    .typing-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: var(--background-modifier-hover);
        border-radius: 18px;
        color: var(--text-muted);
        font-style: italic;
        max-width: fit-content;
    }
    
    .typing-dots {
        display: flex;
        gap: 4px;
    }
    
    .typing-dots span {
        width: 6px;
        height: 6px;
        background: var(--text-muted);
        border-radius: 50%;
        animation: typing 1.4s infinite ease-in-out;
    }
    
    .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
    .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes typing {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
    }
    
    .input-area {
        padding: 16px;
        background: var(--background-primary);
        flex-shrink: 0;
        position: sticky;
        bottom: 0;
    }
</style>
