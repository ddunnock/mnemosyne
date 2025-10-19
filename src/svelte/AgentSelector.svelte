<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    
    export let agents: any[] = [];
    export let selectedAgentId: string | null = null;
    
    const dispatch = createEventDispatcher();
    
    function handleChange(event: Event) {
        const target = event.target as HTMLSelectElement;
        if (target.value) {
            selectedAgentId = target.value;
            dispatch('agentChange', { agentId: target.value });
        }
    }
</script>

<div class="agent-selector">
    <label for="agent-dropdown" class="agent-label">Agent:</label>
    <select 
        id="agent-dropdown" 
        class="agent-dropdown"
        bind:value={selectedAgentId}
        on:change={handleChange}
    >
        <option value="">Select an agent...</option>
        {#each agents as agent}
            <option value={agent.id}>{agent.name}</option>
        {/each}
    </select>
</div>

<style>
    .agent-selector {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    
    .agent-label {
        font-size: 0.9em;
        font-weight: 500;
        color: var(--text-normal);
    }
    
    .agent-dropdown {
        padding: 8px 12px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        background: var(--background-primary);
        color: var(--text-normal);
        font-size: 0.9em;
        cursor: pointer;
        transition: border-color 0.2s ease;
    }
    
    .agent-dropdown:focus {
        outline: none;
        border-color: var(--interactive-accent);
        box-shadow: 0 0 0 2px var(--interactive-accent-hover);
    }
</style>
