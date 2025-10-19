/**
 * Debug script to check agent state
 * Run this in the Obsidian console to diagnose agent issues
 */

// Check if plugin is loaded
const plugin = app.plugins.plugins['mnemosyne'];
if (!plugin) {
    console.error('❌ Mnemosyne plugin not found');
} else {
    console.log('✅ Mnemosyne plugin found');
    
    // Check settings
    console.log('📋 Settings:', {
        agents: plugin.settings.agents.length,
        agentList: plugin.settings.agents.map(a => ({ id: a.id, name: a.name, enabled: a.enabled, isPermanent: a.isPermanent }))
    });
    
    // Check agent manager
    if (plugin.agentManager) {
        console.log('🤖 Agent Manager:', {
            initialized: plugin.agentManager.isReady(),
            stats: plugin.agentManager.getStats()
        });
        
        // Check if permanent agent exists in manager
        const permanentAgent = plugin.agentManager.getAgent('mnemosyne-agent-permanent');
        console.log('🔒 Permanent Agent in Manager:', permanentAgent ? 'Found' : 'NOT FOUND');
        
        if (permanentAgent) {
            console.log('✅ Permanent agent details:', permanentAgent.getInfo());
        }
    } else {
        console.error('❌ Agent Manager not initialized');
    }
    
    // Check RAG system
    if (plugin.retriever) {
        console.log('🔍 RAG System:', {
            ready: plugin.retriever.isReady(),
            stats: plugin.retriever.getStats()
        });
    } else {
        console.error('❌ RAG Retriever not found');
    }
    
    // Check LLM system
    if (plugin.llmManager) {
        console.log('🧠 LLM Manager:', {
            ready: plugin.llmManager.isReady(),
            providers: plugin.llmManager.getStats()
        });
    } else {
        console.error('❌ LLM Manager not found');
    }
}
