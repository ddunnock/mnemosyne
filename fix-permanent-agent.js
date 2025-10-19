/**
 * Fix Permanent Agent Issue
 * Run this in the Obsidian console to diagnose and fix the permanent agent
 */

console.log('🔍 Diagnosing permanent agent issue...');

// Get the plugin
const plugin = app.plugins.plugins['mnemosyne'];
if (!plugin) {
    console.error('❌ Mnemosyne plugin not found');
} else {
    console.log('✅ Mnemosyne plugin found');
    
    // Step 1: Check settings
    console.log('\n📋 Checking settings...');
    const permanentAgent = plugin.settings.agents.find(a => a.id === 'mnemosyne-agent-permanent');
    if (permanentAgent) {
        console.log('✅ Permanent agent found in settings:', {
            name: permanentAgent.name,
            enabled: permanentAgent.enabled,
            isPermanent: permanentAgent.isPermanent,
            llmId: permanentAgent.llmId
        });
    } else {
        console.error('❌ Permanent agent NOT found in settings');
        console.log('Available agents:', plugin.settings.agents.map(a => ({ id: a.id, name: a.name })));
    }
    
    // Step 2: Check agent manager
    console.log('\n🤖 Checking agent manager...');
    if (plugin.agentManager) {
        const stats = plugin.agentManager.getStats();
        console.log('Agent Manager stats:', stats);
        
        const permanentAgentInManager = plugin.agentManager.getAgent('mnemosyne-agent-permanent');
        if (permanentAgentInManager) {
            console.log('✅ Permanent agent found in manager');
        } else {
            console.error('❌ Permanent agent NOT found in manager');
        }
    } else {
        console.error('❌ Agent Manager not available');
    }
    
    // Step 3: Check dependencies
    console.log('\n🔍 Checking dependencies...');
    if (plugin.retriever) {
        console.log('RAG System ready:', plugin.retriever.isReady());
        if (plugin.retriever.isReady()) {
            const ragStats = plugin.retriever.getStats();
            console.log('RAG Stats:', ragStats);
        }
    } else {
        console.error('❌ RAG Retriever not available');
    }
    
    if (plugin.llmManager) {
        console.log('LLM Manager ready:', plugin.llmManager.isReady());
        if (plugin.llmManager.isReady()) {
            const llmStats = plugin.llmManager.getStats();
            console.log('LLM Stats:', llmStats);
        }
    } else {
        console.error('❌ LLM Manager not available');
    }
    
    // Step 4: Try to fix the issue
    console.log('\n🔧 Attempting to fix...');
    
    if (plugin.agentManager && permanentAgent) {
        try {
            // Try to reinitialize the permanent agent
            const success = await plugin.agentManager.reinitializePermanentAgent();
            if (success) {
                console.log('✅ Permanent agent reinitialized successfully');
                
                // Test if it's now available
                const testAgent = plugin.agentManager.getAgent('mnemosyne-agent-permanent');
                if (testAgent) {
                    console.log('✅ Permanent agent is now available for testing');
                } else {
                    console.error('❌ Permanent agent still not available after reinitialization');
                }
            } else {
                console.error('❌ Failed to reinitialize permanent agent');
            }
        } catch (error) {
            console.error('❌ Error during reinitialization:', error);
        }
    }
    
    // Step 5: Final check
    console.log('\n🎯 Final status check...');
    if (plugin.agentManager) {
        const finalStats = plugin.agentManager.getStats();
        console.log('Final agent manager stats:', finalStats);
        
        const finalCheck = plugin.agentManager.getAgent('mnemosyne-agent-permanent');
        if (finalCheck) {
            console.log('✅ SUCCESS: Permanent agent is now available!');
        } else {
            console.error('❌ FAILED: Permanent agent still not available');
        }
    }
}

console.log('\n🏁 Diagnosis complete. Check the results above.');
