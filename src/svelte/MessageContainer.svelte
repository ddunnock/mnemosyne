<script lang="ts">
    export let message: any;
    
    $: isUser = message.type === 'user';
    $: isSystem = message.type === 'system';
    $: time = new Date(message.timestamp).toLocaleTimeString();
</script>

<div class="message {isUser ? 'user-message' : 'agent-message'} {isSystem ? 'system-message' : ''}">
    <div class="message-header">
        <span class="message-icon">{isUser ? '👤' : (isSystem ? 'ℹ️' : '🤖')}</span>
        <span class="message-time">{time}</span>
    </div>
    
    <div class="message-content">
        {message.content}
    </div>
    
    {#if message.sources && message.sources.length > 0}
        <div class="message-sources">
            <div class="sources-header">📚 Sources:</div>
            <ul class="sources-list">
                {#each message.sources as source}
                    <li>{source.documentTitle} - {source.section}</li>
                {/each}
            </ul>
        </div>
    {/if}
</div>

<style>
    .message {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-width: 85%;
    }
    
    .user-message {
        align-self: flex-end;
    }
    
    .agent-message {
        align-self: flex-start;
    }
    
    .system-message {
        align-self: center;
        max-width: 100%;
        background: var(--background-secondary);
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 0.9em;
        color: var(--text-muted);
        text-align: center;
    }
    
    .message-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
    }
    
    .message-icon {
        font-size: 1.1em;
    }
    
    .message-time {
        font-size: 0.75em;
        color: var(--text-muted);
    }
    
    .user-message .message-content {
        background: var(--interactive-accent);
        color: white;
        padding: 12px 16px;
        border-radius: 18px 18px 4px 18px;
        word-wrap: break-word;
        line-height: 1.4;
    }
    
    .agent-message .message-content {
        background: var(--background-secondary);
        color: var(--text-normal);
        padding: 12px 16px;
        border-radius: 18px 18px 18px 4px;
        word-wrap: break-word;
        line-height: 1.4;
    }
    
    .message-sources {
        margin-top: 8px;
        padding: 8px;
        background: var(--background-primary);
        border-radius: 6px;
        border: 1px solid var(--background-modifier-border);
    }
    
    .sources-header {
        font-size: 0.85em;
        font-weight: 600;
        color: var(--text-normal);
        margin-bottom: 4px;
    }
    
    .sources-list {
        margin: 0;
        padding-left: 12px;
        font-size: 0.8em;
        color: var(--text-muted);
    }
    
    .sources-list li {
        margin-bottom: 2px;
    }
</style>
