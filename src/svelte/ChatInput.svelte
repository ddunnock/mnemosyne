<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    
    export let selectedAgentId: string | null = null;
    
    const dispatch = createEventDispatcher();
    
    let textarea: HTMLTextAreaElement;
    let message = '';
    
    function handleSend() {
        if (!message.trim() || !selectedAgentId) return;
        
        dispatch('sendMessage', { message: message.trim() });
        message = '';
        updateHeight();
    }
    
    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    }
    
    function updateHeight() {
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        }
    }
    
    $: if (message) {
        updateHeight();
    }
</script>

<div class="input-container">
    <textarea
        bind:this={textarea}
        bind:value={message}
        placeholder={selectedAgentId ? 'Type your message...' : 'Select an agent to start chatting'}
        disabled={!selectedAgentId}
        on:keydown={handleKeydown}
        class="message-input"
    ></textarea>
    
    <button
        on:click={handleSend}
        disabled={!selectedAgentId || !message.trim()}
        class="send-button"
    >
        Send
    </button>
</div>

<style>
    .input-container {
        display: flex;
        gap: 8px;
        align-items: flex-end;
    }
    
    .message-input {
        flex: 1;
        min-height: 40px;
        max-height: 120px;
        padding: 10px 14px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 20px;
        background: var(--background-primary);
        color: var(--text-normal);
        font-family: inherit;
        font-size: 14px;
        resize: none;
        outline: none;
        transition: border-color 0.2s ease;
    }
    
    .message-input:focus {
        border-color: var(--interactive-accent);
        box-shadow: 0 0 0 2px var(--interactive-accent-hover);
    }
    
    .message-input:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .send-button {
        padding: 10px 16px;
        background: var(--interactive-accent);
        color: white;
        border: none;
        border-radius: 20px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
    }
    
    .send-button:hover:not(:disabled) {
        background: var(--interactive-accent-hover);
        transform: translateY(-1px);
    }
    
    .send-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
    }
</style>
